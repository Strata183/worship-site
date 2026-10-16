# Worship Night confirmation email

This Edge Function sends a confirmation receipt through Resend when a new row
is inserted into `public.worship_night_email_signups`. It is a receipt email,
not a click-to-confirm (double opt-in) flow.

## Required Supabase Function secrets

- `RESEND_API_KEY`: a Resend API key with permission to send email.
- `WORSHIP_NIGHT_FROM_EMAIL`: a sender address on a domain verified in Resend,
  for example `Worthy for Worship <worship@your-verified-domain.com>`.
- `WORSHIP_NIGHT_WEBHOOK_SECRET`: a long, random secret shared with the
  database webhook's `Authorization: Bearer ...` header.
- `WORSHIP_NIGHT_PAGE_URL`: optional public URL for the Worship Night page.

Set these under **Supabase Dashboard → Edge Functions → Secrets**.

## Deploy

From the repository root, link the Supabase CLI to the correct project if it
is not already linked, then deploy with platform JWT verification disabled;
the function validates the dedicated webhook secret itself:

```sh
supabase functions deploy worship-night-confirmation --no-verify-jwt
```

## Create the database webhook

In **Supabase Dashboard → Database → Webhooks**, create a webhook with:

- Table: `public.worship_night_email_signups`
- Event: `INSERT`
- Method: `POST`
- URL: `https://<project-ref>.supabase.co/functions/v1/worship-night-confirmation`
- Header: `Authorization: Bearer <the same WORSHIP_NIGHT_WEBHOOK_SECRET>`
- Header: `Content-Type: application/json`

Only new signups trigger the function; existing rows are not mailed.

## Email behavior

The message confirms that the address was added to the Worship Night updates
list and includes the current event date and time. Change those details in
`index.ts` when the event information changes. Resend's idempotency key uses
the signup row ID to avoid sending duplicates when the same webhook retries.
