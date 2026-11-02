import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version.js";

describe("version", () => {
  it("comes from package.json", () => {
    const { version } = JSON.parse(readFileSync("./package.json", "utf8"));
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(VERSION).toBe(version);
  });
});
