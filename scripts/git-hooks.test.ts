import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "..");

describe("git hooks", () => {
  it("does not install local hooks from package lifecycle scripts", () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.prepare).toBeUndefined();
    expect(packageJson.scripts?.["hooks:install"]).toBeUndefined();
  });

  it("does not ship a pre-push hook that runs local CI", () => {
    expect(existsSync(join(repoRoot, ".githooks", "pre-push"))).toBe(false);
  });
});
