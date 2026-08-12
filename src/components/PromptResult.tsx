import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PromptResult({
  prompt,
  importSearch,
}: {
  prompt: string;
  importSearch?: { lessonId?: string };
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
        <li>Indsæt den i ChatGPT.</li>
        <li>Kopiér hele JSON-svaret.</li>
        <li>Indsæt det under Importér, og gennemgå det.</li>
      </ol>
    </section>
  );
}
