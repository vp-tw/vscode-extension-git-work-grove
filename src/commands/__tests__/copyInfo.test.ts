import type { WorktreeInfo } from "../../types.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockWriteText = vi.fn();
const mockShowWarningMessage = vi.fn();

vi.mock("vscode", () => ({
  env: { clipboard: { writeText: (...args: Array<unknown>) => mockWriteText(...args) } },
  window: { showWarningMessage: (...args: Array<unknown>) => mockShowWarningMessage(...args) },
}));

const { copyName, copyPath, copyWorktreeConfigPath } = await import("../copyInfo.js");

function makeWorktreeInfo(overrides?: Partial<WorktreeInfo>): WorktreeInfo {
  return {
    name: "feat-auth",
    path: "/repo/feat-auth",
    head: "abc12345def67890",
    branch: "feat/auth",
    isDetached: false,
    isCurrent: false,
    isMain: false,
    isPrunable: false,
    ...overrides,
  };
}

describe("copyName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("copies worktree name", async () => {
    const item = { worktreeInfo: makeWorktreeInfo() } as any;
    await copyName(item);
    expect(mockWriteText).toHaveBeenCalledWith("feat-auth");
  });

  it("no-ops for undefined item", async () => {
    await copyName(undefined);
    expect(mockWriteText).not.toHaveBeenCalled();
  });
});

describe("copyPath", () => {
  beforeEach(() => vi.clearAllMocks());

  it("copies worktree path", async () => {
    const item = { worktreeInfo: makeWorktreeInfo() } as any;
    await copyPath(item);
    expect(mockWriteText).toHaveBeenCalledWith("/repo/feat-auth");
  });
});

describe("copyWorktreeConfigPath", () => {
  beforeEach(() => vi.clearAllMocks());

  it("copies configPath to clipboard", async () => {
    const item = {
      worktreeInfo: makeWorktreeInfo({
        configPath: "/repo/.git/worktrees/feat-auth",
      }),
    } as any;
    await copyWorktreeConfigPath(item);
    expect(mockWriteText).toHaveBeenCalledWith("/repo/.git/worktrees/feat-auth");
  });

  it("shows warning for undefined item", async () => {
    await copyWorktreeConfigPath(undefined);
    expect(mockShowWarningMessage).toHaveBeenCalledWith("Worktree config path not available.");
    expect(mockWriteText).not.toHaveBeenCalled();
  });

  it("shows warning for non-worktree item", async () => {
    const item = { favoritePath: "/some/path" } as any;
    await copyWorktreeConfigPath(item);
    expect(mockShowWarningMessage).toHaveBeenCalledWith("Worktree config path not available.");
  });

  it("shows warning when configPath is undefined", async () => {
    const item = { worktreeInfo: makeWorktreeInfo() } as any;
    await copyWorktreeConfigPath(item);
    expect(mockShowWarningMessage).toHaveBeenCalledWith("Worktree config path not available.");
  });
});
