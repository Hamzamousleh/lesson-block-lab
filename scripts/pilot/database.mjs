import { createClient } from "@supabase/supabase-js";
import { loadPilotEnvironment } from "./env.mjs";
import { ALL_WORLD_A_CONSEQUENCES, IDS, teacherFixtures } from "./fixtures.mjs";

export function clients(root = process.cwd()) {
  const env = loadPilotEnvironment(root);
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };
  return {
    env,
    admin: createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_SERVICE_ROLE_KEY, options),
    anon: () => createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_ANON_KEY, options),
  };
}

function must(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

async function findOrCreateUser(admin, email, password, label) {
  for (let page = 1; page <= 10; page += 1) {
    const data = must(await admin.auth.admin.listUsers({ page, perPage: 100 }), `list ${label}`);
    const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      must(
        await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: { display_name: `[TEST] ${label}` },
        }),
        `update ${label}`,
      );
      return existing.id;
    }
    if (data.users.length < 100) break;
  }
  const data = must(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `[TEST] ${label}` },
    }),
    `create ${label}`,
  );
  return data.user.id;
}

async function upsert(admin, table, rows) {
  must(await admin.from(table).upsert(rows, { onConflict: "id" }), `seed ${table}`);
}

export async function cleanupFixtures(admin, teacherIds = {}) {
  const pairs = [
    [teacherIds.teacherA, IDS.worldA],
    [teacherIds.teacherB, IDS.worldB],
  ];
  for (const [teacherId, worldId] of pairs) {
    if (!teacherId) continue;
    must(
      await admin.from("world_events").delete().eq("teacher_id", teacherId).eq("world_id", worldId),
      "cleanup world_events",
    );
    must(
      await admin.from("worlds").delete().eq("teacher_id", teacherId).eq("id", worldId),
      "cleanup worlds",
    );
  }
  if (teacherIds.teacherA) {
    must(
      await admin
        .from("classes")
        .delete()
        .eq("teacher_id", teacherIds.teacherA)
        .eq("id", IDS.classA),
      "cleanup teacher A class",
    );
  }
  if (teacherIds.teacherB) {
    must(
      await admin
        .from("classes")
        .delete()
        .eq("teacher_id", teacherIds.teacherB)
        .eq("id", IDS.classB),
      "cleanup teacher B class",
    );
  }
}

export async function seedFixtures(admin, env) {
  const teacherA = await findOrCreateUser(
    admin,
    env.TEST_TEACHER_A_EMAIL,
    env.TEST_TEACHER_A_PASSWORD,
    "Pilot Teacher A",
  );
  const teacherB = await findOrCreateUser(
    admin,
    env.TEST_TEACHER_B_EMAIL,
    env.TEST_TEACHER_B_PASSWORD,
    "Pilot Teacher B",
  );
  await cleanupFixtures(admin, { teacherA, teacherB });
  const fixtures = teacherFixtures(teacherA, teacherB);
  await upsert(admin, "classes", fixtures.classes);
  await upsert(admin, "units", fixtures.units);
  await upsert(admin, "lessons", fixtures.lessons);
  await upsert(admin, "lesson_blocks", fixtures.blocks);
  await upsert(admin, "worlds", fixtures.worlds);
  await upsert(admin, "world_episodes", fixtures.episodes);
  await upsert(admin, "world_state", fixtures.states);
  await upsert(admin, "world_consequences", fixtures.consequences);
  return { teacherA, teacherB };
}

export async function resetWorldA(admin, teacherA) {
  must(
    await admin.from("world_events").delete().eq("teacher_id", teacherA).eq("world_id", IDS.worldA),
    "reset events",
  );
  must(
    await admin
      .from("world_consequences")
      .update({ status: "idle", pending_changes: null, applied_at: null })
      .eq("teacher_id", teacherA)
      .in("id", ALL_WORLD_A_CONSEQUENCES),
    "reset consequences",
  );
  const values = [
    [IDS.stateTrust, 5],
    [IDS.statePressure, 0],
    [IDS.stateStatus, "normal"],
    [IDS.stateUnlocked, false],
  ];
  for (const [id, value] of values) {
    must(
      await admin.from("world_state").update({ value }).eq("teacher_id", teacherA).eq("id", id),
      `reset state ${id}`,
    );
  }
}

export { must };
