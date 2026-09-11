interface OptionButtonProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
}

export function OptionButton({ label, selected = false, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border-2 px-6 py-5 text-left text-base font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
        selected
          ? "border-graphite bg-graphite/5 text-ink"
          : "border-smoke bg-white text-ink hover:border-graphite/50"
      }`}
    >
      {label}
    </button>
  );
}
