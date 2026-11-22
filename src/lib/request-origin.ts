import { headers } from "next/headers";
import { siteUrl } from "./stripe";

const isPrivateHostname = (h: string) =>
  h === "localhost" ||
  h === "127.0.0.1" ||
  h === "[::1]" ||
  /^10\.\d+\.\d+\.\d+$/.test(h) ||
  /^192\.168\.\d+\.\d+$/.test(h) ||
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h);

async function incoming() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  // Requests arriving through Cloudflare (e.g. `npm run tunnel`) carry these headers.
  const viaProxy = Boolean(h.get("cf-ray") || h.get("cf-connecting-ip"));
  return { host, hostname: host.replace(/:\d+$/, ""), proto, viaProxy };
}

/**
 * True only for requests from this computer or the local network, never for
 * requests through a public tunnel. Used to decide whether development helpers
 * (like showing sign-in codes on screen) are safe to show.
 */
export async function isLocalRequest() {
  const r = await incoming();
  return !r.viaProxy && isPrivateHostname(r.hostname);
}

/**
 * The address the visitor is using (localhost, Wi-Fi address or tunnel), for links
 * in emails and payment return pages. Unknown hosts fall back to NEXT_PUBLIC_SITE_URL,
 * so a forged Host header can't redirect people elsewhere.
 */
export async function requestOrigin() {
  try {
    const r = await incoming();
    const configured = new URL(siteUrl()).host;
    const trusted = r.host === configured || isPrivateHostname(r.hostname) || r.hostname.endsWith(".trycloudflare.com");
    if (trusted && /^https?$/.test(r.proto)) return `${r.proto}://${r.host}`;
  } catch {}
  return siteUrl();
}
