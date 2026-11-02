import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// The version lives in package.json only; the game and the service worker get it at build time.
const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

const SW_PLACEHOLDER = "__APP_VERSION__";

/** Returns the service worker source with the version written into the cache name. */
export function stampServiceWorker(source, appVersion) {
  if (!source.includes(SW_PLACEHOLDER)) {
    throw new Error(`sw.js does not contain ${SW_PLACEHOLDER}`);
  }
  return source.replaceAll(SW_PLACEHOLDER, appVersion);
}

/** Writes the app version into dist/sw.js so every release gets its own cache. */
function serviceWorkerVersion() {
  let outDir;
  return {
    name: "service-worker-version",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      order: "post",
      handler() {
        const file = resolve(outDir, "sw.js");
        const source = readFileSync(file, "utf8");
        writeFileSync(file, stampServiceWorker(source, version));
      },
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [serviceWorkerVersion()],
  // Relative base so the build can be hosted from any sub-path (or opened from a static host).
  base: "./",
  // Expose the dev server on the LAN so it can be tested from a phone.
  server: { host: true },
});
