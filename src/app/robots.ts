import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms", "/privacy", "/sign-in", "/sign-up"],
        disallow: ["/dashboard", "/agents", "/meetings", "/call", "/settings", "/admin", "/api"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sitemap.xml`,
  };
}