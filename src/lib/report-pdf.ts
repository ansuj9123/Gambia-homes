import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "./db";
import { readStoredFile } from "./storage";
import { OUTCOMES, REGISTRY_OUTCOMES, parseGps } from "./verification";
import { TENURES, TYPES, VERIFICATION_PRODUCTS, labelFor } from "./constants";
import { formatMoney, rentSuffix } from "./format";

const A4 = { w: 595.28, h: 841.89 };
const M = 48; // margin
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.53);
const RULE = rgb(0.85, 0.87, 0.9);
const BRAND = rgb(0.12, 0.48, 0.23);
const TONE = { good: rgb(0.09, 0.5, 0.25), bad: rgb(0.72, 0.11, 0.11), warn: rgb(0.7, 0.42, 0.02) };

// Standard PDF fonts only cover Western European characters; replace anything else.
const safe = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•€]/g, "?");

const date = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—");

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, private font: PDFFont, private bold: PDFFont, private footer: string) {
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - M;
    this.page.drawText(safe(this.footer), { x: M, y: 24, size: 8, font: this.font, color: MUTED });
  }

  ensure(height: number) {
    if (this.y - height < M) this.newPage();
  }

  wrap(text: string, size: number, font: PDFFont, width: number) {
    const lines: string[] = [];
    for (const para of safe(text).split(/\n/)) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > width && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
    }
    return lines;
  }

  text(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const x = M + (opts.indent ?? 0);
    for (const line of this.wrap(text, size, font, A4.w - M - x)) {
      this.ensure(size * 1.4);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= size * 1.4;
    }
    this.y -= opts.gap ?? 4;
  }

  heading(text: string) {
    this.ensure(40);
    this.y -= 10;
    this.page.drawText(safe(text), { x: M, y: this.y - 13, size: 13, font: this.bold, color: INK });
    this.y -= 20;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.6, color: RULE });
    this.y -= 8;
  }

  row(label: string, value: string) {
    const lines = this.wrap(value || "—", 10, this.font, A4.w - M * 2 - 150);
    this.ensure(lines.length * 14 + 2);
    this.page.drawText(safe(label), { x: M, y: this.y - 10, size: 9, font: this.bold, color: MUTED });
    lines.forEach((l, i) => this.page.drawText(l, { x: M + 150, y: this.y - 10 - i * 14, size: 10, font: this.font, color: INK }));
    this.y -= lines.length * 14 + 4;
  }

  banner(text: string, color: ReturnType<typeof rgb>) {
    this.ensure(44);
    this.page.drawRectangle({ x: M, y: this.y - 34, width: A4.w - M * 2, height: 34, color, opacity: 0.12, borderColor: color, borderWidth: 1 });
    this.page.drawText(safe(text), { x: M + 12, y: this.y - 22, size: 13, font: this.bold, color });
    this.y -= 46;
  }

  async photos(images: Buffer[]) {
    const cols = 2;
    const gap = 10;
    const w = (A4.w - M * 2 - gap) / cols;
    const h = w * 0.66;
    for (let i = 0; i < images.length; i += cols) {
      this.ensure(h + gap);
      for (let c = 0; c < cols && i + c < images.length; c++) {
        const jpg = await this.doc.embedJpg(images[i + c]);
        this.page.drawImage(jpg, { x: M + c * (w + gap), y: this.y - h, width: w, height: h });
      }
      this.y -= h + gap;
    }
  }
}

