import { useState } from "react";
import { BLOCK_GROUPS, BLOCK_TYPES } from "@/lib/blocks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ActivityPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (type: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const matches = BLOCK_TYPES.filter(
    (b) =>
      !query ||
      b.label.toLowerCase().includes(query) ||
      b.description.toLowerCase().includes(query),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tilføj aktivitet</DialogTitle>
          <DialogDescription>Vælg den aktivitetstype, du vil have i timen.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg efter aktivitet …"
          className="rounded-full"
        />
        <div className="mt-2 space-y-7">
          {BLOCK_GROUPS.map((g) => {
            const items = matches.filter((b) => b.group === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key}>
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {g.label}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {items.map((b) => (
                    <button
                      key={b.type}
                      type="button"
                      onClick={() => {
                        onPick(b.type);
                        onOpenChange(false);
                        setQ("");
                      }}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <span className="min-w-0">
                        <span className="block font-medium">{b.label}</span>
                        <span className="block text-sm text-muted-foreground">
                          {b.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <p className="text-muted-foreground">Ingen aktiviteter matcher din søgning.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
