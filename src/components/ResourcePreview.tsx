import { useState } from "react";
import { ExternalLink, Play, Link2 } from "lucide-react";
import { resourcePreview, type BlockResource } from "@/lib/resources";

/**
 * One reusable resource preview card, shared by the Lesson Editor,
 * the student view and the Teacher Cockpit preview.
 */
export function ResourcePreview({ resource }: { resource: BlockResource }) {
  const info = resourcePreview(resource);
  const [playing, setPlaying] = useState(false);

  // Defensive fallback: an unparsable link must never break the block.
  if (!info) {
    return (
      <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
        <p className="text-sm font-medium">{resource.title || "Materiale"}</p>
        <p className="text-xs text-muted-foreground">Linket kunne ikke åbnes.</p>
      </div>
    );
  }

  const openLabel = info.provider === "youtube" ? "Åbn på YouTube" : "Åbn materiale";

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      {info.provider === "youtube" && (
        <div className="relative aspect-video w-full bg-muted">
          {playing && info.videoId ? (
            <iframe
              className="absolute inset-0 size-full"
              src={`https://www.youtube-nocookie.com/embed/${info.videoId}`}
              title={info.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 size-full"
              aria-label={`Afspil video: ${info.title}`}
            >
              <img
                src={info.thumbnailUrl}
                alt={`Videominiature: ${info.title}`}
                loading="lazy"
                className="size-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-colors group-hover:bg-foreground/30">
                <span className="flex size-14 items-center justify-center rounded-full bg-background/90 shadow-sm">
                  <Play className="size-6 text-foreground" />
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{info.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {info.sourceLabel}
            {info.sourceLabel !== info.domain ? ` · ${info.domain}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {info.provider === "youtube" && !playing && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Play className="size-4" /> Afspil video
            </button>
          )}
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            {openLabel} <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function ResourceList({
  resources,
  label = "Materialer og links",
  className = "",
}: {
  resources: BlockResource[];
  label?: string;
  className?: string;
}) {
  if (!resources.length) return null;
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        <Link2 className="size-3.5" /> {label}
      </p>
      <div className="space-y-2">
        {resources.map((r, i) => (
          <ResourcePreview key={`${r.url}-${i}`} resource={r} />
        ))}
      </div>
    </div>
  );
}
