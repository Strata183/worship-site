import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.948.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.948.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { createClient } from "npm:@supabase/supabase-js@2";

// These headers allow the browser-based React app to call this function.
// OPTIONS requests are "preflight" checks browsers send before certain requests.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Read an environment variable from Supabase Edge Function secrets.
// Throwing here makes missing setup obvious instead of failing silently later.
function env(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

// Helper for returning JSON with the same CORS headers every time.
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

// Cloudflare R2 endpoints can be stored either as a full URL or just the account
// endpoint value. This helper supports both formats.
function getR2Endpoint() {
  const endpoint = env("R2_ENDPOINT");

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  return `https://${endpoint}.r2.cloudflarestorage.com`;
}

// Supabase sends the user's access token in the Authorization header when the
// frontend calls supabase.functions.invoke().
function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("Missing user session.");
  }

  return token;
}

// Create an S3-compatible client pointed at Cloudflare R2.
// R2 uses the S3 API, so AWS SDK commands work even though the files are stored
// at Cloudflare.
function createR2Client() {
  return new S3Client({
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
    endpoint: getR2Endpoint(),
    region: "auto",
  });
}

function safeZipName(name: string, index: number) {
  const cleanName =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "vbs-chart";

  return `${String(index + 1).padStart(2, "0")}-${cleanName}.pdf`;
}

function isAudioFile(file: File) {
  const audioExtensions = [".aac", ".aiff", ".m4a", ".mp3", ".ogg", ".wav", ".webm"];
  const lowerName = file.name.toLowerCase();

  return (
    file.type.startsWith("audio/") ||
    audioExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

function encodeCopySource(bucket: string, key: string) {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function safeDownloadName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "setlist"
  );
}

function assertPdfBytes(bytes: Uint8Array, label: string) {
  const isPdf =
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;

  if (isPdf) {
    return;
  }

  const preview = new TextDecoder()
    .decode(bytes.slice(0, 160))
    .replace(/\s+/g, " ")
    .trim();

  throw new Error(
    `${label} is not a valid PDF file. Received: ${preview || "empty file"}`,
  );
}

function wrapPdfText(text: string, maxCharacters = 84) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function addPlaceholderPage(
  pdf: PDFDocument,
  title: string,
  body: string,
  index: number,
) {
  const page = pdf.addPage([612, 792]);
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const margin = 72;
  let y = 700;

  page.drawText(title || "Blank page", {
    color: rgb(0.12, 0.16, 0.22),
    font: headingFont,
    size: 24,
    x: margin,
    y,
  });

  y -= 28;
  page.drawText(`Setlist page ${index + 1}`, {
    color: rgb(0.32, 0.38, 0.46),
    font: bodyFont,
    size: 11,
    x: margin,
    y,
  });

  y -= 38;

  for (const line of wrapPdfText(body || "")) {
    if (y < margin) {
      y = 700;
      page.drawText("(continued)", {
        color: rgb(0.32, 0.38, 0.46),
        font: bodyFont,
        size: 10,
        x: margin,
        y,
      });
      y -= 28;
    }

    page.drawText(line, {
      color: rgb(0.12, 0.16, 0.22),
      font: bodyFont,
      size: 13,
      x: margin,
      y,
    });
    y -= 20;
  }
}

async function getObjectBytes(r2: S3Client, bucket: string, key: string) {
  const object = await r2.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!object.Body) {
    throw new Error(`Missing file body for ${key}.`);
  }

  return new Uint8Array(await object.Body.transformToByteArray());
}

