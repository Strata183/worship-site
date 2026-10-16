type SignupInsertPayload = {
  type: string;
  table: string;
  schema: string;
  record: {
    id: string;
    email: string;
  };
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing function secret: ${name}`);
  return value;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const webhookSecret = requiredEnv("WORSHIP_NIGHT_WEBHOOK_SECRET");
  if (request.headers.get("Authorization") !== `Bearer ${webhookSecret}`) {
    return json({ error: "Unauthorized." }, 401);
  }

  let payload: SignupInsertPayload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "worship_night_email_signups" ||
    !payload.record?.id ||
    !payload.record?.email
  ) {
    return json({ error: "Unexpected signup webhook payload." }, 400);
  }

  const resendApiKey = requiredEnv("RESEND_API_KEY");
  const fromEmail = requiredEnv("WORSHIP_NIGHT_FROM_EMAIL");
  const pageUrl = Deno.env.get("WORSHIP_NIGHT_PAGE_URL")?.trim();

  const text = [
    "Thanks for subscribing to Worthy for Worship: Worship Night updates.",
    "",
    "Your signup is confirmed. The next gathering is November 23, 2026 at 6:00 PM.",
    "We’ll share any additional event details by email.",
    pageUrl ? `\nEvent page: ${pageUrl}` : "",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="background:#fbf4e9;color:#392820;font-family:Arial,sans-serif;line-height:1.6;margin:0;padding:32px 16px">
      <div style="background:#fffdf9;border:1px solid #e6d4bc;border-radius:12px;margin:0 auto;max-width:560px;padding:28px">
        <p style="color:#8c542f;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase">Worthy for Worship</p>
        <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:normal;margin:0 0 16px">You’re on the list!</h1>
        <p>Thanks for subscribing to updates for <strong>Worthy for Worship: Worship Night</strong>.</p>
        <p>Your signup is confirmed. The next gathering is <strong>November 23, 2026 at 6:00 PM</strong>. We’ll share any additional event details by email.</p>
        ${pageUrl ? `<p><a href="${pageUrl}" style="color:#68422e">Visit the Worship Night page</a></p>` : ""}
      </div>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `worship-night-signup/${payload.record.id}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [payload.record.email],
      subject: "You’re confirmed for Worship Night updates",
      html,
      text,
    }),
  });

  if (!resendResponse.ok) {
    const details = await resendResponse.text();
    console.error("Resend rejected Worship Night confirmation:", details);
    return json({ error: "Resend could not send the confirmation email." }, 502);
  }

  return json({ ok: true });
});
