import { clients, seedFixtures } from "./database.mjs";

const { env, admin } = clients();
await seedFixtures(admin, env);
console.log("Pilot fixtures seeded in the guarded dedicated test project.");
