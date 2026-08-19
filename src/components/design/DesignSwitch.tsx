/** TEMPORARY: local-only design variant switch (see src/lib/design-mode.ts). */
import { Check } from "lucide-react";
import { setDesignMode, useDesignMode, type DesignMode } from "@/lib/design-mode";

const OPTIONS: { value: DesignMode; label: string }[] = [
  { value: "classic", label: "CaseLab (Classic)" },
  { value: "v2", label: "Didaktiva V2" },
];

export function DesignSwitch() {
  const mode = useDesignMode();

  return (
    <div className="px-1 py-1">
      <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Design
      </p>
      <div role="radiogroup" aria-label="Vælg design" className="flex flex-col">
        {OPTIONS.map((option) => {
          const selected = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDesignMode(option.value)}
              className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Check
                aria-hidden="true"
                className={`size-3.5 ${selected ? "text-primary" : "opacity-0"}`}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
