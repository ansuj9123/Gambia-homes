import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Listing submissions can include photos (resized in the browser to ~0.5 MB each).
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
