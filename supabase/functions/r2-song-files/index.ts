import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.948.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.948.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function env(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

function getR2Endpoint() {
  const endpoint = env("R2_ENDPOINT");

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  return `https://${endpoint}.r2.cloudflarestorage.com`;
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("Missing user session.");
  }

  return token;
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const r2 = createR2Client();
    const bucket = env("R2_BUCKET");
    const token = getBearerToken(req);
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session." }, 401);
    }

    const contentType = req.headers.get("Content-Type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = String(formData.get("action") || "");

      if (action !== "upload") {
        return jsonResponse({ error: "Unsupported multipart action." }, 400);
      }

      const file = formData.get("file");
      const filePath = String(formData.get("filePath") || "");

      if (!(file instanceof File)) {
        return jsonResponse({ error: "Missing PDF file." }, 400);
      }

      if (file.type !== "application/pdf") {
        return jsonResponse({ error: "Only PDF files can be uploaded." }, 400);
      }

      if (!filePath.startsWith(`${user.id}/`) || !filePath.endsWith(".pdf")) {
        return jsonResponse({ error: "Invalid file path." }, 400);
      }

      await r2.send(
        new PutObjectCommand({
          Body: new Uint8Array(await file.arrayBuffer()),
          Bucket: bucket,
          ContentType: "application/pdf",
          Key: filePath,
        }),
      );

      return jsonResponse({ filePath });
    }

    const body = await req.json();

    if (body.action === "signed-url") {
      const songId = String(body.songId || "");

      const { data: song, error: songError } = await supabase
        .from("songs")
        .select("file_path")
        .eq("id", songId)
        .single();

      if (songError || !song) {
        return jsonResponse({ error: "Song not found or not shared with you." }, 404);
      }

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

    if (body.action === "delete") {
      const songId = String(body.songId || "");

      const { data: song, error: songError } = await supabase
        .from("songs")
        .select("file_path, owner_id")
        .eq("id", songId)
        .single();

      if (songError || !song) {
        return jsonResponse({ error: "Song not found." }, 404);
      }

      if (song.owner_id !== user.id) {
        return jsonResponse({ error: "Only the owner can delete this PDF." }, 403);
      }

      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: song.file_path,
        }),
      );

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      500,
    );
  }
});
