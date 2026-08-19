import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { joinSessionFn, peekSessionFn } from "@/lib/session.functions";
import { readToken, saveToken } from "@/lib/participant";
import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/public/PublicLayout";

export const Route = createFileRoute("/join/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Deltag i aktivitet — Didaktiva" },
      { name: "description", content: "Deltag med et automatisk alias." },
      { property: "og:title", content: "Deltag i aktivitet — Didaktiva" },
      { property: "og:description", content: "Deltag med et automatisk alias." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinCode,
});

function JoinCode() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [alias, setAlias] = useState<string | null>(null);

  const peek = useQuery({
    queryKey: ["peek-session", code],
    queryFn: () => peekSessionFn({ data: { code } }),
    retry: false,
  });

  useEffect(() => {
    if (readToken(code)) void navigate({ to: "/student/$code", params: { code }, replace: true });
  }, [code, navigate]);

  const join = useMutation({
    mutationFn: (rotateAlias: boolean) =>
      joinSessionFn({
        data: {
          code,
          participant_token: readToken(code),
          rotate_alias: rotateAlias,
        },
      }),
    onSuccess: (res) => {
      saveToken(code, res.participant_token);
      setAlias(res.display_name);
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="flex items-center gap-2 font-display text-2xl font-semibold">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="font-display text-sm font-bold">D</span>
          </div>
          <span>
            Didakt<span className="text-primary">iva</span>
          </span>
        </div>

        {peek.isLoading && (
          <p className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Henter aktivitet …
          </p>
        )}

        {peek.data && !peek.data.found && (
          <div className="mt-10">
            <h1 className="font-display text-3xl font-semibold">Sessionen blev ikke fundet.</h1>
            <p className="mt-2 text-muted-foreground">Tjek koden og prøv igen.</p>
            <Button
              className="mt-6 h-14 w-full rounded-2xl"
              onClick={() => void navigate({ to: "/join" })}
            >
              Prøv en anden kode
            </Button>
          </div>
        )}

        {peek.data?.found && peek.data.status === "ended" && (
          <div className="mt-10">
            <h1 className="font-display text-3xl font-semibold">Denne aktivitet er afsluttet.</h1>
            <p className="mt-2 text-muted-foreground">Tak for din deltagelse.</p>
          </div>
        )}

        {peek.data?.found && peek.data.status !== "ended" && (
          <>
            <h1 className="mt-10 font-display text-3xl font-semibold">Deltag i aktivitet</h1>
            <p className="mt-2 text-lg">{peek.data.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Kode {code}
              {peek.data.subject ? ` · ${peek.data.subject}` : ""}
            </p>

            <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              Du deltager med et automatisk alias. Du behøver ikke oprette en konto eller skrive dit
              rigtige navn.
            </p>

            <div className="mt-6 space-y-3">
              {alias ? (
                <div className="rounded-2xl border border-primary/25 bg-accent/50 p-5 text-center">
                  <p className="text-sm text-muted-foreground">Du deltager som:</p>
                  <p className="mt-1 text-xl font-semibold">{alias}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 rounded-full"
                    disabled={join.isPending}
                    onClick={() => join.mutate(true)}
                  >
                    <RefreshCw className="size-4" /> Nyt alias
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="h-14 w-full rounded-2xl text-base"
                disabled={join.isPending}
                onClick={() => {
                  if (alias)
                    void navigate({ to: "/student/$code", params: { code }, replace: true });
                  else join.mutate(false);
                }}
              >
                {join.isPending && <Loader2 className="size-4 animate-spin" />}
                {alias ? "Deltag" : "Få mit alias"}
              </Button>
              {join.isError && (
                <p className="text-sm text-destructive">{(join.error as Error).message}</p>
              )}
            </div>
          </>
        )}
        <p className="mt-7 text-center text-xs text-muted-foreground">
          Læs om alias og elevdata i{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
            privatlivspolitikken
          </Link>
          .
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
