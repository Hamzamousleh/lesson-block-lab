import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAccountFn, downloadMyDataFn } from "@/lib/privacy.functions";
import { clearPrivateLocalStorage } from "@/lib/participant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function downloadJson(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `didaktiva-data-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AccountPrivacyDialog({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");

  const exportData = useMutation({
    mutationFn: () => downloadMyDataFn(),
    onSuccess: (data) => {
      downloadJson(data);
      toast.success("Din dataeksport er hentet");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAccount = useMutation({
    mutationFn: () => deleteMyAccountFn({ data: { confirmation: "SLET" } }),
    onSuccess: async () => {
      clearPrivateLocalStorage();
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      onDeleted();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!deleteAccount.isPending) {
          if (!next) setConfirmation("");
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Konto og data</DialogTitle>
          <DialogDescription>
            Hent en kopi af dine data eller slet din konto permanent.
          </DialogDescription>
        </DialogHeader>

        <section className="mt-3 rounded-2xl border border-border p-5">
          <h3 className="font-semibold">Download mine data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Henter dine konto-, undervisnings- og sessionsdata som JSON. Elevsvar er ikke med i
            denne samlede eksport og kan eksporteres fra den enkelte session.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-full"
            disabled={exportData.isPending}
            onClick={() => exportData.mutate()}
          >
            {exportData.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download mine data
          </Button>
        </section>

        <section className="mt-3 rounded-2xl border border-destructive/35 bg-destructive/5 p-5">
          <h3 className="font-semibold text-destructive">Slet min konto</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Konto, undervisningsdata, Worlds, sessioner og materialefiler slettes permanent. Denne
            handling kan ikke fortrydes.
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="delete-account-confirmation">
              Skriv <strong>SLET</strong> for at bekræfte
            </Label>
            <Input
              id="delete-account-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            className="mt-4 rounded-full"
            disabled={confirmation !== "SLET" || deleteAccount.isPending}
            onClick={() => deleteAccount.mutate()}
          >
            {deleteAccount.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Slet min konto permanent
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}
