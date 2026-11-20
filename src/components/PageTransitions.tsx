"use client";

/**
 * Swipe transitions between pages, using the browser's View Transitions API.
 *
 * Next.js navigations happen in-page, so we start a view transition, ask the
 * router to navigate, and finish the transition once the new route has
 * rendered (RouteChangeNotifier tells us). The main content area swipes
 * (forward: in from the right; back: in from the left) while the header and
 * background stay put. See "Page transitions" in globals.css.
 *
 * Browsers without View Transitions, and people with reduced motion turned on,
 * get the normal instant change.
 */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ComponentProps } from "react";

export type Direction = "forward" | "back";

const waiting = new Set<() => void>();
const MAX_WAIT_MS = 2000;

type DocWithVT = Document & { startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> } };

export function navigateWithTransition(go: () => void, direction: Direction = "forward") {
  const doc = document as DocWithVT;
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    go();
    return;
  }
  const html = document.documentElement;
  html.dataset.vt = "page";
  html.dataset.nav = direction;
  const t = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          waiting.delete(done);
          // Don't wait for an animation frame here: browsers pause rendering
          // until this callback finishes, so a frame would never arrive.
          resolve();
        };
        // Never leave the page frozen if the route change isn't detected.
        const timer = setTimeout(done, MAX_WAIT_MS);
        waiting.add(done);
        go();
      }),
  );
  t.finished.finally(() => {
    delete html.dataset.vt;
  });
}

/** Place once in the root layout (inside <Suspense>): signals when a new route has rendered. */
export function RouteChangeNotifier() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    for (const done of [...waiting]) done();
  }, [pathname, search]);
  return null;
}

/** A Link that swipes to its destination. Modified clicks (new tab etc.) behave normally. */
export function TransitionLink({
  direction = "forward",
  onClick,
  ...props
}: ComponentProps<typeof Link> & { direction?: Direction }) {
  const router = useRouter();
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || props.target === "_blank") return;
        e.preventDefault();
        const href = typeof props.href === "string" ? props.href : String(props.href.pathname ?? "/");
        navigateWithTransition(() => router.push(href), direction);
      }}
    />
  );
}
