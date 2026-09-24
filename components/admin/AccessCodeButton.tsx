"use client";

import { useState, useTransition } from "react";
import { generateAccessCodeAction } from "@/app/admin/consultoras/actions";

interface AccessCodeButtonProps {
  consultantId: string;
  hasCode: boolean;
}

export function AccessCodeButton({ consultantId, hasCode }: AccessCodeButtonProps) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    if (hasCode && !window.confirm("Gerar um novo código invalida o anterior. Continuar?")) return;
    setError(null);
    setCopied(false);
    startTransition(async () => {
      try {
        setCode(await generateAccessCodeAction(consultantId));
      } catch {
        setError("Não foi possível gerar o código.");
      }
    });
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar. Selecione e copie o código à mão.");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className="text-xs font-semibold text-ink underline hover:text-graphite cursor-pointer disabled:opacity-50"
      >
        {pending ? "Gerando..." : hasCode ? "Gerar novo código" : "Gerar código de acesso"}
      </button>

      {code ? (
        <div className="rounded-lg border border-smoke bg-cream p-2 text-xs">
          <p className="font-mono text-sm font-bold tracking-wider text-ink select-all">{code}</p>
          <p className="mt-1 text-muted">
            Aparece só agora. Mande para a consultora entrar em /consultora.
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-1 font-semibold text-graphite underline cursor-pointer"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
