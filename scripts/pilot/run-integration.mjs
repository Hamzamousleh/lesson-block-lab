import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { clients, cleanupFixtures, must, resetWorldA, seedFixtures } from "./database.mjs";
import { IDS } from "./fixtures.mjs";

const { env, admin, anon } = clients();
let teachers;
let passed = 0;

async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

async function signIn(email, password) {
  const client = anon();
  const data = must(await client.auth.signInWithPassword({ email, password }), "test login");
  assert.ok(data.session?.access_token);
  return client;
}

async function expectRpcError(promise, pattern = /./) {
  const result = await promise;
  assert.ok(result.error, "RPC unexpectedly succeeded");
  assert.match(result.error.message, pattern);
}

async function stateValue(key) {
  const data = must(
    await admin
      .from("world_state")
      .select("value")
      .eq("world_id", IDS.worldA)
      .eq("state_key", key)
      .single(),
    `read ${key}`,
  );
  return data.value;
}

async function consequenceStatus(id) {
  const data = must(
    await admin.from("world_consequences").select("status").eq("id", id).single(),
    "read consequence status",
  );
  return data.status;
}

const changes = {
  trust2: [{ state_key: "trust", operation: "increase", amount: 2 }],
  trust3: [{ state_key: "trust", operation: "increase", amount: 3 }],
  pressure1: [{ state_key: "pressure", operation: "decrease", amount: 1 }],
};

