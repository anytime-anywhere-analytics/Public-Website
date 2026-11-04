import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

/* Pagefind only runs after `astro build`, so `astro dev` has no /pagefind/. Serve the
   index from the last build instead, so search works locally (with the content of that build). */
const pagefindInDev = {
  name: "pagefind-in-dev",
  hooks: {
    "astro:server:setup": ({ server }) => {
      const root = join(process.cwd(), "dist/pagefind");
      const types = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" };
      server.middlewares.use("/pagefind", async (req, res, next) => {
        const file = normalize(join(root, decodeURIComponent((req.url || "/").split("?")[0])));
        if (!file.startsWith(root)) return next();
        try {
          const body = await readFile(file);
          res.setHeader("content-type", types[extname(file)] || "application/octet-stream");
          res.end(body);
        } catch { next(); }
      });
    },
  },
};

export default defineConfig({
  // SITE_URL lets a staging host (e.g. a *.pages.dev preview) build with its own canonical/og URLs.
  site: process.env.SITE_URL || "https://ca3.dk",
  // Content lives in src/data/*.json. `npm run build` first pulls the Google Sheet
  // CMS into those files when CMS_URL/CMS_TOKEN are set (scripts/fetch-sheets.mjs);
  // `npm run sync:pure` refreshes publications from the AU research portal.
  build: { format: "directory" },
  devToolbar: { enabled: false },
  integrations: [sitemap({ filter: (page) => !page.includes("/404") }), pagefindInDev],
});
