// Shared behaviour of the HTML overlays (shop, hub): open / close, focus handling, Tab trapping.

import { audio } from "./audio.js";

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class Dialog {
  /**
   * @param root the overlay element (has the `hidden` attribute while closed)
   * @param closeBtn the button that closes it
   */
  constructor(root, closeBtn) {
    this.root = root;
    this.closeBtn = closeBtn;
    this.opener = null;

    closeBtn.addEventListener("click", () => this.close());
    // Tapping the dark area around the panel closes the dialog.
    root.addEventListener("pointerdown", (e) => {
      if (e.target === root) this.close();
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  /** Called when the dialog opened (build the content here). */
  onOpen() {}

  /** Called after the dialog closed. */
  onClose() {}

  open() {
    if (this.isOpen) return;
    this.opener = document.activeElement;
    this.root.hidden = false;
    this.onOpen();
    this.closeBtn.focus();
    audio.play("click");
  }

  close() {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.onClose();
    audio.play("click");
    if (this.opener && document.contains(this.opener)) this.opener.focus();
    this.opener = null;
  }

  /** Keeps Tab inside the dialog. Call from a keydown handler while the dialog is open. */
  trapTab(e) {
    const items = [
      ...this.root.querySelectorAll(
        "button:not([disabled]), input:not([disabled])",
      ),
    ];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!this.root.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
