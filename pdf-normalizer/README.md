# PDF Normalizer

This small service is the stronger setlist PDF fix.

Supabase Edge Functions cannot run Ghostscript, so this service runs in a
container. It receives the setlist PDFs from the Edge Function, normalizes each
PDF with Ghostscript, merges them, and returns one combined PDF.

## Deploy

Deploy this folder to a container host such as Render, Fly.io, Railway, or
Google Cloud Run.

The service exposes:

- `GET /health`
- `POST /merge`

Set this environment variable on the normalizer service:

```txt
NORMALIZER_TOKEN=make-a-long-random-secret
```

After it is deployed, set these Supabase Edge Function secrets:

```bash
npx supabase secrets set PDF_NORMALIZER_URL=https://your-normalizer-url/merge
npx supabase secrets set PDF_NORMALIZER_TOKEN=make-a-long-random-secret
npx supabase functions deploy r2-song-files
```

If `PDF_NORMALIZER_URL` is not set, `r2-song-files` falls back to the lighter
`pdf-lib` merge.
