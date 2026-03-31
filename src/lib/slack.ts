export async function notifySlack(message: string) {
  const token = process.env.AICOMPANY_SLACK_BOT_TOKEN;
  const channel = "#ai-paperclipweb";

  if (!token) {
    console.warn("[Slack] AICOMPANY_SLACK_BOT_TOKEN not set, skipping notification");
    return;
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error("[Slack] Failed to send message:", res.status);
    }
  } catch (error) {
    console.error("[Slack] Error sending message:", error);
  }
}
