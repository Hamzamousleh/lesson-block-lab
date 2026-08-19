import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/join/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Deltag i aktivitet — Didaktiva" },
      { name: "description", content: "Indtast koden fra din underviser og deltag i aktiviteten." },
      { property: "og:title", content: "Deltag i aktivitet — Didaktiva" },
      { property: "og:description", content: "Indtast koden fra din underviser." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinIndex,
});

function JoinIndex() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="flex items-center gap-2 font-display text-2xl font-semibold">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <span className="font-display text-sm font-bold">D</span>
        </div>
        <span>
          Didakt<span className="text-primary">iva</span>
        </span>
      </div>
      <h1 className="mt-8 font-display text-3xl font-semibold">Deltag i aktivitet</h1>
      <p className="mt-2 text-muted-foreground">Indtast koden, du har fået af din underviser.</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.trim().toUpperCase();
          if (!c) return;
          setBusy(true);
          void navigate({ to: "/join/$code", params: { code: c } });
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD12"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-16 rounded-2xl text-center font-mono text-2xl tracking-[0.3em]"
          aria-label="Kode"
        />
        <Button type="submit" size="lg" className="h-14 w-full rounded-2xl text-base" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Fortsæt
        </Button>
      </form>
    </div>
  );
}
