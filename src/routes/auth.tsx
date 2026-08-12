import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log ind — CaseLab" },
      { name: "description", content: "Log ind eller opret en lærerkonto i CaseLab." },
      { property: "og:title", content: "Log ind — CaseLab" },
      { property: "og:description", content: "Log ind eller opret en lærerkonto i CaseLab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionLoading && session) navigate({ to: "/home", replace: true });
  }, [sessionLoading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Din konto er oprettet");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Noget gik galt");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google-login mislykkedes");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-10 block text-center font-display text-2xl font-semibold">
          Case<span className="text-primary">Lab</span>
        </Link>
        <div className="surface-card p-8">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Underviser
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {mode === "signin" ? "Velkommen tilbage" : "Opret lærerkonto"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Log ind som underviser for at fortsætte dit arbejde."
              : "Kom i gang med dit eget arbejdsrum."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Navn</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Log ind" : "Opret konto"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> eller <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => void google()}
            disabled={busy}
          >
            Fortsæt med Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Ny på CaseLab?" : "Har du allerede en konto?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Opret konto" : "Log ind"}
            </button>
          </p>
        </div>

        <div className="surface-card mt-6 p-6">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Elev</p>
          <h2 className="mt-1 text-lg font-semibold">Skal du deltage i undervisningen?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Du skal ikke oprette en konto — brug bare koden fra din underviser.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const c = joinCode.trim().toUpperCase();
              if (c) navigate({ to: "/join/$code", params: { code: c } });
              else navigate({ to: "/join" });
            }}
          >
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Sessionskode"
              className="h-11 rounded-full text-center font-mono tracking-[0.2em]"
            />
            <Button type="submit" variant="secondary" className="h-11 shrink-0 rounded-full px-5">
              Deltag med kode
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
