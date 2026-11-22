import type { NextConfig } from "next";

// Extra addresses allowed to use the dev server: your Wi-Fi address (DEV_ORIGINS in .env)
// and Cloudflare quick tunnels (npm run tunnel).
const devOrigins = [
  ...(process.env.DEV_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  "*.trycloudflare.com",
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Listing submissions can include photos (resized in the browser to ~0.5 MB each).
      bodySizeLimit: "25mb",
      allowedOrigins: devOrigins,
    },
  },
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
