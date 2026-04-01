interface OnboardingData {
  idea: string;
  target: string;
  valueProp: string;
  competitors: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://paperclipweb.app";

function pricingLink(day: number) {
  return `${appUrl}/pricing?utm_source=email&utm_campaign=drip_d${day}`;
}

function wrap(content: string) {
  return `
    <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
      ${content}
      <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
        paperclipweb -- One bill. One click. Your AI company.
      </p>
    </div>
  `;
}

function ctaButton(text: string, url: string) {
  return `<a href="${url}" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">${text}</a>`;
}

export function getDripEmail(day: number, data: OnboardingData) {
  const ideaSummary = data.idea.length > 40 ? data.idea.slice(0, 40) + "..." : data.idea;

  switch (day) {
    case 0:
      return {
        subject: `Your AI company "${ideaSummary}" is being set up`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Your AI company is being set up</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Your AI company for <strong>"${data.idea}"</strong> has been configured.
            The CEO agent has started working.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">Currently in progress:</p>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li>Market research started</li>
            ${data.competitors ? `<li>Analyzing competitor: ${data.competitors}</li>` : "<li>Competitor landscape scan</li>"}
            <li>Target customer research: ${data.target}</li>
          </ul>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            We'll send you the first results tomorrow.
          </p>
          ${ctaButton("Upgrade & See Results Now", pricingLink(0))}
        `),
      };

    case 1:
      return {
        subject: `Market research for "${ideaSummary}" is complete`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Market Research Complete</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            The CEO agent finished researching the <strong>${data.target}</strong> market.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">Findings (preview):</p>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li>Market size: <span style="filter: blur(4px);">$2.4B addressable</span></li>
            <li>3 competitor weaknesses discovered</li>
            <li>Target customer pain points identified</li>
          </ul>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Upgrade your plan to see the full report.
          </p>
          ${ctaButton("See Full Report", pricingLink(1))}
        `),
      };

    case 2:
      return {
        subject: `First lead found for "${ideaSummary}"`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">First Lead Discovered</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            The outbound agent found potential customers matching <strong>${data.target}</strong>.
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              <strong>Lead:</strong> <span style="filter: blur(4px);">TechCorp Industries</span><br/>
              <strong>Industry:</strong> <span style="filter: blur(4px);">SaaS / B2B</span><br/>
              <strong>Channel:</strong> <span style="filter: blur(4px);">Email outreach ready</span>
            </p>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Upgrade to see the lead details and send automated outreach.
          </p>
          ${ctaButton("View Lead & Send Message", pricingLink(2))}
        `),
      };

    case 3:
      return {
        subject: `3-day report for "${ideaSummary}"`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">3-Day Work Report</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Here's what your AI company accomplished in 3 days:
          </p>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li style="color: #10B981;">&#10003; Market research complete -- <span style="filter: blur(4px);">12 competitors</span> analyzed</li>
            <li style="color: #10B981;">&#10003; <span style="filter: blur(4px);">8</span> potential leads discovered</li>
            <li style="color: #10B981;">&#10003; <span style="filter: blur(4px);">3</span> outreach messages prepared</li>
            <li style="color: #10B981;">&#10003; Product spec draft ready</li>
          </ul>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Upgrade now to access all results and keep the momentum going.
          </p>
          ${ctaButton("See Full Report & Activate", pricingLink(3))}
        `),
      };

    default:
      return null;
  }
}
