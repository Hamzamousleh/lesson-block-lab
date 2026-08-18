import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260818230000_world_operations_transactional.sql",
  import.meta.url,
);
const sql = readFileSync(migrationPath, "utf8");
const consequenceSource = readFileSync(
  new URL("../src/lib/consequences.ts", import.meta.url),
  "utf8",
);
const worldsSource = readFileSync(new URL("../src/lib/worlds.ts", import.meta.url), "utf8");

function body(name) {
  const pattern = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`);
  const match = sql.match(pattern);
  assert.ok(match, `${name} must exist in the migration`);
  return match[0];
}

const applyBody = body("world_apply_consequence");
const releaseBody = body("world_release_consequences");
const rollbackBody = body("world_rollback_event");
const stateBody = body("_world_apply_state_changes");

test("apply success mutates state, status, and history inside one RPC", () => {
  assert.match(applyBody, /_world_apply_state_changes/);
  assert.match(applyBody, /UPDATE public\.world_consequences/);
  assert.match(applyBody, /INSERT INTO public\.world_events/);
  assert.ok(
    applyBody.indexOf("_world_apply_state_changes") <
      applyBody.lastIndexOf("INSERT INTO public.world_events"),
  );
});

test("apply failure after a logical state write rolls back the whole PostgreSQL statement", () => {
  assert.match(applyBody, /LANGUAGE plpgsql/);
  assert.doesNotMatch(applyBody, /\bEXCEPTION\s+WHEN\b/);
  assert.match(stateBody, /RAISE EXCEPTION/);
});

test("duplicate apply is serialized and returns without applying twice", () => {
  assert.match(applyBody, /FOR UPDATE OF wc/);
  assert.match(applyBody, /status IN \('applied', 'pending'\)/);
  assert.match(applyBody, /'duplicate', true/);
});

test("delayed release applies state, status, and event in one RPC", () => {
  assert.match(releaseBody, /_world_apply_state_changes/);
  assert.match(releaseBody, /SET status = 'applied'/);
  assert.match(releaseBody, /'delayed_consequence'/);
  assert.match(releaseBody, /INSERT INTO public\.world_events/);
});

test("duplicate release skips consequences already applied", () => {
  assert.match(releaseBody, /IF v_consequence\.status = 'applied' THEN[\s\S]*CONTINUE/);
  assert.match(releaseBody, /ORDER BY wc\.id[\s\S]*FOR UPDATE/);
  assert.match(releaseBody, /'duplicate', v_changed = 0/);
});

test("rollback restores recorded before snapshots and logs the reversal", () => {
  assert.match(rollbackBody, /SET value = v_change->'before'/);
  assert.match(rollbackBody, /SET reverted_at = now\(\)/);
  assert.match(rollbackBody, /'rollback'/);
  assert.match(rollbackBody, /v_reversed/);
});

test("unsafe rollback fails instead of partially overwriting newer state", () => {
  assert.match(rollbackBody, /value IS DISTINCT FROM v_change->'after'/);
  assert.match(rollbackBody, /Rollback er ikke sikker/);
  assert.doesNotMatch(rollbackBody, /\bEXCEPTION\s+WHEN\b/);
});

test("cross-tenant and public callers are rejected", () => {
  for (const rpcBody of [applyBody, releaseBody, rollbackBody]) {
    assert.match(rpcBody, /auth\.uid\(\)/);
    assert.match(rpcBody, /teacher_id = v_teacher_id/);
  }
  assert.match(applyBody, /world_id = v_consequence\.world_id[\s\S]*teacher_id = v_teacher_id/);
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.world_apply_consequence[\s\S]*FROM PUBLIC, anon/,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.world_apply_consequence[\s\S]*TO authenticated/,
  );
});

test("state keys, operations, and data types are validated server-side", () => {
  assert.match(stateBody, /state_key IN/);
  assert.match(stateBody, /'set', 'increase', 'decrease', 'enum_change', 'boolean_toggle'/);
  assert.match(stateBody, /jsonb_typeof/);
  assert.match(stateBody, /enum_options/);
});

test("concurrent increments lock state deterministically and read the locked current value", () => {
  assert.match(stateBody, /ORDER BY ws\.state_key[\s\S]*FOR UPDATE/);
  assert.match(stateBody, /v_current := \(v_state\.value #>> '\{\}'\)::numeric/);
  assert.match(stateBody, /v_current := v_current \+ v_amount/);
  assert.match(stateBody, /v_current := v_current - v_amount/);
});

test("history cannot be written by legacy multi-step consequence callers", () => {
  assert.doesNotMatch(
    consequenceSource,
    /updateStateVar|updateConsequence|logEvent|markEventReverted/,
  );
  assert.match(consequenceSource, /applyWorldConsequence/);
  assert.match(consequenceSource, /releaseWorldConsequences/);
  assert.match(consequenceSource, /rollbackWorldEvent/);
  assert.match(worldsSource, /rpc\("world_apply_consequence"/);
  assert.match(worldsSource, /rpc\("world_release_consequences"/);
  assert.match(worldsSource, /rpc\("world_rollback_event"/);
});

test("RPC helpers are not executable by browser roles", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\._world_apply_state_changes[\s\S]*FROM PUBLIC, anon, authenticated/,
  );
  assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\._world_apply_state_changes/);
});
