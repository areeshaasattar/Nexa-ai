import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return ["/", "/terms", "/privacy", "/sign-in", "/sign-up"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}