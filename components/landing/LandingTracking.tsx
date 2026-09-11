"use client";

import { useEffect } from "react";
import { captureAndPersistUtms, trackEvent } from "@/lib/tracking/client";
import { FUNNEL_EVENTS } from "@/lib/tracking/events";
import { fireMetaPixelStandardEvent, fireGa4Event } from "@/lib/tracking/pixel";

export function LandingTracking() {
  useEffect(() => {
    captureAndPersistUtms();
    trackEvent(FUNNEL_EVENTS.landingViewed);
    fireMetaPixelStandardEvent("ViewContent");
    fireGa4Event("landing_view");
  }, []);

  return null;
}