try {
  teachers = await seedFixtures(admin, env);
  const teacherA = await signIn(env.TEST_TEACHER_A_EMAIL, env.TEST_TEACHER_A_PASSWORD);
  const teacherB = await signIn(env.TEST_TEACHER_B_EMAIL, env.TEST_TEACHER_B_PASSWORD);

  await check("auth login and session persistence", async () => {
    const session = must(await teacherA.auth.getSession(), "get auth session");
    assert.equal(session.session?.user.id, teachers.teacherA);
    must(await teacherA.auth.signOut(), "logout");
    const afterLogout = must(await teacherA.auth.getSession(), "get logged-out session");
    assert.equal(afterLogout.session, null);
  });
  const teacherA2 = await signIn(env.TEST_TEACHER_A_EMAIL, env.TEST_TEACHER_A_PASSWORD);

  await check("tenant RLS read isolation", async () => {
    const aSeesB = must(
      await teacherA2.from("worlds").select("id").eq("id", IDS.worldB),
      "teacher A reads tenant B",
    );
    const bSeesA = must(
      await teacherB.from("worlds").select("id").eq("id", IDS.worldA),
      "teacher B reads tenant A",
    );
    assert.deepEqual(aSeesB, []);
    assert.deepEqual(bSeesA, []);
  });

  await check("apply consequence and duplicate apply", async () => {
    await resetWorldA(admin, teachers.teacherA);
    const first = must(
      await teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "pilot apply",
      }),
      "apply consequence",
    );
    assert.equal(first.duplicate, false);
    assert.equal(await stateValue("trust"), 7);
    const duplicate = must(
      await teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "duplicate",
      }),
      "duplicate apply",
    );
    assert.equal(duplicate.duplicate, true);
    assert.equal(await stateValue("trust"), 7);
  });

  await check("mid-operation failure rolls back all writes", async () => {
    await resetWorldA(admin, teachers.teacherA);
    await expectRpcError(
      teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceFailure,
        p_changes: [changes.trust2[0], { state_key: "status", operation: "increase", amount: 1 }],
        p_reason_text: "controlled test-only invalid second operation",
      }),
      /talvariabel|ugyldig|kræver/i,
    );
    assert.equal(await stateValue("trust"), 5);
    assert.equal(await consequenceStatus(IDS.consequenceFailure), "idle");
    const events = must(
      await admin.from("world_events").select("id").eq("consequence_id", IDS.consequenceFailure),
      "read failure events",
    );
    assert.equal(events.length, 0);
  });

  await check("delayed release and duplicate release", async () => {
    await resetWorldA(admin, teachers.teacherA);
    const scheduled = must(
      await teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceB,
        p_changes: changes.pressure1,
        p_reason_text: "schedule",
      }),
      "schedule delayed consequence",
    );
    assert.equal(scheduled.deferred, true);
    assert.equal(await stateValue("pressure"), 0);
    const released = must(
      await teacherA2.rpc("world_release_consequences", {
        p_consequence_ids: [IDS.consequenceB],
        p_episode_id: IDS.episodeA2,
      }),
      "release consequence",
    );
    assert.equal(released.duplicate, false);
    assert.equal(await stateValue("pressure"), -1);
    const duplicate = must(
      await teacherA2.rpc("world_release_consequences", {
        p_consequence_ids: [IDS.consequenceB],
        p_episode_id: IDS.episodeA2,
      }),
      "duplicate release",
    );
    assert.equal(duplicate.duplicate, true);
    assert.equal(await stateValue("pressure"), -1);
  });

  await check("rollback and duplicate rollback", async () => {
    await resetWorldA(admin, teachers.teacherA);
    const applied = must(
      await teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "rollback source",
      }),
      "apply rollback source",
    );
    const rolledBack = must(
      await teacherA2.rpc("world_rollback_event", { p_event_id: applied.event.id }),
      "rollback event",
    );
    assert.equal(rolledBack.duplicate, false);
    assert.equal(await stateValue("trust"), 5);
    const duplicate = must(
      await teacherA2.rpc("world_rollback_event", { p_event_id: applied.event.id }),
      "duplicate rollback",
    );
    assert.equal(duplicate.duplicate, true);
    assert.equal(await stateValue("trust"), 5);
  });

  await check("unsafe rollback is rejected", async () => {
    await resetWorldA(admin, teachers.teacherA);
    const applied = must(
      await teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "older",
      }),
      "apply older event",
    );
    must(
      await teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceConcurrentA,
        p_changes: changes.trust2,
        p_reason_text: "newer",
      }),
      "apply newer event",
    );
    await expectRpcError(
      teacherA2.rpc("world_rollback_event", { p_event_id: applied.event.id }),
      /ikke sikker|ændret/i,
    );
    assert.equal(await stateValue("trust"), 9);
  });

  await check("concurrent increments avoid lost updates", async () => {
    await resetWorldA(admin, teachers.teacherA);
    const [a, b] = await Promise.all([
      teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceConcurrentA,
        p_changes: changes.trust2,
        p_reason_text: "concurrent A",
      }),
      teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceConcurrentB,
        p_changes: changes.trust3,
        p_reason_text: "concurrent B",
      }),
    ]);
    must(a, "concurrent A");
    must(b, "concurrent B");
    assert.equal(await stateValue("trust"), 10);
  });

  await check("concurrent duplicate request applies once", async () => {
    await resetWorldA(admin, teachers.teacherA);
    const results = await Promise.all([
      teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "same A",
      }),
      teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "same B",
      }),
    ]);
    results.forEach((result, index) => must(result, `duplicate request ${index}`));
    assert.equal(await stateValue("trust"), 7);
    assert.equal(results.filter((result) => result.data.duplicate).length, 1);
  });

  await check("World RPC ownership and anonymous access", async () => {
    await expectRpcError(
      teacherA2.rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceBPrivate,
        p_changes: [{ state_key: "trust", operation: "increase", amount: 9 }],
        p_reason_text: "cross tenant",
      }),
      /ikke fundet|dit World|permission/i,
    );
    await expectRpcError(
      anon().rpc("world_apply_consequence", {
        p_consequence_id: IDS.consequenceA,
        p_changes: changes.trust2,
        p_reason_text: "anon",
      }),
      /permission|not logged|logget ind|function/i,
    );
  });

  await check("invalid state key, datatype, and operation are rejected", async () => {
    for (const invalid of [
      [{ state_key: "unknown", operation: "increase", amount: 1 }],
      [{ state_key: "trust", operation: "increase", amount: "wrong" }],
      [{ state_key: "trust", operation: "execute_sql", amount: 1 }],
    ]) {
      await resetWorldA(admin, teachers.teacherA);
      await expectRpcError(
        teacherA2.rpc("world_apply_consequence", {
          p_consequence_id: IDS.consequenceFailure,
          p_changes: invalid,
          p_reason_text: "invalid input",
        }),
      );
      assert.equal(await stateValue("trust"), 5);
    }
  });

  await check("service role is absent from browser source", async () => {
    const sourceFiles = [];
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(target);
        else sourceFiles.push(target);
      });
    walk(path.join(process.cwd(), "src"));
    const violations = sourceFiles.filter((file) => {
      if (file.endsWith(".server.ts") || file.endsWith(".server.tsx")) return false;
      return /SUPABASE_SERVICE_ROLE_KEY|TEST_SUPABASE_SERVICE_ROLE_KEY/.test(
        fs.readFileSync(file, "utf8"),
      );
    });
    assert.deepEqual(violations, []);
    assert.equal(
      Object.keys(env).some((key) => key.startsWith("VITE_") && key.includes("SERVICE_ROLE")),
      false,
    );
  });

  console.log(`Pilot database integration: ${passed} checks passed.`);
} finally {
  if (teachers && env.TEST_KEEP_FIXTURES !== "true") {
    await cleanupFixtures(admin, teachers);
    console.log("Pilot fixture rows cleaned after run.");
  }
}
