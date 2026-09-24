"use client";

import { useRouter } from "next/navigation";

export function ConsultantLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/consultora/logout", { method: "POST" });
    router.push("/consultora/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-muted hover:text-graphite cursor-pointer"
    >
      Sair
    </button>
  );
}
