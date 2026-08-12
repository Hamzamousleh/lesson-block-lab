/** Mirrors the sanitized WorldSessionContext returned by the student server fn. */
export interface WorldSessionContextDTO {
  world_title: string;
  episode_title: string;
  episode_number: number;
  learning_goal: string | null;
  visible_state: { label: string; display: string; value: number | null; max: number | null }[];
  visible_recent_events: { title: string; description: string | null; changes: string[] }[];
}


/**
 * Compact World header for students.
 * Receives only the sanitized WorldSessionContext — no teacher-only state,
 * no consequence or branch rules.
 */
export function StudentWorldHeader({ world }: { world: WorldSessionContextDTO }) {
  return (
    <div className="mb-6 rounded-2xl bg-secondary/70 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {world.world_title}
      </p>
      <p className="mt-0.5 font-medium">
        Episode {world.episode_number} · {world.episode_title}
      </p>
      {world.visible_state.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {world.visible_state.map((s) => (
            <li key={s.label}>
              {s.label} <span className="font-medium text-foreground">{s.display}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Sidst i <World>" recap shown before the student starts the activity. */
export function StudentWorldRecap({ world }: { world: WorldSessionContextDTO }) {
  if (!world.visible_recent_events.length) return null;
  return (
    <div className="mt-8 rounded-2xl border border-border/70 p-5">
      <p className="text-sm font-medium">Sidst i {world.world_title}</p>
      <ul className="mt-3 space-y-3">
        {world.visible_recent_events.map((e, i) => (
          <li key={i} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{e.title}</span>
            {e.description ? ` — ${e.description}` : ""}
            {e.changes.length > 0 && (
              <span className="mt-1 block text-xs">{e.changes.join(" · ")}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
