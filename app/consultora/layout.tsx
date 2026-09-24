import Image from "next/image";
import { getCurrentConsultant } from "@/lib/auth/consultant-session";
import { ConsultantLogoutButton } from "@/components/consultora/ConsultantLogoutButton";

// Área autenticada por cookie e com dados ao vivo: nunca pré-renderizar.
export const dynamic = "force-dynamic";

export default async function ConsultantLayout({ children }: { children: React.ReactNode }) {
  const consultant = await getCurrentConsultant();

  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-smoke bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Image src="/logo/logo-cinza.png" alt="Guets" width={160} height={98} className="h-8 w-auto" />
          {consultant ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-ink">{consultant.name}</span>
              <ConsultantLogoutButton />
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
