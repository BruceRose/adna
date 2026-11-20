"use client";

import { useEffect, useState } from "react";

export const RESULT_SECTIONS = [
  { id: "your-style", label: "Your style" },
  { id: "your-map", label: "Your map" },
  { id: "your-tips", label: "Your tips" },
  { id: "explore", label: "Explore" },
  { id: "your-preferences", label: "Your preferences" },
] as const;

/** In-page nav: sticky on desktop, a scrolling chip row on mobile. Highlights the section in view. */
export function SectionNav() {
  const [active, setActive] = useState<string>(RESULT_SECTIONS[0].id);
  useEffect(() => {
    const els = RESULT_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav className="section-nav no-print" aria-label="Sections">
      <ul>
        {RESULT_SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined} className={active === s.id ? "active" : ""}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Share, Copy link (with a "Link copied" toast) and Print / save as PDF. */
export function ResultsActions({ shareTitle }: { shareTitle: string }) {
  const [toast, setToast] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      window.prompt("Copy this link:", window.location.href);
      return;
    }
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: shareTitle, url: window.location.href });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="results-actions no-print">
      {canShare && (
        <button type="button" className="primary small" onClick={share}>
          Share
        </button>
      )}
      <button type="button" className={canShare ? "small" : "primary small"} onClick={copy}>
        Copy link
      </button>
      <button type="button" className="small" onClick={() => window.print()}>
        Print / save as PDF
      </button>
      <p className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast ? "Link copied" : ""}
      </p>
    </div>
  );
}

/** Fades sections up as they scroll into view (once). Content stays visible without JavaScript. */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    const below = els.filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    below.forEach((el) => el.classList.add("pre-reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
