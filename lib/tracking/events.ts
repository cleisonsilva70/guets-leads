/**
 * Nomes de eventos internos do funil (seção 48 do briefing). Usados tanto
 * pelo tracking client-side (Pixel/GA4) quanto pela tabela funnel_events.
 */
export const FUNNEL_EVENTS = {
  landingViewed: "landing_viewed",
  quizStarted: "quiz_started",
  quizStepCompleted: "quiz_step_completed",
  b2cDisqualified: "b2c_disqualified",
  minimumOrderAccepted: "minimum_order_accepted",
  minimumOrderDisqualified: "minimum_order_disqualified",
  qualificationCompleted: "qualification_completed",
  registrationStarted: "registration_started",
  leadCreated: "lead_created",
  consultantAssigned: "consultant_assigned",
  whatsappClicked: "whatsapp_clicked",
} as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];
