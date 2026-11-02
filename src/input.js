// Tracks which kind of input the player is using right now, so hints can say "Tap" or "Click / Space".
// The last input wins: a touch screen laptop or a tablet with a keyboard switches as the player does.

let touch = !!globalThis.matchMedia?.("(pointer: coarse)").matches;

/** True while the player is playing with a finger (or pen) rather than a mouse / keyboard. */
export const usingTouch = () => touch;

export function installInputDetection() {
  window.addEventListener(
    "pointerdown",
    (e) => {
      touch = e.pointerType !== "mouse";
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    "keydown",
    () => {
      touch = false;
    },
    { capture: true, passive: true },
  );
}

/** Wording for the on-screen hints, e.g. `hint("flap")` -> "Tap to flap". */
export function hint(action) {
  return touch ? `Tap to ${action}` : `Click / Space to ${action}`;
}
