# Isolated pilot integration environment

This setup targets a **dedicated Supabase test project**. It intentionally refuses to run against the Supabase project configured by the app, `supabase/config.toml`, or the explicit production project reference.

## One-time setup

1. Create a separate Supabase project containing no production data.
2. Apply this repository's migrations to that project, including `20260818230000_world_operations_transactional.sql`.
3. Copy `.env.test.example` to `.env.test.local` and add only test-project credentials. The service-role key is used by Node test setup/cleanup only and is never imported by browser code.
4. If the `.invalid` example addresses are rejected by the chosen Auth configuration, use two non-personal test mailboxes. Both addresses must still include `test`.

## Commands

```sh
npm run test:pilot:seed
npm run test:integration
npm run test:pilot:cleanup
```

`test:integration` seeds deterministic fixtures, runs Auth/RLS and live World RPC checks, then removes fixture rows. Set `TEST_KEEP_FIXTURES=true` only when a manual Teacher + Student browser smoke test is about to be run; clean afterwards.

The cleanup code uses exact stable UUIDs **and** the resolved test teacher IDs. It does not use title wildcards. Test Auth users are retained for repeatable login; their owned fixture rows are removed.

## Manual Teacher + Student smoke

With fixtures retained, run the app against the dedicated test project's browser-safe URL/key, sign in as teacher A, open `[TEST] Pilot Sync Test`, start a session, and join from a private browser window. Test activity advance, forced browser-network failure, retry, timer, reveal/facit, rejoin, and finish. Do not claim this runtime flow passed unless both browser instances were actually exercised.

Material storage smoke is intentionally separate: create the private `material-files` bucket in the test project through the repository migration path before uploading a generated, non-personal fixture.
