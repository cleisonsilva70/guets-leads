import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

// Painel autenticado por cookie + sempre dados ao vivo: nunca deve ser
// pré-renderizado estaticamente no build.
export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/consultoras", label: "Consultoras" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-smoke bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="whitespace-nowrap font-bold text-ink">Guets Admin</span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
