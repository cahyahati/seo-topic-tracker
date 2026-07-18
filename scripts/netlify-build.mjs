import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

if (process.env.CONTEXT === "production") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL wajib tersedia untuk menerapkan skema production.");
  }
  run(process.execPath, [prismaCli, "db", "push"]);
}

run(process.execPath, [prismaCli, "generate"]);
run(process.execPath, [nextCli, "build"]);