/** Builds the buyer's PDF report for a verification order. */
export async function buildReportPdf(orderId: string) {
  const o = await db.verificationOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      property: { include: { agent: true } },
      fieldAgent: { select: { name: true } },
      lawyer: { select: { name: true } },
      surveyor: { select: { name: true } },
      evidence: { where: { kind: "PHOTO" }, orderBy: { createdAt: "asc" }, take: 8 },
    },
  });
  const p = o.property;
  const ref = `GH-${o.id.slice(-8).toUpperCase()}`;
  const product = VERIFICATION_PRODUCTS.find((x) => x.value === o.level);
  const outcome = OUTCOMES.find((x) => x.value === o.outcome);

  const doc = await PDFDocument.create();
  doc.setTitle(`Verification report ${ref}`);
  doc.setAuthor("Gambia Homes");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold, `Gambia Homes verification report ${ref} · issued ${date(new Date())} · prepared for ${o.name}`);

  w.text("GAMBIA HOMES", { size: 10, bold: true, color: BRAND, gap: 2 });
  w.text("Property verification report", { size: 22, bold: true, gap: 6 });
  w.text(`${product?.label ?? "Verification report"} · Reference ${ref} · Issued ${date(new Date())}`, { color: MUTED, gap: 14 });

  if (outcome) w.banner(outcome.label, TONE[outcome.tone]);
  if (o.summary) w.text(o.summary, { size: 11, gap: 8 });

  w.heading("Property");
  w.row("Listing", p.title);
  w.row("Location", `${p.area}, ${p.region} (listed point ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})`);
  w.row("Type", labelFor(TYPES, p.type));
  if (p.plotSqm) w.row("Plot / floor size", `${p.plotSqm.toLocaleString("en-GB")} sqm (as listed)`);
  if (p.tenure) w.row("Tenure (as listed)", labelFor(TENURES, p.tenure));
  w.row("Listed price", `${formatMoney(p.priceGmd, "GMD")}${rentSuffix(p.rentPeriod)}`);
  w.row("Listed by", `${p.agent.agency ?? p.agent.name}${p.agent.verified ? " (ID verified)" : " (ID not verified)"}`);
  w.row("Prepared for", `${o.name} (${o.email})`);

  w.heading("Checks carried out");
  w.text("1. Registry search", { bold: true, gap: 2 });
  if (o.registrySearchedAt) {
    w.row("Result", labelFor(REGISTRY_OUTCOMES, o.registryOutcome));
    w.row("Searched", `${date(o.registrySearchedAt)}${o.lawyer?.name ? ` by ${o.lawyer.name}` : ""}`);
    if (o.registryFindings) w.row("Findings", o.registryFindings);
  } else w.text("Not carried out.", { color: MUTED, indent: 0 });

  w.text("2. Site visit", { bold: true, gap: 2 });
  if (o.siteVisitedAt) {
    w.row("Visited", `${date(o.siteVisitedAt)}${o.fieldAgent?.name ? ` by ${o.fieldAgent.name}` : ""}`);
    if (o.siteNotes) w.row("Observations", o.siteNotes);
  } else w.text(o.level === "FULL" ? "Not carried out." : "Not included in the basic report.", { color: MUTED });

  w.text("3. GPS boundary survey", { bold: true, gap: 2 });
  const gps = parseGps(o.gpsPoints);
  if (o.surveyedAt || gps.length) {
    if (o.surveyedAt) w.row("Surveyed", `${date(o.surveyedAt)}${o.surveyor?.name ? ` by ${o.surveyor.name}` : ""}`);
    if (o.surveyNotes) w.row("Notes", o.surveyNotes);
    gps.forEach((pt, i) => w.row(`Point ${i + 1}`, `${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}${pt.label ? ` (${pt.label})` : ""}`));
  } else w.text(o.level === "FULL" ? "Not carried out." : "Not included in the basic report.", { color: MUTED });

  const images: Buffer[] = [];
  for (const e of o.evidence) {
    const data = await readStoredFile(e.key);
    if (data) images.push(await sharp(data).resize({ width: 900, height: 600, fit: "cover" }).jpeg({ quality: 70 }).toBuffer());
  }
  if (images.length) {
    w.ensure(260); // keep the heading on the same page as the first row of photos
    w.heading("Site photos");
    await w.photos(images);
  }

  w.heading("What this report does and doesn't cover");
  w.text(
    "This report records the checks listed above, carried out on the dates shown, and what they found. It is not a guarantee of title and does not replace your own lawyer's advice before you buy. Land records in The Gambia can be incomplete, and customary land rights may not appear in registry records. Pay only through a lawyer's client account or an escrow service, and only after the transfer documents are confirmed.",
    { color: MUTED, size: 9 },
  );
  w.text(`Questions about this report? Quote reference ${ref}.`, { color: MUTED, size: 9 });

  return { pdf: Buffer.from(await doc.save()), ref };
}
