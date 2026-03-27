import { ShieldAlert } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <div className="w-full bg-secondary/80 border-t border-border px-4 py-2 flex items-center justify-center gap-2">
      <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <p className="text-[11px] text-muted-foreground text-center leading-tight">
        CareGuide AI provides navigation and support information and is not a substitute for professional medical advice, diagnosis, or treatment.
      </p>
    </div>
  );
}
