"use client";

import { useEffect, useSyncExternalStore } from "react";

const key = "g4z-motion";
const event = "g4z-motion-change";
let memoryPreference = true;
function snapshot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return memoryPreference;
  }
}
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener("storage", callback);
  window.addEventListener(event, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(event, callback);
    media.removeEventListener("change", callback);
  };
}
const serverSnapshot = () => false;

export function MotionSettings() {
  const enabled = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  return null;
}

export function MotionToggle() {
  const enabled = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label="Движение логотипа"
      className="inline-flex min-h-11 items-center gap-2 text-xs text-ink-faint hover:text-ink"
      onClick={() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        memoryPreference = !enabled;
        try {
          localStorage.setItem(key, enabled ? "off" : "on");
        } catch {
          /* Storage may be blocked. */
        }
        window.dispatchEvent(new Event(event));
      }}
    >
      <span
        aria-hidden="true"
        className={
          enabled
            ? "size-1.5 rounded-pill bg-accent"
            : "size-1.5 rounded-pill bg-ink-faint"
        }
      />
      Движение {enabled ? "вкл." : "выкл."}
    </button>
  );
}
