import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.948.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.948.0";
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
        return jsonResponse({ error: "Missing PDF file." }, 400);
      }

      // Only allow PDFs in this storage path.
      if (file.type !== "application/pdf") {
        return jsonResponse({ error: "Only PDF files can be uploaded." }, 400);
      }

      // Important security check: users may only upload into their own folder.
      if (!filePath.startsWith(`${user.id}/`) || !filePath.endsWith(".pdf")) {
        return jsonResponse({ error: "Invalid file path." }, 400);
      }

      // Convert the browser File into bytes and upload it to R2.
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

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    // Convert unexpected thrown errors into JSON so the frontend can display them.
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      500,
    );
  }
});
