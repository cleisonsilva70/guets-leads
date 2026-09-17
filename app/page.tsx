import Image from "next/image";
import Link from "next/link";
import { LandingTracking } from "@/components/landing/LandingTracking";
import { ProductTeaser } from "@/components/landing/ProductTeaser";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden bg-ink text-white">
      <LandingTracking />

      <div className="flex flex-1 items-center px-6 py-12 sm:px-10 lg:py-16">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <Image
              src="/logo/logo-branco.png"
              alt="Guets"
              width={160}
              height={98}
              className="mb-4 h-9 w-auto"
              priority
            />

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Moda Fitness Premium Direto da Fábrica
            </h1>

            <p className="mt-5 text-lg text-white/70">
              Peças prontas para vender na sua loja física ou online, com atendimento direto de
              uma consultora especializada em atacado.
            </p>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
              <li className="flex items-center gap-1.5">
                <span aria-hidden>✓</span> Zero transparência
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden>✓</span> Alta compressão
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden>✓</span> Tecido premium
              </li>
            </ul>
          </div>

          <div className="flex justify-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:justify-end">
            <ProductTeaser />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <p className="text-sm text-white/60">
              Responda algumas perguntas rápidas para a gente conhecer seu negócio e te colocar
              direto com a consultora certa.
            </p>

            <Link
              href="/quiz"
              className="mt-10 block w-full rounded-2xl bg-white px-6 py-4 text-center text-base font-bold text-ink shadow-xl shadow-black/20 transition-all duration-150 hover:bg-smoke active:scale-[0.98] lg:max-w-xs"
            >
              QUERO COMPRAR NO ATACADO
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
