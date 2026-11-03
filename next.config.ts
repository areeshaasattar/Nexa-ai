import type { NextConfig } from "next";

/**
 * Extra origins the Next.js dev server may be reached from.
 *
 * Optional and comma-separated — hostnames only (no scheme), e.g.
 * `DEV_ALLOWED_ORIGINS=my-tunnel.example.com,localhost`.
 * Empty / whitespace-only entries are dropped, so an unset variable simply
 * yields an empty list.
 */
const allowedDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins,
};

export default nextConfig;