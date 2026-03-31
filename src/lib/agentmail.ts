const AGENTMAIL_API_URL = "https://api.agentmail.to/v0";

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  bodyType?: "text" | "html";
}

export async function sendEmail({ to, subject, body, bodyType = "html" }: SendEmailParams) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const fromAddress = process.env.AGENTMAIL_FROM_ADDRESS || "paperclipweb@agentmail.to";

  if (!apiKey) {
    console.warn("[AgentMail] AGENTMAIL_API_KEY not set, skipping email send");
    return null;
  }

  const response = await fetch(`${AGENTMAIL_API_URL}/inboxes/${encodeURIComponent(fromAddress)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: [{ email: to }],
      subject,
      [bodyType === "html" ? "html_body" : "text_body"]: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[AgentMail] Send failed:", response.status, text);
    throw new Error(`AgentMail send failed: ${response.status}`);
  }

  return response.json();
}

export async function sendMagicLinkEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Sign in to paperclipweb",
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Sign in to paperclipweb</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to sign in to your account. This link expires in 24 hours.
        </p>
        <a href="${url}" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Sign in to paperclipweb
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; line-height: 1.6;">
          If you did not request this email, you can safely ignore it.
          <br />This link will expire in 24 hours.
        </p>
      </div>
    `,
  });
}

export async function sendCreditLowEmail(to: string, creditsRemaining: number, creditsLimit: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://paperclipweb.app";
  const percent = Math.round((creditsRemaining / creditsLimit) * 100);

  return sendEmail({
    to,
    subject: `[paperclipweb] Credits running low (${percent}% remaining)`,
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Your credits are running low</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          You have <strong>${creditsRemaining} of ${creditsLimit}</strong> credits remaining this month (${percent}%).
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Top up your credits or upgrade your plan to keep your agents running smoothly.
        </p>
        <a href="${appUrl}/dashboard/billing" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Top Up Credits
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          You can manage your subscription at ${appUrl}/dashboard/billing
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name?: string) {
  return sendEmail({
    to,
    subject: "Welcome to paperclipweb!",
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Welcome to paperclipweb${name ? `, ${name}` : ""}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          You now have <strong>100 free agent action credits</strong> to get started.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Create your first Paperclip instance and start running AI agents in under 60 seconds.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://paperclipweb.app"}/dashboard" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Go to Dashboard
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          One bill. One click. Your AI company.
        </p>
      </div>
    `,
  });
}
