import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

interface QuizScreenProps {
  step?: number;
  totalSteps?: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function QuizScreen({
  step,
  totalSteps,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: QuizScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      {step && totalSteps ? (
        <div className="px-5 pt-5 sm:px-8">
          <ProgressBar current={step} total={totalSteps} />
        </div>
      ) : null}

      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div key={title} className="animate-fade-slide-in w-full max-w-md">
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
