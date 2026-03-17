import type { WorktreeInfo } from "../../types.js";

import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => {
  class MarkdownString {
    value: string;
    isTrusted: boolean | undefined;
    constructor(value: string) {
      this.value = value;
    }
  }
  return { MarkdownString };
});

vi.mock("node:os", () => ({
  homedir: () => "/Users/v",
}));

vi.mock("node:fs", () => ({
  realpathSync: (p: string) => p,
}));

const { buildTooltip } = await import("../tooltip.js");

function makeWorktreeInfo(overrides?: Partial<WorktreeInfo>): WorktreeInfo {
  return {
    name: "wt-hotfix",
    path: "/tmp/wt-hotfix",
    head: "abc12345def67890",
    branch: "hotfix/login",
    isDetached: false,
    isCurrent: false,
    isMain: false,
    isPrunable: false,
    ...overrides,
  };
}

describe("buildTooltip", () => {
  it("renders normal (non-prunable) tooltip", () => {
    const md = buildTooltip({
      isCurrent: true,
      type: "Worktree",
      path: "/tmp/wt-hotfix",
      worktreeInfo: makeWorktreeInfo(),
    });
    const value = (md as any).value as string;
    expect(value).toContain("● Current");
    expect(value).toContain("**Type:** Worktree");
    expect(value).toContain("**Path:** `/tmp/wt-hotfix`");
    expect(value).toContain("**Branch:** `hotfix/login`");
    expect(value).toContain("**Commit:** `abc12345`");
    expect(value).not.toContain("Prunable");
    expect(value).not.toContain("Expected path");
    expect(value).not.toContain("Config");
  });

  it("renders prunable tooltip with header, expected path, and config", () => {
    const md = buildTooltip({
      isCurrent: false,
      type: "Worktree",
      path: "/tmp/wt-hotfix",
      worktreeInfo: makeWorktreeInfo({
        isPrunable: true,
        configPath: "/Users/v/repo/main/.git/worktrees/wt-hotfix",
      }),
    });
    const value = (md as any).value as string;
    expect(value).toContain("⚠ **Prunable Worktree**");
    expect(value).not.toContain("● Current");
    expect(value).not.toContain("**Type:**");
    expect(value).toContain("**Expected path:** `/tmp/wt-hotfix`");
    expect(value).toContain("**Branch:** `hotfix/login`");
    expect(value).toContain("**Config:** `~/r/m/.git/worktrees/wt-hotfix`");
    expect(value).toContain("⚠ Directory missing — run Prune to clean up");
  });

  it("renders prunable tooltip without config when configPath is undefined", () => {
    const md = buildTooltip({
      isCurrent: false,
      type: "Worktree",
      path: "/tmp/wt-hotfix",
      worktreeInfo: makeWorktreeInfo({ isPrunable: true }),
    });
    const value = (md as any).value as string;
    expect(value).toContain("⚠ **Prunable Worktree**");
    expect(value).toContain("**Expected path:**");
    expect(value).not.toContain("**Config:**");
    expect(value).toContain("⚠ Directory missing");
  });

  it("renders detached HEAD in tooltip", () => {
    const md = buildTooltip({
      isCurrent: false,
      type: "Worktree",
      path: "/tmp/wt-detached",
      worktreeInfo: makeWorktreeInfo({ isDetached: true, branch: undefined }),
    });
    const value = (md as any).value as string;
    expect(value).toContain("**HEAD:** detached");
  });
});
