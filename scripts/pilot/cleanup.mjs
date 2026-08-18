import { clients, cleanupFixtures } from "./database.mjs";

const { env, admin } = clients();
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (users.error) throw users.error;
const byEmail = new Map(users.data.users.map((user) => [user.email?.toLowerCase(), user.id]));
await cleanupFixtures(admin, {
  teacherA: byEmail.get(env.TEST_TEACHER_A_EMAIL.toLowerCase()),
  teacherB: byEmail.get(env.TEST_TEACHER_B_EMAIL.toLowerCase()),
});
console.log("Pilot fixture rows cleaned; reusable test auth users were retained.");
