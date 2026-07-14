import { AlertCircle, ArrowLeft, Check, ChevronRight } from "lucide-react";

const STEPS = [
  { label: "NAME", sub: "Category name" },
  { label: "PHOTOS", sub: "Add images" },
  { label: "SUBCATEGORIES", sub: "Add details" },
  { label: "DONE", sub: "Review & save" },
];

export function WizardErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
      <span className="flex-1">{error}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="text-red-400 hover:text-red-600">×</button>
    </div>
  );
}

export function WizardNavRow({
  onBack,
  onCancel,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  busy = false,
}: {
  onBack?: () => void;
  onCancel?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:border-neutral-500 transition-colors"><ArrowLeft className="w-4 h-4" aria-hidden /> Back</button>
      ) : onCancel ? (
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:border-neutral-500 transition-colors">Cancel</button>
      ) : <span />}
      <button type="button" onClick={onNext} disabled={nextDisabled || busy} aria-disabled={nextDisabled || busy} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {busy ? "Saving…" : nextLabel}
        {!busy && <ChevronRight className="w-4 h-4" aria-hidden />}
      </button>
    </div>
  );
}

export function WizardProgressBar({ step }: { step: number }) {
  return (
    <nav aria-label="Setup progress" className="flex items-start mb-8">
      {STEPS.map((item, index) => {
        const done = index < step;
        const active = index === step;
        return (
          <div key={item.label} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div aria-current={active ? "step" : undefined} aria-label={`Step ${index + 1}: ${item.label}${done ? " (completed)" : active ? " (current)" : ""}`} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${done || active ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-neutral-300 text-neutral-400 dark:bg-neutral-800 dark:border-neutral-600"}`}>
                {done ? <Check className="w-3.5 h-3.5" aria-hidden /> : index + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap mt-0.5 ${active ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}>{item.label}</span>
              <span className="text-[10px] text-neutral-400 whitespace-nowrap">{item.sub}</span>
            </div>
            {index < STEPS.length - 1 && <div aria-hidden className={`flex-1 h-0.5 mt-4 mx-2 transition-all ${done ? "bg-violet-600" : "bg-neutral-200 dark:bg-neutral-700"}`} />}
          </div>
        );
      })}
    </nav>
  );
}
