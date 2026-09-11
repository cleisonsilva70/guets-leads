"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuizScreen } from "./QuizScreen";
import { OptionButton } from "./OptionButton";
import { Button } from "@/components/ui/Button";
import { RegistrationForm, type RegistrationFormValues } from "@/components/forms/RegistrationForm";
import {
  purposeOptions,
  segmentOptions,
  salesChannelOptions,
  investmentRangeOptions,
  purchaseFrequencyOptions,
} from "@/lib/quiz/config";
import { minimumOrderLabel } from "@/lib/config/commercial";
import { linksConfig } from "@/lib/config/links";
import { captureAndPersistUtms, getStoredUtms, trackEvent } from "@/lib/tracking/client";
import { FUNNEL_EVENTS } from "@/lib/tracking/events";
import { fireMetaPixelEvent, fireMetaPixelStandardEvent, fireGa4Event } from "@/lib/tracking/pixel";
import type {
  InvestmentRange,
  PurchaseFrequency,
  PurchasePurpose,
  SalesChannel,
  Segment,
} from "@/types/lead";

type Screen =
  | "purpose"
  | "b2c_disqualified"
  | "minimum_order"
  | "minimum_order_disqualified"
  | "segment"
  | "channel"
  | "investment"
  | "frequency"
  | "transition"
  | "registration";

interface QualificationState {
  purchasePurpose: PurchasePurpose | null;
  segment: Segment | null;
  salesChannel: SalesChannel | null;
  investmentRange: InvestmentRange | null;
  purchaseFrequency: PurchaseFrequency | null;
}

const STEP_NUMBER: Partial<Record<Screen, number>> = {
  purpose: 1,
  minimum_order: 2,
  segment: 3,
  channel: 4,
  investment: 5,
  frequency: 6,
  transition: 7,
  registration: 8,
};
const TOTAL_STEPS = 8;

