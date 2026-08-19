import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PromptResult({
  prompt,
  importSearch,
  attachedFiles = [],
}: {
  prompt: string;
  importSearch?: { lessonId?: string };
  attachedFiles?: string[];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Klar til ChatGPT ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunne ikke kopiere automatisk. Markér teksten og kopiér manuelt.");
    }
  }

  return (
    <section className="surface-quiet mt-8 space-y-4 p-8">
      <div>
        <h2 className="text-xl font-semibold">Klar til ChatGPT</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Didaktiva har klargjort instruktionen, men har ikke sendt noget. Du vælger selv, hvad du
          kopierer til ChatGPT.
        </p>
      </div>
      {attachedFiles.length > 0 && (
        <div className="rounded-xl border border-primary/40 bg-accent p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Paperclip className="size-4" /> Husk at vedhæfte disse filer i ChatGPT
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {attachedFiles.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <Textarea readOnly value={prompt} className="min-h-64 rounded-xl font-mono text-xs" />
      <div className="flex flex-wrap gap-3">
        <Button className="rounded-full" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Kopiér til ChatGPT
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <a href="https://chatgpt.com" target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" /> Åbn ChatGPT
          </a>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/import" search={importSearch ?? {}}>
            Gå til import
          </Link>
        </Button>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Kopiér instruktionen, og åbn ChatGPT.</li>
        <li>Indsæt den{attachedFiles.length ? " — og vedhæft selv filerne ovenfor" : ""}.</li>
        <li>Kopiér hele svaret fra ChatGPT.</li>
        <li>Gå til Importér fra ChatGPT, indsæt svaret, og gennemgå lektionen.</li>
      </ol>
    </section>
  );
}
