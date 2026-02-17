import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (typeof result.status !== "number") {
    throw new Error(`Failed to run: ${command} ${args.join(" ")}`);
  }

  return result.status;
}

function getInstalledVersion(pkgName) {
  try {
    return require(`${pkgName}/package.json`).version;
  } catch {
    return null;
  }
}

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const wantedClient = packageJson.dependencies?.["@prisma/client"];
const wantedPrisma = packageJson.devDependencies?.prisma;

const installedClient = getInstalledVersion("@prisma/client");
const installedPrisma = getInstalledVersion("prisma");

if (!wantedClient || !wantedPrisma) {
  console.error("Missing prisma/@prisma/client versions in package.json");
  process.exit(1);
}

if (installedClient !== wantedClient || installedPrisma !== wantedPrisma) {
  console.log(
    `Prisma package mismatch detected (installed prisma=${installedPrisma}, @prisma/client=${installedClient}; expected prisma=${wantedPrisma}, @prisma/client=${wantedClient}).`
  );
  console.log("Reinstalling exact Prisma versions...");
  const installStatus = run("npm", [
    "install",
    "--save-exact",
    `prisma@${wantedPrisma}`,
    `@prisma/client@${wantedClient}`
  ]);

  if (installStatus !== 0) {
    console.warn(
      "Warning: exact Prisma reinstall failed; continuing with currently installed versions."
    );
  }
}

let status = run("npx", ["prisma", "generate"]);
if (status === 0) {
  process.exit(0);
}

console.log("Prisma generate failed. Rebuilding Prisma packages and retrying once...");
const rebuildStatus = run("npm", ["rebuild", "prisma", "@prisma/client", "--foreground-scripts"]);
if (rebuildStatus !== 0) {
  process.exit(rebuildStatus);
}

status = run("npx", ["prisma", "generate"]);
process.exit(status);
