import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const repoRoot = join(import.meta.dirname, "..");

function cleanGitEnv(extraEnv: Record<string, string | undefined> = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) delete env[key];
  }
  return { ...env, ...extraEnv };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

function makeTempRepo() {
  const projectDir = mkdtempSync(join(tmpdir(), "git-hooks-"));
  tempDirs.push(projectDir);
  mkdirSync(join(projectDir, "scripts"));
  mkdirSync(join(projectDir, ".githooks"));

  const init = spawnSync("git", ["init"], {
    cwd: projectDir,
    encoding: "utf8",
    env: cleanGitEnv(),
  });
  expect(init.status, `${init.stdout}\n${init.stderr}`).toBe(0);

  cpSync(join(repoRoot, "scripts", "install-git-hooks.mjs"), join(projectDir, "scripts", "install-git-hooks.mjs"));
  cpSync(join(repoRoot, ".githooks", "pre-push"), join(projectDir, ".githooks", "pre-push"));

  return projectDir;
}

function writeFakeNpm(binDir: string, exitCode: number) {
  const logPath = join(binDir, "npm.log");
  const npmPath = join(binDir, "npm");
  writeFileSync(
    npmPath,
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "${logPath}"
exit ${exitCode}
`
  );
  chmodSync(npmPath, 0o755);
  return logPath;
}

function runGit(cwd: string, args: string[]) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: cleanGitEnv(),
  });
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  return result;
}

describe.sequential("git hooks", () => {
  it("installs the versioned hooks path for the repository", () => {
    const projectDir = makeTempRepo();

    const result = spawnSync(process.execPath, ["scripts/install-git-hooks.mjs"], {
      cwd: projectDir,
      encoding: "utf8",
      env: cleanGitEnv(),
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);

    const configuredPath = spawnSync("git", ["config", "--get", "core.hooksPath"], {
      cwd: projectDir,
      encoding: "utf8",
      env: cleanGitEnv(),
    });
    expect(configuredPath.stdout.trim()).toBe(".githooks");
    expect(statSync(join(projectDir, ".githooks", "pre-push")).mode & 0o111).not.toBe(0);
  });

  it("runs the local CI verification before push", () => {
    const projectDir = makeTempRepo();
    const binDir = join(projectDir, "bin");
    mkdirSync(binDir);
    const npmLog = writeFakeNpm(binDir, 0);

    const result = spawnSync(".githooks/pre-push", {
      cwd: projectDir,
      encoding: "utf8",
      env: cleanGitEnv({ PATH: `${binDir}:${process.env.PATH ?? ""}` }),
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(readFileSync(npmLog, "utf8")).toBe("run verify:ci\n");
  });

  it("blocks the push when local CI verification fails", () => {
    const projectDir = makeTempRepo();
    const binDir = join(projectDir, "bin");
    mkdirSync(binDir);
    const npmLog = writeFakeNpm(binDir, 17);

    const result = spawnSync(".githooks/pre-push", {
      cwd: projectDir,
      encoding: "utf8",
      env: cleanGitEnv({ PATH: `${binDir}:${process.env.PATH ?? ""}` }),
    });

    expect(result.status).toBe(17);
    expect(readFileSync(npmLog, "utf8")).toBe("run verify:ci\n");
  });

  it("configures hooks in the worktree config when the common repository is bare", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "git-hooks-worktree-"));
    tempDirs.push(projectDir);

    const sourceDir = join(projectDir, "source");
    mkdirSync(sourceDir);
    runGit(sourceDir, ["init", "--initial-branch=main"]);
    writeFileSync(join(sourceDir, "README.md"), "test\n");
    runGit(sourceDir, ["add", "README.md"]);
    runGit(sourceDir, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Initial commit"]);

    const bareDir = join(projectDir, "repo.git");
    runGit(projectDir, ["clone", "--bare", sourceDir, bareDir]);
    runGit(projectDir, ["--git-dir", bareDir, "config", "extensions.worktreeConfig", "true"]);

    const worktreeDir = join(projectDir, "workspace");
    runGit(projectDir, ["--git-dir", bareDir, "worktree", "add", worktreeDir, "main"]);
    mkdirSync(join(worktreeDir, "scripts"));
    mkdirSync(join(worktreeDir, ".githooks"));
    cpSync(join(repoRoot, "scripts", "install-git-hooks.mjs"), join(worktreeDir, "scripts", "install-git-hooks.mjs"));
    cpSync(join(repoRoot, ".githooks", "pre-push"), join(worktreeDir, ".githooks", "pre-push"));

    const result = spawnSync(process.execPath, ["scripts/install-git-hooks.mjs"], {
      cwd: worktreeDir,
      encoding: "utf8",
      env: cleanGitEnv(),
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(
      spawnSync("git", ["--git-dir", bareDir, "config", "--get", "core.hooksPath"], {
        encoding: "utf8",
        env: cleanGitEnv(),
      }).stdout
    ).toBe("");
    expect(runGit(worktreeDir, ["config", "--worktree", "--get", "core.hooksPath"]).stdout.trim()).toBe(".githooks");
    expect(runGit(worktreeDir, ["config", "--worktree", "--get", "core.bare"]).stdout.trim()).toBe("false");
    runGit(worktreeDir, ["status", "--short"]);
  });
});
