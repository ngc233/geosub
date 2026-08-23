type ContactTicketNotification = {
  ticketId: string;
  category: string;
  createdAt: string;
  adminUrl: string;
};

function getWebhookUrl() {
  const raw = process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_URL?.trim();
  if (!raw) return null;

  const allowedHosts = new Set(
    (process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

export function isContactTicketNotificationConfigured() {
  return getWebhookUrl() !== null;
}

export async function notifyNewContactTicket(notification: ContactTicketNotification) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return { status: "disabled" as const };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "contact_ticket.created",
        ticket: notification,
      }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    return { status: response.ok ? "sent" as const : "failed" as const };
  } catch {
    return { status: "failed" as const };
  }
}
