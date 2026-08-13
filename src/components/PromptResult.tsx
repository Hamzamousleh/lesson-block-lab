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
      toast.success("Prompten er kopieret ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunne ikke kopiere automatisk. Markér teksten og kopiér manuelt.");
    }
  }

  return (
    <section className="surface-card mt-6 space-y-4 p-8">
      <h2 className="text-xl font-semibold">Din prompt</h2>
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
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Kopiér prompt
        </Button>
        <a href="https://chatgpt.com" target="_blank" rel="noreferrer">
          <Button variant="outline" className="rounded-full">
            <ExternalLink className="size-4" /> Åbn ChatGPT
          </Button>
        </a>
        <Link to="/import" search={importSearch ?? {}}>
          <Button variant="outline" className="rounded-full">
            Gå til import
          </Button>
        </Link>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Kopiér prompten.</li>
        <li>Indsæt den i ChatGPT{attachedFiles.length ? " — og vedhæft filerne ovenfor" : ""}.</li>
        <li>Kopiér hele JSON-svaret.</li>
        <li>Indsæt det under Importér, og gennemgå det.</li>
      </ol>
    </section>
  );
}
