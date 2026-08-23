import assert from "node:assert/strict";
import test from "node:test";
import {
  isContactTicketNotificationConfigured,
  notifyNewContactTicket,
} from "./contact-ticket-notification.ts";

const originalUrl = process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_URL;
const originalHosts = process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS;

test.afterEach(() => {
  if (originalUrl === undefined) delete process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_URL;
  else process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_URL = originalUrl;
  if (originalHosts === undefined) delete process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS;
  else process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS = originalHosts;
});

test("contact notification stays disabled without an explicit HTTPS allowlist", async () => {
  process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_URL = "http://hooks.example.test/contact";
  process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS = "hooks.example.test";
  assert.equal(isContactTicketNotificationConfigured(), false);
  assert.deepEqual(await notifyNewContactTicket({
    ticketId: "ABC12345",
    category: "correction",
    createdAt: new Date(0).toISOString(),
    adminUrl: "https://geosub.org/admin/contact-tickets?status=new",
  }), { status: "disabled" });
});

test("contact notification requires the webhook host to be explicitly allowed", () => {
  process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_URL = "https://hooks.example.test/contact";
  process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS = "another.example.test";
  assert.equal(isContactTicketNotificationConfigured(), false);

  process.env.GEOSUB_CONTACT_TICKET_WEBHOOK_ALLOWED_HOSTS = "hooks.example.test";
  assert.equal(isContactTicketNotificationConfigured(), true);
});
