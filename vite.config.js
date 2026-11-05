import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Fills %VITE_SITE_URL% in index.html (absolute URLs are required for social
// share images). If it isn't set, the tags fall back to relative paths.
function siteUrlPlugin(siteUrl) {
  return {
    name: "hoh-site-url",
    transformIndexHtml: { order: "pre", handler: (html) => html.replaceAll("%VITE_SITE_URL%", siteUrl.replace(/\/+$/, "")) },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), siteUrlPlugin(env.VITE_SITE_URL || "")],
    build: { sourcemap: false, target: "es2020" },
  };
});
