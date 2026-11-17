"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Observe only this component's hydrated wrapper, including streamed content. */
export function Reveal({
  children,
  as: Tag = "div",
  direction = "up",
  className = "",
  id,
}: {
  children: ReactNode;
  as?: "div" | "section" | "li";
  direction?: "up" | "left" | "right" | "card";
  className?: string;
  id?: string;
}) {
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;

    function show(animate = false) {
      element!.dataset.revealState = animate ? "entering" : "visible";
      observer?.disconnect();
    }
    function preference() {
      if (motion.matches) show();
    }
    function finish(event: AnimationEvent) {
      if (event.target === element && event.animationName === "orbit-reveal-in") show();
    }
    function focus() {
      show();
    }

    // Content already in view, including restored scroll and anchor navigation,
    // is shown immediately. Without JS the server-rendered wrapper is visible.
    if (motion.matches || element.getBoundingClientRect().top < window.innerHeight) {
      show();
    } else {
      element.dataset.revealState = "pending";
      observer = new IntersectionObserver(
        (entries) => {
          if (
            element.dataset.revealState === "pending" &&
            entries.some((entry) => entry.isIntersecting)
          )
            show(true);
        },
        { threshold: 0.05 },
      );
      observer.observe(element);
    }

    element.addEventListener("animationend", finish);
    element.addEventListener("focusin", focus);
    motion.addEventListener("change", preference);
    return () => {
      observer?.disconnect();
      element.removeEventListener("animationend", finish);
      element.removeEventListener("focusin", focus);
      motion.removeEventListener("change", preference);
      delete element.dataset.revealState;
    };
  }, []);

  return (
    <Tag
      id={id}
      ref={(element: HTMLElement | null) => {
        root.current = element;
      }}
      className={`${direction === "up" ? "orbit-reveal" : `orbit-reveal-${direction}`} ${className}`}
    >
      {children}
    </Tag>
  );
}
