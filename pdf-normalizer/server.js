import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const port = Number(process.env.PORT || 8080);
const authToken = process.env.NORMALIZER_TOKEN || "";
const maxRequestBytes = Number(process.env.MAX_REQUEST_BYTES || 60 * 1024 * 1024);

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      bytes += Buffer.byteLength(chunk);

      if (bytes > maxRequestBytes) {
        reject(new Error("Request is too large."));
        req.destroy();
        return;
      }

      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `${command} failed: ${stderr || stdout || error.message}`.trim(),
          ),
        );
        return;
      }

      resolve();
    });
  });
}

function pdfName(index, suffix) {
  return `${String(index + 1).padStart(3, "0")}-${suffix}.pdf`;
}

async function normalizePdf(inputPath, outputPath) {
  await run("gs", [
    "-q",
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dSubsetFonts=true",
    `-sOutputFile=${outputPath}`,
    inputPath,
  ]);
}

async function mergePdfs(inputPaths, outputPath) {
  await run("gs", [
    "-q",
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-sOutputFile=${outputPath}`,
    ...inputPaths,
  ]);
}

async function handleMerge(req, res) {
  if (authToken) {
    const header = req.headers.authorization || "";

    if (header !== `Bearer ${authToken}`) {
      json(res, 401, { error: "Unauthorized PDF normalizer request." });
      return;
    }
  }

  const body = await readJson(req);
  const documents = Array.isArray(body.documents) ? body.documents : [];

  if (documents.length === 0) {
    json(res, 400, { error: "No PDFs were provided to merge." });
    return;
  }

  const workDir = path.join(tmpdir(), `pdf-normalizer-${randomUUID()}`);
  const normalizedPaths = [];
  const warnings = [];

  await mkdir(workDir, { recursive: true });

  try {
    for (const [index, document] of documents.entries()) {
      const title = document.title || `PDF ${index + 1}`;
      const inputPath = path.join(workDir, pdfName(index, "input"));
      const normalizedPath = path.join(workDir, pdfName(index, "normalized"));

      if (!document.data) {
        warnings.push(`"${title}" was empty and was skipped.`);
        continue;
      }

      await writeFile(inputPath, Buffer.from(document.data, "base64"));

      try {
        await normalizePdf(inputPath, normalizedPath);
        normalizedPaths.push(normalizedPath);
      } catch (error) {
        warnings.push(
          `"${title}" could not be normalized and was skipped: ${
            error instanceof Error ? error.message : "Unknown Ghostscript error."
          }`,
        );
      }
    }

    if (normalizedPaths.length === 0) {
      json(res, 400, {
        error: "None of the setlist PDFs could be normalized.",
        warnings,
      });
      return;
    }

    const outputPath = path.join(workDir, "merged.pdf");

    await mergePdfs(normalizedPaths, outputPath);

    const outputBytes = await readFile(outputPath);

    json(res, 200, {
      data: outputBytes.toString("base64"),
      fileName: body.fileName || "setlist.pdf",
      warnings,
    });
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/merge") {
    json(res, 404, { error: "Not found." });
    return;
  }

  try {
    await handleMerge(req, res);
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected normalizer error.",
    });
  }
}).listen(port, () => {
  console.log(`PDF normalizer listening on ${port}`);
});