export function QuizWizard() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("purpose");
  const [answers, setAnswers] = useState<QualificationState>({
    purchasePurpose: null,
    segment: null,
    salesChannel: null,
    investmentRange: null,
    purchaseFrequency: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    captureAndPersistUtms();
    trackEvent(FUNNEL_EVENTS.quizStarted);
  }, []);

  function goToStep(next: Screen, eventStep?: string, value?: string) {
    if (eventStep) {
      trackEvent(FUNNEL_EVENTS.quizStepCompleted, { step: eventStep, metadata: { value } });
    }
    setScreen(next);
  }

  function handlePurpose(value: PurchasePurpose) {
    setAnswers((a) => ({ ...a, purchasePurpose: value }));
    if (value === "personal_use") {
      trackEvent(FUNNEL_EVENTS.b2cDisqualified);
      setScreen("b2c_disqualified");
      return;
    }
    goToStep("minimum_order", "purpose", value);
  }

  function handleMinimumOrder(accepts: boolean) {
    if (!accepts) {
      trackEvent(FUNNEL_EVENTS.minimumOrderDisqualified);
      setScreen("minimum_order_disqualified");
      return;
    }
    trackEvent(FUNNEL_EVENTS.minimumOrderAccepted);
    setScreen("segment");
  }

  function handleSegment(value: Segment) {
    setAnswers((a) => ({ ...a, segment: value }));
    goToStep("channel", "segment", value);
  }

  function handleChannel(value: SalesChannel) {
    setAnswers((a) => ({ ...a, salesChannel: value }));
    goToStep("investment", "channel", value);
  }

  function handleInvestment(value: InvestmentRange) {
    setAnswers((a) => ({ ...a, investmentRange: value }));
    goToStep("frequency", "investment", value);
  }

  function handleFrequency(value: PurchaseFrequency) {
    setAnswers((a) => ({ ...a, purchaseFrequency: value }));
    trackEvent(FUNNEL_EVENTS.qualificationCompleted);
    setScreen("transition");
  }

  function handleContinueToRegistration() {
    trackEvent(FUNNEL_EVENTS.registrationStarted);
    setScreen("registration");
  }

  async function handleRegistrationSubmit(values: RegistrationFormValues) {
    if (
      !answers.purchasePurpose ||
      !answers.segment ||
      !answers.salesChannel ||
      !answers.investmentRange ||
      !answers.purchaseFrequency
    ) {
      setSubmitError("Sessão expirada, recarregue e responda o quiz novamente.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const utms = getStoredUtms();
    const sessionId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("guets_session_id") ?? crypto.randomUUID()
        : "server";

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answers,
          acceptsMinimumOrder: true,
          ...values,
          ...utms,
          sessionId,
          website: "", // honeypot
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error === "invalid_payload" ? "Verifique os dados informados." : "Não foi possível concluir seu cadastro. Tente novamente.");
      }

      const data = (await response.json()) as { leadId: string };

      fireMetaPixelStandardEvent("Lead");
      fireMetaPixelEvent("QualifiedLead");
      fireGa4Event("registration_complete");

      router.push(`/sucesso/${data.leadId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erro inesperado.");
      setSubmitting(false);
    }
  }

  switch (screen) {
    case "purpose":
      return (
        <QuizScreen
          step={STEP_NUMBER.purpose}
          totalSteps={TOTAL_STEPS}
          eyebrow="Pergunta 1"
          title="Você pretende comprar nossas peças para:"
        >
          {purposeOptions.map((opt) => (
            <OptionButton key={opt.value} label={opt.label} onClick={() => handlePurpose(opt.value)} />
          ))}
        </QuizScreen>
      );

    case "b2c_disqualified":
      return (
        <QuizScreen
          title="Esse atendimento é exclusivo para o atacado"
          subtitle="Nosso canal de atacado é feito para lojistas e revendedores que compram para revender."
        >
          {linksConfig.b2cCatalogUrl ? (
            <a href={linksConfig.b2cCatalogUrl}>
              <Button variant="secondary">CONHECER NOSSOS PRODUTOS</Button>
            </a>
          ) : null}
        </QuizScreen>
      );

    case "minimum_order":
      return (
        <QuizScreen
          step={STEP_NUMBER.minimum_order}
          totalSteps={TOTAL_STEPS}
          eyebrow="Pedido mínimo"
          title={`Nosso pedido mínimo no atacado é de ${minimumOrderLabel}.`}
          subtitle="Esse valor cabe no que você pretende investir no seu primeiro pedido?"
        >
          <OptionButton
            label={`Sim, consigo investir a partir de ${minimumOrderLabel}`}
            onClick={() => handleMinimumOrder(true)}
          />
          <OptionButton label="Ainda não consigo investir esse valor" onClick={() => handleMinimumOrder(false)} />
        </QuizScreen>
      );

    case "minimum_order_disqualified":
      return (
        <QuizScreen
          title="Obrigado pelo seu interesse!"
          subtitle={`Hoje nosso pedido mínimo no atacado é de ${minimumOrderLabel}. Assim que esse valor encaixar no seu momento, vai ser um prazer te atender.`}
        >
          <a href={linksConfig.instagramUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary">ACOMPANHAR A MARCA NO INSTAGRAM</Button>
          </a>
        </QuizScreen>
      );

    case "segment":
      return (
        <QuizScreen
          step={STEP_NUMBER.segment}
          totalSteps={TOTAL_STEPS}
          title="Hoje você já vende moda feminina ou fitness?"
        >
          {segmentOptions.map((opt) => (
            <OptionButton key={opt.value} label={opt.label} onClick={() => handleSegment(opt.value)} />
          ))}
        </QuizScreen>
      );

    case "channel":
      return (
        <QuizScreen
          step={STEP_NUMBER.channel}
          totalSteps={TOTAL_STEPS}
          title="Onde você vende atualmente?"
        >
          {salesChannelOptions.map((opt) => (
            <OptionButton key={opt.value} label={opt.label} onClick={() => handleChannel(opt.value)} />
          ))}
        </QuizScreen>
      );

    case "investment":
      return (
        <QuizScreen
          step={STEP_NUMBER.investment}
          totalSteps={TOTAL_STEPS}
          title="Aproximadamente quanto você pretende investir no seu primeiro pedido?"
        >
          {investmentRangeOptions.map((opt) => (
            <OptionButton key={opt.value} label={opt.label} onClick={() => handleInvestment(opt.value)} />
          ))}
        </QuizScreen>
      );

    case "frequency":
      return (
        <QuizScreen
          step={STEP_NUMBER.frequency}
          totalSteps={TOTAL_STEPS}
          title="Com que frequência você costuma comprar mercadoria para sua loja?"
        >
          {purchaseFrequencyOptions.map((opt) => (
            <OptionButton key={opt.value} label={opt.label} onClick={() => handleFrequency(opt.value)} />
          ))}
        </QuizScreen>
      );

    case "transition":
      return (
        <QuizScreen
          step={STEP_NUMBER.transition}
          totalSteps={TOTAL_STEPS}
          title="Falta pouco!"
          subtitle="Seu perfil tem tudo a ver com o nosso atacado. Agora é só preencher seus dados para concluir o cadastro e conhecer a consultora que vai te atender."
          footer={<Button onClick={handleContinueToRegistration}>CONTINUAR CADASTRO</Button>}
        >
          <></>
        </QuizScreen>
      );

    case "registration":
      return (
        <QuizScreen
          step={STEP_NUMBER.registration}
          totalSteps={TOTAL_STEPS}
          title="Complete seus dados"
          subtitle={`Pedido mínimo: ${minimumOrderLabel} — leva menos de 1 minuto.`}
        >
          <RegistrationForm
            onSubmit={handleRegistrationSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        </QuizScreen>
      );
  }
}