// Deno.serve starts the Edge Function HTTP server.
// Every request to this function runs through this callback.
Deno.serve(async (req) => {
  // Browser preflight request. Respond quickly so the real request can continue.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // This function only expects POST requests.
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    // Set up storage, database/auth, and the signed-in user.
    const r2 = createR2Client();
    const bucket = env("R2_BUCKET");
    const token = getBearerToken(req);

    // This Supabase client runs on behalf of the signed-in user because it uses
    // their Authorization token. That means Row Level Security still applies.
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token really belongs to a valid Supabase user.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session." }, 401);
    }

    const contentType = req.headers.get("Content-Type") || "";

    // Uploads arrive as multipart/form-data because they include a File object.
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = String(formData.get("action") || "");

      if (action !== "upload") {
        return jsonResponse({ error: "Unsupported multipart action." }, 400);
      }

      const file = formData.get("file");
      const filePath = String(formData.get("filePath") || "");

      // Make sure the frontend actually sent a file.
      if (!(file instanceof File)) {
        return jsonResponse({ error: "Missing file." }, 400);
      }

      // Only allow PDFs and audio files in this storage path.
      if (file.type !== "application/pdf" && !isAudioFile(file)) {
        return jsonResponse(
          { error: "Only PDF or audio files can be uploaded." },
          400,
        );
      }

      // Important security check: users may only upload into their own folder.
      if (!filePath.startsWith(`${user.id}/`)) {
        return jsonResponse({ error: "Invalid file path." }, 400);
      }

      // Convert the browser File into bytes and upload it to R2.
      await r2.send(
        new PutObjectCommand({
          Body: new Uint8Array(await file.arrayBuffer()),
          Bucket: bucket,
          ContentType: file.type || "application/octet-stream",
          Key: filePath,
        }),
      );

      return jsonResponse({ filePath });
    }

    // Non-file actions are JSON requests, such as signed-url and delete.
    const body = await req.json();

    if (body.action === "signed-url") {
      const songId = String(body.songId || "");

      // Load the song through Supabase. RLS should decide whether this user can
      // read this row, so the function does not hand out URLs for unauthorized rows.
      const { data: song, error: songError } = await supabase
        .from("songs")
        .select("file_path")
        .eq("id", songId)
        .single();

      if (songError || !song) {
        return jsonResponse({ error: "Song not found or not shared with you." }, 404);
      }

      // A signed URL is temporary access to a private R2 object.
      // The URL expires after 60 seconds.
      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: bucket,
          Key: song.file_path,
        }),
        { expiresIn: 60 },
      );

      return jsonResponse({ signedUrl });
    }

    if (body.action === "vbs-kinder-signed-url") {
      const chartId = String(body.chartId || "");

      // RLS on vbs_kinder_charts only exposes rows to users who have claimed
      // VBS Kinder access with the team password.
      const { data: chart, error: chartError } = await supabase
        .from("vbs_kinder_charts")
        .select("file_path")
        .eq("id", chartId)
        .single();

      if (chartError || !chart) {
        return jsonResponse({ error: "Chart not found or not shared with you." }, 404);
      }

      // A signed URL is temporary access to a private R2 object.
      // The URL expires after 60 seconds.
      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: bucket,
          Key: chart.file_path,
        }),
        { expiresIn: 60 },
      );

      return jsonResponse({ signedUrl });
    }

    if (body.action === "masters-bible-study-signed-url") {
      const weekDate = String(body.weekDate || "");

      // RLS on masters_bible_study_song_sheets only exposes rows to users who
      // have unlocked or been approved for Master's Bible Study.
      const { data: songSheet, error: songSheetError } = await supabase
        .from("masters_bible_study_song_sheets")
        .select("file_path")
        .eq("week_date", weekDate)
        .single();

      if (songSheetError || !songSheet) {
        return jsonResponse(
          { error: "Song sheet not found or not shared with you." },
          404,
        );
      }

      // A signed URL is temporary access to a private R2 object.
      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: bucket,
          Key: songSheet.file_path,
        }),
        { expiresIn: 300 },
      );

      return jsonResponse({ signedUrl });
    }

    if (body.action === "steadfast-audio-signed-url") {
      const recordingId = String(body.recordingId || "");

      // RLS on steadfast_audio_recordings only exposes rows to users who have
      // unlocked or been approved for Steadfast.
      const { data: recording, error: recordingError } = await supabase
        .from("steadfast_audio_recordings")
        .select("file_path")
        .eq("id", recordingId)
        .single();

      if (recordingError || !recording) {
        return jsonResponse(
          { error: "Recording not found or not shared with you." },
          404,
        );
      }

      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: bucket,
          Key: recording.file_path,
        }),
        { expiresIn: 300 },
      );

      return jsonResponse({ signedUrl });
    }

    if (body.action === "song-resource-audio-signed-url") {
      const resourceId = String(body.resourceId || "");

      // RLS on song_resources only exposes resources attached to songs this
      // user can already see.
      const { data: resource, error: resourceError } = await supabase
        .from("song_resources")
        .select("file_path, resource_type")
        .eq("id", resourceId)
        .single();

      if (resourceError || !resource || resource.resource_type !== "audio") {
        return jsonResponse(
          { error: "Audio resource not found or not shared with you." },
          404,
        );
      }

      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: bucket,
          Key: resource.file_path,
        }),
        { expiresIn: 300 },
      );

      return jsonResponse({ signedUrl });
    }

    if (body.action === "combined-setlist-pdf") {
      const setlistId = String(body.setlistId || "");

      const { data: setlist, error: setlistError } = await supabase
        .from("setlists")
        .select("id, title, event_date, owner_id")
        .eq("id", setlistId)
        .single();

      if (setlistError || !setlist) {
        return jsonResponse({ error: "Setlist not found." }, 404);
      }

      if (setlist.owner_id !== user.id) {
        return jsonResponse(
          { error: "Only the setlist owner can combine this PDF." },
          403,
        );
      }

      const { data: items, error: itemsError } = await supabase
        .from("setlist_items")
        .select(
          "id, item_type, title, body, position, song:songs(title, file_path, owner_id)",
        )
        .eq("setlist_id", setlistId)
        .order("position", { ascending: true });

      if (itemsError) {
        return jsonResponse({ error: itemsError.message }, 400);
      }

      const orderedItems = items || [];

      if (orderedItems.length === 0) {
        return jsonResponse({ error: "Add songs before combining the setlist." }, 400);
      }

      const combinedPdf = await PDFDocument.create();

      for (const [index, item] of orderedItems.entries()) {
        if (item.item_type === "placeholder") {
          await addPlaceholderPage(
            combinedPdf,
            item.title || "Blank page",
            item.body || "",
            index,
          );
          continue;
        }

        const song = Array.isArray(item.song) ? item.song[0] : item.song;

        if (!song?.file_path) {
          await addPlaceholderPage(
            combinedPdf,
            item.title || "Missing song",
            "This song PDF could not be found.",
            index,
          );
          continue;
        }

        if (song.owner_id !== user.id) {
          return jsonResponse(
            { error: "Setlists can only combine songs from your library." },
            403,
          );
        }

        const songTitle = song.title || "A setlist song";

        try {
          const sourceBytes = await getObjectBytes(r2, bucket, song.file_path);
          assertPdfBytes(sourceBytes, songTitle);
          const sourcePdf = await PDFDocument.load(sourceBytes, {
            ignoreEncryption: true,
          });
          const copiedPages = await combinedPdf.copyPages(
            sourcePdf,
            sourcePdf.getPageIndices(),
          );

          for (const page of copiedPages) {
            combinedPdf.addPage(page);
          }
        } catch (error) {
          return jsonResponse(
            {
              error: `Could not merge "${songTitle}". This PDF may be corrupted, encrypted, or exported in a format pdf-lib cannot parse. Details: ${
                error instanceof Error ? error.message : "Unknown PDF error."
              }`,
            },
            400,
          );
        }
      }

      let mergedBytes: Uint8Array;

      try {
        // Avoid object-stream compression here. Some Edge runtimes can throw a
        // signed/unsigned integer range error while compressing larger merged PDFs.
        mergedBytes = await combinedPdf.save({ useObjectStreams: false });
      } catch (error) {
        return jsonResponse(
          {
            error: `The setlist PDFs were read, but the final merged PDF could not be saved. Details: ${
              error instanceof Error ? error.message : "Unknown PDF save error."
            }`,
          },
          400,
        );
      }

      const fileName = `${safeDownloadName(setlist.title)}.pdf`;

      return jsonResponse({
        data: bytesToBase64(mergedBytes),
        fileName,
      });
    }

    if (body.action === "delete-song-resource-file") {
      const resourceId = String(body.resourceId || "");

      // The frontend deletes the database row after this. This action only
      // removes the private R2 file, and only for resources owned by the user.
      const { data: resource, error: resourceError } = await supabase
        .from("song_resources")
        .select("file_path, owner_id, resource_type")
        .eq("id", resourceId)
        .single();

      if (resourceError || !resource) {
        return jsonResponse({ error: "Resource not found." }, 404);
      }

      if (resource.owner_id !== user.id) {
        return jsonResponse(
          { error: "Only the owner can delete this resource." },
          403,
        );
      }

      if (resource.resource_type === "audio" && resource.file_path) {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: resource.file_path,
          }),
        );
      }

      return jsonResponse({ ok: true });
    }

    if (body.action === "vbs-kinder-files") {
      // RLS only returns chart rows when the signed-in user has claimed VBS
      // Kinder access with the team password.
      const { data: charts, error: chartsError } = await supabase
        .from("vbs_kinder_charts")
        .select("title, file_path, sort_order")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (chartsError) {
        return jsonResponse({ error: chartsError.message }, 403);
      }

      if (!charts?.length) {
        return jsonResponse({ error: "No VBS charts are available." }, 404);
      }

      const files = await Promise.all(
        charts.map(async (chart, index) => ({
          data: bytesToBase64(await getObjectBytes(r2, bucket, chart.file_path)),
          name: safeZipName(chart.title, index),
        })),
      );

      return jsonResponse({ files });
    }

    if (body.action === "delete") {
      const songId = String(body.songId || "");

      // For deletion, load both the path and owner id.
      const { data: song, error: songError } = await supabase
        .from("songs")
        .select("file_path, owner_id")
        .eq("id", songId)
        .single();

      if (songError || !song) {
        return jsonResponse({ error: "Song not found." }, 404);
      }

      // Only the owner can delete the actual PDF file.
      if (song.owner_id !== user.id) {
        return jsonResponse({ error: "Only the owner can delete this PDF." }, 403);
      }

      // Remove the file from R2. The frontend deletes the database row after this.
      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: song.file_path,
        }),
      );

      return jsonResponse({ ok: true });
    }

    if (body.action === "copy-song-file") {
      const songId = String(body.songId || "");
      const targetFilePath = String(body.targetFilePath || "");

      if (!targetFilePath.startsWith(`${user.id}/`) || !targetFilePath.endsWith(".pdf")) {
        return jsonResponse({ error: "Invalid target file path." }, 400);
      }

      // RLS decides whether this user can read the source song. This allows
      // copying an accepted friend's visible song without exposing R2 credentials.
      const { data: song, error: songError } = await supabase
        .from("songs")
        .select("file_path")
        .eq("id", songId)
        .single();

      if (songError || !song) {
        return jsonResponse({ error: "Song not found or not shared with you." }, 404);
      }

      await r2.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeCopySource(bucket, song.file_path),
          Key: targetFilePath,
          MetadataDirective: "COPY",
        }),
      );

      return jsonResponse({ filePath: targetFilePath });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    // Convert unexpected thrown errors into JSON so the frontend can display them.
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      500,
    );
  }
});
