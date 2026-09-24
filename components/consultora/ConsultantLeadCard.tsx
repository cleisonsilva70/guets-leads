"use client";

import { useState, useTransition } from "react";
import { leadStatusLabels, leadStatusValues } from "@/lib/labels";
import { markContactedAction, updateLeadStatusAction } from "@/app/consultora/actions";

export interface ConsultantLeadCardProps {
  id: string;
  name: string;
  businessName: string;
  instagramUrl: string | null;
  instagramHandle: string | null;
  whatsappDisplay: string;
  classification: string;
  investment: string;
  frequency: string;
  createdAtLabel: string;
  whatsappClicked: boolean;
  status: string;
  waHref: string;
}

const classificationStyles: Record<string, string> = {
  "Lead Quente": "bg-red-100 text-red-700",
  "Lead Qualificado": "bg-green-100 text-green-700",
  "Lead Iniciante": "bg-smoke text-muted",
};

export function ConsultantLeadCard(props: ConsultantLeadCardProps) {
  const [status, setStatus] = useState(props.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCall() {
    if (status === leadStatusLabels.new) setStatus(leadStatusLabels.contacted);
    startTransition(async () => {
      try {
        await markContactedAction(props.id);
      } catch {
        setError("Não foi possível atualizar o status. Atualize a página.");
      }
    });
  }

  function handleStatusChange(next: string) {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateLeadStatusAction(props.id, next);
      } catch {
        setStatus(previous);
        setError("Não foi possível salvar o status. Tente de novo.");
      }
    });
  }

  return (
    <article className="rounded-2xl border border-smoke bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ink">{props.name}</h2>
          <p className="text-sm text-muted">
            {props.businessName}
            {props.instagramUrl && props.instagramHandle ? (
              <>
                {" · "}
                <a
                  href={props.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-graphite hover:underline"
                >
                  @{props.instagramHandle}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            classificationStyles[props.classification] ?? "bg-smoke text-muted"
          }`}
        >
          {props.classification}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-xs text-muted">WhatsApp</dt>
          <dd className="text-ink">{props.whatsappDisplay}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Chegou em</dt>
          <dd className="text-ink">{props.createdAtLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Investimento</dt>
          <dd className="text-ink">{props.investment}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Compra</dt>
          <dd className="text-ink">{props.frequency}</dd>
        </div>
      </dl>

      <p
        className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
          props.whatsappClicked ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"
        }`}
      >
        {props.whatsappClicked ? "Abriu a conversa no WhatsApp (pode não ter enviado)" : "Não abriu a conversa no WhatsApp"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={props.waHref}
          target="_blank"
          rel="noreferrer"
          onClick={handleCall}
          className="rounded-xl bg-graphite px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
        >
          Chamar no WhatsApp
        </a>

        <label className="flex items-center gap-2 text-sm text-muted">
          Status
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-smoke bg-white px-2 py-1 text-sm text-ink"
          >
            {leadStatusValues
              .filter((label) => label !== leadStatusLabels.awaiting_assignment || label === status)
              .map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </article>
  );
}
