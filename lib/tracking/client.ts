"use client";

import type { UtmParams } from "@/types/lead";
import type { FunnelEventName } from "./events";

const SESSION_ID_KEY = "guets_session_id";
const UTM_STORAGE_KEY = "guets_utms";

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Um id de sessão anônimo por navegador, usado para correlacionar os passos do funil antes de existir um lead. */
export function getOrCreateSessionId(): string {
  const storage = safeLocalStorage();
  if (!storage) return "no-storage";

  let id = storage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

/**
 * Captura UTMs/fbclid da URL atual e persiste (sem sobrescrever) para que
 * sobrevivam por todas as telas do quiz/cadastro, mesmo que o usuário saia
 * da URL de entrada da campanha.
 */
export function captureAndPersistUtms(): UtmParams {
  const storage = safeLocalStorage();
  const existing = getStoredUtms();

  if (typeof window === "undefined") return existing;

  const params = new URLSearchParams(window.location.search);
  const fromUrl: UtmParams = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    fbclid: params.get("fbclid"),
    landing_page: window.location.pathname,
  };

  const hasNewUtms = Object.entries(fromUrl).some(
    ([key, value]) => key !== "landing_page" && value
  );

  // Só sobrescreve UTMs já guardadas se a URL atual realmente trouxe novas
  // (evita perder a campanha original ao navegar entre telas do quiz).
  const merged: UtmParams = hasNewUtms ? fromUrl : { ...existing, landing_page: existing.landing_page ?? fromUrl.landing_page };

  if (storage) {
    storage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function getStoredUtms(): UtmParams {
  const storage = safeLocalStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}

interface TrackEventOptions {
  leadId?: string;
  step?: string;
  metadata?: Record<string, unknown>;
}

/** Envia o evento para /api/events (persistido em funnel_events) e dispara Pixel/GA4 em paralelo. */
export function trackEvent(eventName: FunnelEventName, options: TrackEventOptions = {}): void {
  const sessionId = getOrCreateSessionId();
  const utms = getStoredUtms();

  const payload = {
    eventName,
    sessionId,
    leadId: options.leadId ?? null,
    step: options.step ?? null,
    metadata: options.metadata ?? {},
    ...utms,
  };

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Tracking nunca deve interromper a experiência do usuário.
  });
}
