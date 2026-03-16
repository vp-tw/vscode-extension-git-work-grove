import type { WorktreeInfo } from "../../types.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockShow = vi.fn();
const mockCreateTerminal = vi.fn(() => ({ show: mockShow }));
const mockShowErrorMessage = vi.fn();

vi.mock("vscode", () => ({
  window: {
    createTerminal: (...args: Array<unknown>) => mockCreateTerminal(...args),
    showErrorMessage: (...args: Array<unknown>) => mockShowErrorMessage(...args),
  },
}));

const mockExistsSync = vi.fn(() => true);
vi.mock("node:fs", () => ({
  existsSync: (...args: Array<unknown>) => mockExistsSync(...args),
}));

const mockGetRepositoryTerminalName = vi.fn(() => "repo-terminal:{ref}");
const mockGetWorktreeTerminalName = vi.fn(() => "wt-terminal:{ref}");
const mockGetRepositoryWorkspaceTerminalName = vi.fn(() => "repo-ws-terminal:{name}");
const mockGetWorktreeWorkspaceTerminalName = vi.fn(() => "wt-ws-terminal:{name} ({ref})");

vi.mock("../../utils/template.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../utils/template.js")>();
  return {
    ...original,
    getRepositoryTerminalName: () => mockGetRepositoryTerminalName(),
    getWorktreeTerminalName: () => mockGetWorktreeTerminalName(),
    getRepositoryWorkspaceTerminalName: () => mockGetRepositoryWorkspaceTerminalName(),
    getWorktreeWorkspaceTerminalName: () => mockGetWorktreeWorkspaceTerminalName(),
  };
});

vi.mock("../../utils/outputChannel.js", () => ({
  logError: vi.fn(),
}));

const { openInTerminal } = await import("../openTerminal.js");
const { logError } = await import("../../utils/outputChannel.js");

// --- Helpers ---

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

// --- Tests ---

describe("openInTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  describe("worktreeItem", () => {
    it("opens terminal for a linked worktree", () => {
      const info = makeWorktreeInfo();
      openInTerminal({ worktreeInfo: info });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/feat-auth");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "wt-terminal:feat/auth",
        cwd: "/repo/feat-auth",
      });
      expect(mockShow).toHaveBeenCalled();
    });

    it("opens terminal for repository (main worktree)", () => {
      const info = makeWorktreeInfo({ isMain: true, name: "my-project", path: "/repo/main", branch: "main" });
      openInTerminal({ worktreeInfo: info });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/main");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "repo-terminal:main",
        cwd: "/repo/main",
      });
      expect(mockShow).toHaveBeenCalled();
    });
  });

  describe("workspaceFileItem", () => {
    it("opens terminal for workspace file under repository", () => {
      const parent = makeWorktreeInfo({ isMain: true, branch: "main" });
      openInTerminal({
        workspaceFileInfo: { name: "dev", path: "/repo/main/.vscode/dev.code-workspace" },
        parentWorktreeInfo: parent,
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/main/.vscode");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "repo-ws-terminal:dev",
        cwd: "/repo/main/.vscode",
      });
      expect(mockShow).toHaveBeenCalled();
    });

    it("opens terminal for workspace file under linked worktree", () => {
      const parent = makeWorktreeInfo({ isMain: false, branch: "feat/auth" });
      openInTerminal({
        workspaceFileInfo: { name: "dev", path: "/repo/feat-auth/dev.code-workspace" },
        parentWorktreeInfo: parent,
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/feat-auth");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "wt-ws-terminal:dev (feat/auth)",
        cwd: "/repo/feat-auth",
      });
      expect(mockShow).toHaveBeenCalled();
    });
  });

  describe("favoriteItem", () => {
    it("opens terminal for favorite repo", () => {
      const info = makeWorktreeInfo({ isMain: true, branch: "main", path: "/repo/main" });
      openInTerminal({
        favoritePath: "/repo/main",
        favoriteType: "repo",
        worktreeInfo: info,
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/main");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "repo-terminal:main",
        cwd: "/repo/main",
      });
      expect(mockShow).toHaveBeenCalled();
    });

    it("opens terminal for favorite worktree", () => {
      const info = makeWorktreeInfo({ branch: "feat/auth" });
      openInTerminal({
        favoritePath: "/repo/feat-auth",
        favoriteType: "worktree",
        worktreeInfo: info,
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/feat-auth");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "wt-terminal:feat/auth",
        cwd: "/repo/feat-auth",
      });
      expect(mockShow).toHaveBeenCalled();
    });

    it("opens terminal for favorite workspace file under repository", () => {
      const parent = makeWorktreeInfo({ isMain: true, branch: "main" });
      openInTerminal({
        favoritePath: "/repo/main/project.code-workspace",
        favoriteType: "workspaceFile",
        parentWorktreeInfo: parent,
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/main");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "repo-ws-terminal:project",
        cwd: "/repo/main",
      });
      expect(mockShow).toHaveBeenCalled();
    });

    it("opens terminal for favorite workspace file under linked worktree", () => {
      const parent = makeWorktreeInfo({ isMain: false, branch: "feat/auth" });
      openInTerminal({
        favoritePath: "/repo/feat-auth/project.code-workspace",
        favoriteType: "workspaceFile",
        parentWorktreeInfo: parent,
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/feat-auth");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "wt-ws-terminal:project (feat/auth)",
        cwd: "/repo/feat-auth",
      });
      expect(mockShow).toHaveBeenCalled();
    });
  });

  describe("groupHeaderItem (repository)", () => {
    it("opens terminal using worktreeInfo for group header", () => {
      const info = makeWorktreeInfo({ isMain: true, name: "my-project", path: "/repo/main", branch: "main" });
      openInTerminal({ worktreeInfo: info });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/main");
      expect(mockCreateTerminal).toHaveBeenCalledWith({
        name: "repo-terminal:main",
        cwd: "/repo/main",
      });
      expect(mockShow).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("shows error message when CWD does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const info = makeWorktreeInfo({ path: "/repo/gone" });
      openInTerminal({ worktreeInfo: info });

      expect(mockExistsSync).toHaveBeenCalledWith("/repo/gone");
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        "Cannot open terminal: directory does not exist — /repo/gone",
      );
      expect(mockCreateTerminal).not.toHaveBeenCalled();
    });

    it("shows error message and logs when createTerminal throws", () => {
      const error = new Error("terminal creation failed");
      mockCreateTerminal.mockImplementationOnce(() => {
        throw error;
      });
      const info = makeWorktreeInfo();
      openInTerminal({ worktreeInfo: info });

      expect(mockShowErrorMessage).toHaveBeenCalledWith("Failed to create terminal.");
      expect(logError).toHaveBeenCalledWith("Failed to create terminal", error);
      expect(mockShow).not.toHaveBeenCalled();
    });

    it("does nothing when item is undefined", () => {
      openInTerminal(undefined as any);

      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockCreateTerminal).not.toHaveBeenCalled();
      expect(mockShowErrorMessage).not.toHaveBeenCalled();
    });
  });
});
