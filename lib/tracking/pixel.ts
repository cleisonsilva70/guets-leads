"use client";

/**
 * Wrappers finos sobre window.fbq / window.gtag. Sempre no-op seguro
 * quando os scripts (injetados em components/tracking/AnalyticsScripts.tsx)
 * ainda não carregaram ou os IDs não estão configurados.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function fireMetaPixelEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("trackCustom", eventName, params ?? {});
}

export function fireMetaPixelStandardEvent(
  eventName: "PageView" | "ViewContent" | "Lead" | "Contact",
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params ?? {});
}

export function fireGa4Event(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}
