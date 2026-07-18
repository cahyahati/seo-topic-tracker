import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

if (process.env.CONTEXT === "production") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL wajib tersedia untuk menerapkan skema production.");
  }
  run(npxCommand, ["prisma", "db", "push"]);
}

run(npmCommand, ["run", "build"]);
