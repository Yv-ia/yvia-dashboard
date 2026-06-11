import { chmodSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const hooksDir = join(projectRoot, ".githooks");
const prePushHook = join(hooksDir, "pre-push");

if (!existsSync(prePushHook)) {
  console.warn("Hook pre-push introuvable, installation ignoree.");
  process.exit(0);
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function readGit(args) {
  return spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

const gitProbe = readGit(["rev-parse", "--git-dir"]);

if (gitProbe.status !== 0) {
  process.exit(0);
}

const worktreeConfigEnabled = readGit(["config", "--get", "extensions.worktreeConfig"]).stdout.trim() === "true";
const configScope = worktreeConfigEnabled ? "--worktree" : "--local";
const commonRepoIsBare = readGit(["config", "--get", "core.bare"]).stdout.trim() === "true";

if (worktreeConfigEnabled && commonRepoIsBare) {
  runGit(["config", "--worktree", "core.bare", "false"]);
}

chmodSync(prePushHook, 0o755);

const config = spawnSync("git", ["config", configScope, "core.hooksPath", ".githooks"], {
  cwd: projectRoot,
  encoding: "utf8",
  stdio: "inherit",
});

if (config.status !== 0) {
  process.exit(config.status ?? 1);
}

console.log("Git hooks installes depuis .githooks.");
