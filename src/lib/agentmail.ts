const AGENTMAIL_API_URL = "https://api.agentmail.to/v0";

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  bodyType?: "text" | "html";
}

export async function sendEmail({ to, subject, body, bodyType = "html" }: SendEmailParams) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  // 우선순위: AGENTMAIL_FROM_INBOX (vault 키 이름) → AGENTMAIL_FROM_ADDRESS (옛 vercel env 이름) → hello@usepaperclip.app (default).
  const fromAddress =
    process.env.AGENTMAIL_FROM_INBOX ||
    process.env.AGENTMAIL_FROM_ADDRESS ||
    "hello@usepaperclip.app";

  if (!apiKey) {
    console.warn("[AgentMail] AGENTMAIL_API_KEY not set, skipping email send");
    return null;
  }

  const response = await fetch(`${AGENTMAIL_API_URL}/inboxes/${encodeURIComponent(fromAddress)}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: [to],
      subject,
      [bodyType === "html" ? "html" : "text"]: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[AgentMail] Send failed (from=${fromAddress} to=${to}): ${response.status} ${text}`,
    );
    throw new Error(
      `AgentMail send failed: ${response.status} (from=${fromAddress})`,
    );
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

export async function sendCompanyReadyEmail(to: string, inviteUrl: string, companyName?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";
  const name = companyName ?? "your AI company";
  return sendEmail({
    to,
    subject: `[Paperclip] ${name} is ready — here are your keys`,
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">${name} is live</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Your paperclip instance has been provisioned and your team is ready to work.
          Click below to enter your company.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Open ${name}
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          Manage your account at ${appUrl}/account
        </p>
      </div>
    `,
  });
}

export async function sendCreditLowEmail(to: string, dollarsRemaining: number, _dollarsLimit: number, _threshold?: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";
  const remaining = typeof dollarsRemaining === "number" ? dollarsRemaining.toFixed(2) : "0.00";

  return sendEmail({
    to,
    subject: `[Paperclip] $${remaining} remaining — top up to keep going`,
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Your LLM balance is running low</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          You have <strong>$${remaining} remaining</strong> in your LLM credit balance.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Top up $10 to keep your AI company running — applied instantly.
        </p>
        <a href="${appUrl}/account" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Top Up — $10
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          Manage your account at ${appUrl}/account
        </p>
      </div>
    `,
  });
}

export async function sendSubscriptionCancelledEmail(to: string, name?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";
  const firstName = (name ?? "there").split(" ")[0];

  return sendEmail({
    to,
    subject: "[Paperclip] Your subscription has been cancelled",
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Your Paperclip subscription has been cancelled</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          Hi ${firstName} — your Pro subscription has ended and your instance has been stopped.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          <strong>Your data is safe.</strong> We keep everything for 30 days — your companies, employees, and task history are all still there.
          If you change your mind, resubscribe any time to pick up exactly where you left off.
        </p>
        <a href="${appUrl}/cases" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Resubscribe — $29/month
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          Questions? Reply to this email or visit ${appUrl}
        </p>
      </div>
    `,
  });
}

export async function sendMonthlySummaryEmail(to: string, stats: {
  name?: string;
  dollarsSpent?: number;
  dollarsBalance?: number;
  tasksCompleted: number;
  companies: string[];
  month: string;
  // Legacy fields kept for backward compat
  actionsUsed?: number;
  actionsLimit?: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";
  const firstName = (stats.name ?? "there").split(" ")[0];
  const companyList = stats.companies.length > 0
    ? stats.companies.map(c => `<li style="color:#475569;font-size:14px;">${c}</li>`).join("")
    : `<li style="color:#475569;font-size:14px;">No active companies this month</li>`;
  const spent = (stats.dollarsSpent ?? 0).toFixed(2);
  const balance = (stats.dollarsBalance ?? 0).toFixed(2);

  return sendEmail({
    to,
    subject: `[Paperclip] Your ${stats.month} summary — $${spent} used`,
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 8px;">Your ${stats.month} summary</h2>
        <p style="color: #475569; font-size: 14px; margin-bottom: 24px;">Hi ${firstName} — here's what your AI team did this month.</p>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #64748B; font-size: 13px;">LLM spend</span>
            <span style="color: #0F172A; font-size: 13px; font-weight: 600;">$${spent}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #64748B; font-size: 13px;">Remaining balance</span>
            <span style="color: #0F172A; font-size: 13px; font-weight: 600;">$${balance}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B; font-size: 13px;">Tasks completed</span>
            <span style="color: #0F172A; font-size: 13px; font-weight: 600;">${stats.tasksCompleted}</span>
          </div>
        </div>

        <p style="color: #0F172A; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Active companies</p>
        <ul style="margin: 0 0 24px; padding-left: 20px;">
          ${companyList}
        </ul>

        <a href="${appUrl}/account" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Go to account
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          Monthly summaries are sent on the 1st of each month.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";
  return sendEmail({
    to,
    subject: "Welcome to paperclip",
    body: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
        <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Welcome to paperclip${name ? `, ${name}` : ""}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          Pick a proven AI company template, pay $29, and your company is live — with <strong>$9 LLM credit</strong> included to run your first tasks.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          One bill. Zero installs. Your AI company is ready before you open the door.
        </p>
        <a href="${appUrl}" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Choose a company template
        </a>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px;">
          One bill. One click. Your AI company.
        </p>
      </div>
    `,
  });
}
