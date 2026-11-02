import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stampServiceWorker } from "../vite.config.js";

const sw = readFileSync("public/sw.js", "utf8");

describe("service worker version", () => {
  it("has a placeholder in the cache name that the build replaces", () => {
    expect(sw).toContain('const CACHE = "flappy-__APP_VERSION__";');
    const { version } = JSON.parse(readFileSync("./package.json", "utf8"));
    const built = stampServiceWorker(sw, version);
    expect(built).toContain(`const CACHE = "flappy-${version}";`);
    expect(built).not.toContain("__APP_VERSION__");
  });

  it("refuses a service worker without the placeholder", () => {
    expect(() => stampServiceWorker("const CACHE = 'x';", "1.0.0")).toThrow();
  });
});
