import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db";
import { siteUrl } from "./stripe";
import { whatsappLink } from "./format";

type Message = {
  channel: "EMAIL" | "WHATSAPP";
  kind: string;
  to: string;
  subject?: string;
  body: string;
  relatedId?: string;
};

let transporter: Transporter | null | undefined;
function mailer() {
  if (transporter !== undefined) return transporter;
  // Any SMTP provider works: Resend, SendGrid, Postmark, Mailgun, Google Workspace...
  // e.g. SMTP_URL="smtps://resend:API_KEY@smtp.resend.com:465"
  transporter = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
  return transporter;
}

/**
 * Sends one message and records it in the Notification table. Never throws, so a
 * delivery problem can't break the action that triggered it. With no provider
 * configured the message is only recorded (status LOGGED) and visible in admin.
 */
export async function send(msg: Message) {
  let status = "LOGGED";
  let error: string | undefined;
  try {
    if (msg.channel === "EMAIL" && mailer()) {
      await mailer()!.sendMail({
        from: process.env.EMAIL_FROM ?? "Gambia Homes <no-reply@localhost>",
        to: msg.to,
        subject: msg.subject,
        text: msg.body,
      });
      status = "SENT";
    }
    // WhatsApp: business-initiated messages need the WhatsApp Business Platform
    // and pre-approved templates. Until that's set up, messages are only logged.
  } catch (e) {
    status = "FAILED";
    error = (e as Error).message.slice(0, 500);
    console.error(`[notify] ${msg.channel} to ${msg.to} failed:`, error);
  }
  if (status === "LOGGED") console.log(`[notify] (not sent: no ${msg.channel.toLowerCase()} provider) ${msg.kind} to ${msg.to}`);
  try {
    await db.notification.create({ data: { ...msg, status, error } });
  } catch (e) {
    console.error("[notify] could not record notification", e);
  }
}

/** Tells the agent about a new enquiry and sends the buyer a receipt. */
export async function notifyNewEnquiry(enquiryId: string) {
  const e = await db.enquiry.findUnique({
    where: { id: enquiryId },
    include: { property: { include: { agent: { include: { user: { select: { email: true } } } } } } },
  });
  if (!e) return;
  const { property: p } = e;
  const agent = p.agent;
  const agentName = agent.agency ?? agent.name;
  const what = e.kind === "VIDEO_VIEWING" ? "a live video viewing" : "a message";
  const listingUrl = `${siteUrl()}/property/${p.slug}`;
  const leadsUrl = `${siteUrl()}/agent?tab=leads`;
  const contact = [e.email, e.phone, e.country && `lives in ${e.country}`].filter(Boolean).join(" · ");

  const agentEmail = agent.email ?? agent.user?.email;
  const jobs: Promise<void>[] = [];

  if (agentEmail) {
    jobs.push(
      send({
        channel: "EMAIL",
        kind: "NEW_LEAD",
        to: agentEmail,
        relatedId: e.id,
        subject: `New lead: ${p.title}`,
        body: [
          `Hello ${agent.name},`,
          ``,
          `${e.name} has requested ${what} about "${p.title}".`,
          `Contact: ${contact}`,
          ``,
          `Their message:`,
          e.message,
          ``,
          e.phone ? `Reply on WhatsApp: ${whatsappLink(e.phone, `Hello ${e.name}, thank you for your enquiry about "${p.title}".`)}` : `Reply by email: ${e.email}`,
          `All your leads: ${leadsUrl}`,
          ``,
          `Buyers who hear back within an hour are far more likely to view.`,
          `— Gambia Homes`,
        ].join("\n"),
      }),
    );
  }

  jobs.push(
    send({
      channel: "WHATSAPP",
      kind: "NEW_LEAD",
      to: agent.phone,
      relatedId: e.id,
      body: `Gambia Homes: new lead from ${e.name} for "${p.title}". ${e.phone ? `WhatsApp them on ${e.phone}` : `Email ${e.email}`}. See all leads: ${leadsUrl}`,
    }),
  );

  jobs.push(
    send({
      channel: "EMAIL",
      kind: "ENQUIRY_RECEIPT",
      to: e.email,
      relatedId: e.id,
      subject: `We've sent your enquiry: ${p.title}`,
      body: [
        `Hello ${e.name},`,
        ``,
        `We've sent your request for ${what} to ${agentName}. They'll reply by email${e.phone ? " or WhatsApp" : ""}.`,
        ``,
        `Property: ${p.title} (${p.area})`,
        listingUrl,
        ``,
        `Stay safe: never pay a deposit before a viewing and verification. Pay only through a lawyer's client account or our escrow partner.`,
        `Want certainty first? Order a verification report from the listing page.`,
        ``,
        `— Gambia Homes`,
      ].join("\n"),
    }),
  );

  await Promise.all(jobs);
}
