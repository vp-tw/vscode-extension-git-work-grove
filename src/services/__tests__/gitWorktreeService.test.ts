import { describe, expect, it, vi } from "vitest";

// Mock vscode before importing module under test
vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: [],
  },
}));

const { parseWorktreeListPorcelain } = await import("../gitWorktreeService.js");

describe("parseWorktreeListPorcelain", () => {
  it("parses normal worktrees", () => {
    const output = [
      "worktree /Users/v/repo/myproject",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      "",
      "worktree /Users/v/wt/auth",
      "HEAD def5678901234",
      "branch refs/heads/feature/auth",
    ].join("\n");

    const result = parseWorktreeListPorcelain(output);

    expect(result).toEqual([
      {
        name: "",
        path: "/Users/v/repo/myproject",
        head: "abc1234567890",
        branch: "main",
        isDetached: false,
        isPrunable: false,
      },
      {
        name: "",
        path: "/Users/v/wt/auth",
        head: "def5678901234",
        branch: "feature/auth",
        isDetached: false,
        isPrunable: false,
      },
    ]);
  });

  it("parses detached HEAD worktree", () => {
    const output = [
      "worktree /Users/v/wt/experiment",
      "HEAD 789abcdef0123",
      "detached",
    ].join("\n");

    const result = parseWorktreeListPorcelain(output);

    expect(result).toEqual([
      {
        name: "",
        path: "/Users/v/wt/experiment",
        head: "789abcdef0123",
        branch: undefined,
        isDetached: true,
        isPrunable: false,
      },
    ]);
  });

  it("parses prunable worktree", () => {
    const output = [
      "worktree /Users/v/wt/gone",
      "HEAD aaa111222333",
      "branch refs/heads/gone-branch",
      "prunable",
    ].join("\n");

    const result = parseWorktreeListPorcelain(output);

    expect(result).toEqual([
      {
        name: "",
        path: "/Users/v/wt/gone",
        head: "aaa111222333",
        branch: "gone-branch",
        isDetached: false,
        isPrunable: true,
      },
    ]);
  });

  it("returns empty array for empty output", () => {
    expect(parseWorktreeListPorcelain("")).toEqual([]);
    expect(parseWorktreeListPorcelain("  \n  ")).toEqual([]);
  });

  it("parses multiple worktrees with mixed types", () => {
    const output = [
      "worktree /main",
      "HEAD aaa",
      "branch refs/heads/main",
      "",
      "worktree /detached",
      "HEAD bbb",
      "detached",
      "",
      "worktree /prunable",
      "HEAD ccc",
      "branch refs/heads/old",
      "prunable",
    ].join("\n");

    const result = parseWorktreeListPorcelain(output);

    expect(result).toHaveLength(3);
    expect(result[0].branch).toBe("main");
    expect(result[0].isDetached).toBe(false);
    expect(result[1].isDetached).toBe(true);
    expect(result[1].branch).toBeUndefined();
    expect(result[2].isPrunable).toBe(true);
  });
});
