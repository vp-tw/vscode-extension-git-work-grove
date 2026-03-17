import { describe, expect, it, vi } from "vitest";

vi.mock("node:os", () => ({
  homedir: () => "/Users/v",
}));

vi.mock("node:fs", () => ({
  realpathSync: (p: string) => p,
}));

const { abbreviatePath } = await import("../fishPath.js");

describe("abbreviatePath", () => {
  it("abbreviates home path with .git/worktrees", () => {
    expect(
      abbreviatePath("/Users/v/repo/vp-tw/main-repo/.git/worktrees/wt-hotfix"),
    ).toBe("~/r/v/m/.git/worktrees/wt-hotfix");
  });

  it("abbreviates non-home path with .git/worktrees", () => {
    expect(
      abbreviatePath("/tmp/grove-test/main-repo/.git/worktrees/wt-hotfix"),
    ).toBe("/t/g/m/.git/worktrees/wt-hotfix");
  });

  it("abbreviates path without .git — all but last component", () => {
    expect(
      abbreviatePath("/Users/v/repo/vp-tw/main-repo"),
    ).toBe("~/r/v/main-repo");
  });

  it("handles single component after root", () => {
    expect(abbreviatePath("/tmp")).toBe("/tmp");
  });

  it("handles home directory itself", () => {
    expect(abbreviatePath("/Users/v")).toBe("~");
  });

  it("handles path directly under home", () => {
    expect(abbreviatePath("/Users/v/projects")).toBe("~/projects");
  });
});
