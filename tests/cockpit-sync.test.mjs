import assert from "node:assert/strict";
import test from "node:test";
import { CockpitSyncCoordinator } from "../src/lib/cockpit-sync.ts";

function setup() {
  const states = [];
  const coordinator = new CockpitSyncCoordinator((state) => states.push(state));
  return { coordinator, states };
}

test("successful activity advance applies the server-confirmed activity", async () => {
  const { coordinator, states } = setup();
  let teacherActivity = "A";
  const result = await coordinator.run({
    label: "Aktivitet",
    execute: async () => ({ current_block_id: "B" }),
    confirm: (session) => {
      teacherActivity = session.current_block_id;
    },
  });

  assert.equal(result, true);
  assert.equal(teacherActivity, "B");
  assert.deepEqual(
    states.map((state) => state.phase),
    ["pending", "synced"],
  );
});

test("failed activity advance leaves the confirmed activity unchanged", async () => {
  const { coordinator, states } = setup();
  let teacherActivity = "A";
  const result = await coordinator.run({
    label: "Aktivitet",
    execute: async () => {
      throw new Error("network failed");
    },
    confirm: (session) => {
      teacherActivity = session.current_block_id;
    },
  });

  assert.equal(result, false);
  assert.equal(teacherActivity, "A");
  assert.equal(states.at(-1).phase, "error");
  assert.equal(coordinator.canRetry, true);
});

test("retry applies an activity after the failed request succeeds", async () => {
  const { coordinator, states } = setup();
  let attempts = 0;
  let teacherActivity = "A";
  await coordinator.run({
    label: "Aktivitet",
    execute: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return { current_block_id: "B" };
    },
    confirm: (session) => {
      teacherActivity = session.current_block_id;
    },
  });

  const retried = await coordinator.retry();
  assert.equal(retried, true);
  assert.equal(attempts, 2);
  assert.equal(teacherActivity, "B");
  assert.deepEqual(
    states.map((state) => state.phase),
    ["pending", "error", "pending", "synced"],
  );
});

test("successful timer mutation uses the server-confirmed timer", async () => {
  const { coordinator } = setup();
  let timer = { timer_ends_at: null, timer_remaining_seconds: 300 };
  await coordinator.run({
    label: "Timer",
    execute: async () => ({
      timer_ends_at: "2026-08-18T10:05:00.000Z",
      timer_remaining_seconds: 300,
    }),
    confirm: (session) => {
      timer = session;
    },
  });

  assert.equal(timer.timer_ends_at, "2026-08-18T10:05:00.000Z");
  assert.equal(timer.timer_remaining_seconds, 300);
});

test("failed timer mutation does not apply the requested timer", async () => {
  const { coordinator } = setup();
  const originalTimer = { timer_ends_at: null, timer_remaining_seconds: 300 };
  let timer = originalTimer;
  const result = await coordinator.run({
    label: "Timer",
    execute: async () => {
      throw new Error("timeout");
    },
    confirm: (session) => {
      timer = session;
    },
  });

  assert.equal(result, false);
  assert.equal(timer, originalTimer);
});

test("failed reveal mutation does not expose results or answer key", async () => {
  const { coordinator } = setup();
  let reveal = { reveal_results: false, reveal_answer_key: false };
  await coordinator.run({
    label: "Facit",
    execute: async () => {
      throw new Error("forbidden");
    },
    confirm: (session) => {
      reveal = session;
    },
  });

  assert.deepEqual(reveal, { reveal_results: false, reveal_answer_key: false });
});

test("rapid duplicate mutations are rejected while the first is pending", async () => {
  const { coordinator } = setup();
  let resolveRequest;
  let requests = 0;
  const first = coordinator.run({
    label: "Aktivitet",
    execute: () => {
      requests += 1;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    },
    confirm: () => undefined,
  });
  const duplicate = await coordinator.run({
    label: "Aktivitet",
    execute: async () => {
      requests += 1;
      return {};
    },
    confirm: () => undefined,
  });

  assert.equal(duplicate, false);
  assert.equal(requests, 1);
  resolveRequest({});
  assert.equal(await first, true);
});
