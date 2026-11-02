// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { hint, installInputDetection, usingTouch } from "../src/input.js";

const pointer = (pointerType) => {
  const e = new Event("pointerdown", { bubbles: true });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  document.body.dispatchEvent(e);
};

beforeAll(() => installInputDetection());

describe("input detection", () => {
  it("follows the input the player used last", () => {
    pointer("touch");
    expect(usingTouch()).toBe(true);
    expect(hint("flap")).toBe("Tap to flap");

    pointer("mouse");
    expect(usingTouch()).toBe(false);
    expect(hint("flap")).toBe("Click / Space to flap");

    pointer("pen");
    expect(usingTouch()).toBe(true);

    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Space", bubbles: true }),
    );
    expect(usingTouch()).toBe(false);
    expect(hint("restart")).toBe("Click / Space to restart");
  });
});
