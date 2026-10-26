"use client";

import { useEffect } from "react";

const CARD_SELECTOR = ".value-card, .work-card, .job-card, .news-card, .gallery-card, .ceo-media";

export default function CardMotion() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let activeCard: HTMLElement | null = null;

    const resetCard = (card: HTMLElement) => {
      card.classList.remove("motion-card-active");
      card.style.removeProperty("--motion-rotate-x");
      card.style.removeProperty("--motion-rotate-y");
      card.style.removeProperty("--motion-pointer-x");
      card.style.removeProperty("--motion-pointer-y");
    };

    const resetActiveCard = () => {
      if (activeCard) resetCard(activeCard);
      activeCard = null;
    };

    const moveCard = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>(CARD_SELECTOR)
        : null;

      if (!target) {
        resetActiveCard();
        return;
      }

      if (activeCard && activeCard !== target) resetCard(activeCard);
      activeCard = target;

      const bounds = target.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      const maxTilt = target.matches(".ceo-media, .gallery-card") ? 4 : 6;

      target.style.setProperty("--motion-rotate-x", `${((0.5 - y) * maxTilt).toFixed(2)}deg`);
      target.style.setProperty("--motion-rotate-y", `${((x - 0.5) * maxTilt).toFixed(2)}deg`);
      target.style.setProperty("--motion-pointer-x", `${(x * 100).toFixed(1)}%`);
      target.style.setProperty("--motion-pointer-y", `${(y * 100).toFixed(1)}%`);
      target.classList.add("motion-card-active");
    };

    document.addEventListener("pointermove", moveCard, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetActiveCard);
    window.addEventListener("blur", resetActiveCard);

    return () => {
      document.removeEventListener("pointermove", moveCard);
      document.documentElement.removeEventListener("pointerleave", resetActiveCard);
      window.removeEventListener("blur", resetActiveCard);
      resetActiveCard();
    };
  }, []);

  return null;
}
