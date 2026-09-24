"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function ConsultantLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/consultora/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      setError(
        response.status === 503
          ? "Não foi possível entrar agora. Tente de novo em instantes."
          : "Código inválido. Confira com a administração."
      );
      setLoading(false);
      return;
    }

    router.push("/consultora");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-10 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold text-ink">Meus leads</h1>
      <p className="text-sm text-muted">Digite o seu código de acesso para ver os leads que chegaram para você.</p>
      <input
        type="text"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        className="w-full rounded-xl border-2 border-smoke bg-white px-4 py-3 text-base uppercase tracking-wider focus:border-graphite focus:outline-none"
        autoFocus
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={loading || code.trim().length < 8}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
