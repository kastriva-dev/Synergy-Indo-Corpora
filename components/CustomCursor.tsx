"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const cursor = cursorRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!cursor || !ring || !dot) return;

    document.body.classList.add("custom-cursor-enabled");

    const moveCursor = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      const position = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = position;
      dot.style.transform = position;
      cursor.classList.add("is-visible");
    };

    const updateCursorState = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;

      const target = event.target.closest(
        "[data-cursor], a, button, [role='button'], .work-card, .job-card, .news-card, .country-row, .ceo-media",
      );

      if (!target) {
        cursor.classList.remove("is-active");
        cursor.removeAttribute("data-label");
        return;
      }

      const customLabel = target.getAttribute("data-cursor");
      const label =
        customLabel ||
        (target.matches(".job-card, .news-card, .ceo-media")
          ? "VIEW"
          : target.matches(".work-card, .country-row")
            ? "EXPLORE"
            : "OPEN");

      cursor.dataset.label = label;
      cursor.classList.add("is-active");
    };

    const hideCursor = () => cursor.classList.remove("is-visible");

    document.addEventListener("pointermove", moveCursor, { passive: true });
    document.addEventListener("pointerover", updateCursorState);
    document.documentElement.addEventListener("pointerleave", hideCursor);
    window.addEventListener("blur", hideCursor);

    return () => {
      document.removeEventListener("pointermove", moveCursor);
      document.removeEventListener("pointerover", updateCursorState);
      document.documentElement.removeEventListener("pointerleave", hideCursor);
      window.removeEventListener("blur", hideCursor);
      document.body.classList.remove("custom-cursor-enabled");
    };
  }, []);

  return (
    <div className="custom-cursor" ref={cursorRef} aria-hidden="true">
      <span className="custom-cursor__ring" ref={ringRef}>
        <span className="custom-cursor__label" />
      </span>
      <span className="custom-cursor__dot" ref={dotRef} />
    </div>
  );
}
