import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { joinSessionFn, peekSessionFn } from "@/lib/session.functions";
import { readToken, saveToken } from "@/lib/participant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/join/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Deltag i aktivitet — CaseLab" },
      { name: "description", content: "Skriv dit navn og deltag i aktiviteten." },
      { property: "og:title", content: "Deltag i aktivitet — CaseLab" },
      { property: "og:description", content: "Skriv dit navn og deltag." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinCode,
});

function JoinCode() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const peek = useQuery({
    queryKey: ["peek-session", code],
    queryFn: () => peekSessionFn({ data: { code } }),
    retry: false,
  });

  useEffect(() => {
    if (readToken(code)) void navigate({ to: "/student/$code", params: { code }, replace: true });
  }, [code, navigate]);

  const join = useMutation({
    mutationFn: () => joinSessionFn({ data: { code, display_name: name } }),
    onSuccess: (res) => {
      saveToken(code, res.participant_token);
      void navigate({ to: "/student/$code", params: { code }, replace: true });
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="font-display text-2xl font-semibold">
        Case<span className="text-primary">Lab</span>
      </p>

      {peek.isLoading && (
        <p className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter aktivitet …
        </p>
      )}

      {peek.data && !peek.data.found && (
        <div className="mt-10">
          <h1 className="font-display text-3xl font-semibold">Koden findes ikke</h1>
          <p className="mt-2 text-muted-foreground">Tjek koden, og prøv igen.</p>
          <Button className="mt-6 h-14 w-full rounded-2xl" onClick={() => void navigate({ to: "/join" })}>
            Prøv en anden kode
          </Button>
        </div>
      )}

      {peek.data?.found && peek.data.status === "ended" && (
        <div className="mt-10">
          <h1 className="font-display text-3xl font-semibold">Aktiviteten er afsluttet</h1>
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

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) join.mutate();
            }}
          >
            <label className="text-base font-medium" htmlFor="student-name">
              Navn
            </label>
            <Input
              id="student-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dit navn"
              className="h-14 rounded-2xl text-base"
            />
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full rounded-2xl text-base"
              disabled={join.isPending || !name.trim()}
            >
              {join.isPending && <Loader2 className="size-4 animate-spin" />} Deltag
            </Button>
            {join.isError && (
              <p className="text-sm text-destructive">{(join.error as Error).message}</p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
