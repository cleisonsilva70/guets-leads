import type { ReactNode } from "react";
import Image from "next/image";
import { ProgressBar } from "./ProgressBar";

interface QuizScreenProps {
  step?: number;
  totalSteps?: number;
  eyebrow?: string;
  banner?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function QuizScreen({
  step,
  totalSteps,
  eyebrow,
  banner,
  title,
  subtitle,
  children,
  footer,
}: QuizScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <div className="flex justify-center px-5 pt-6 sm:px-8">
        <Image src="/logo/logo-cinza.png" alt="Guets" width={160} height={98} className="h-8 w-auto" priority />
      </div>

      {step && totalSteps ? (
        <div className="px-5 pt-5 sm:px-8">
          <ProgressBar current={step} total={totalSteps} />
        </div>
      ) : null}

      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div key={title} className="animate-fade-slide-in w-full max-w-md">
          {banner ? (
            <p className="mb-4 inline-flex items-center rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-graphite">
              {banner}
            </p>
          ) : null}
          {eyebrow ? (
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-graphite">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-base text-muted">{subtitle}</p> : null}

          <div className="mt-8 space-y-3">{children}</div>

          {footer ? <div className="mt-8">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
