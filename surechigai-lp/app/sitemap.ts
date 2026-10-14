import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/privacy", "/operator"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
