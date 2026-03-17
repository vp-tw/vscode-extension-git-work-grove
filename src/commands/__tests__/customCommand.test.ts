import type { CustomCommandConfig } from "../../types.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockSendText = vi.fn();
const mockShow = vi.fn();
const mockCreateTerminal = vi.fn(() => ({ sendText: mockSendText, show: mockShow }));
const mockShowQuickPick = vi.fn(async (items: Array<unknown>) => items[0]);
const mockShowErrorMessage = vi.fn();
const mockExecuteCommand = vi.fn();

vi.mock("vscode", () => ({
  commands: {
    executeCommand: (...args: Array<unknown>) => mockExecuteCommand(...args),
  },
  window: {
    createTerminal: (...args: Array<unknown>) => mockCreateTerminal(...args),
    showErrorMessage: (...args: Array<unknown>) => mockShowErrorMessage(...args),
    showQuickPick: (...args: Array<unknown>) => mockShowQuickPick(...args),
  },
  workspace: {
    getConfiguration: () => ({ get: (_k: string, d: unknown) => d }),
  },
}));

const mockExistsSync = vi.fn(() => true);
vi.mock("node:fs", () => ({
  existsSync: (...args: Array<unknown>) => mockExistsSync(...args),
}));

const mockUnref = vi.fn();
const mockOn = vi.fn();
const mockSpawn = vi.fn(() => ({ on: mockOn, unref: mockUnref }));
vi.mock("node:child_process", () => ({
  spawn: (...args: Array<unknown>) => mockSpawn(...args),
}));

vi.mock("shell-quote", () => ({
  quote: (args: Array<string>) =>
    args.map(arg => (arg.includes(" ") ? `'${arg}'` : arg)).join(" "),
}));

const mockResolveItemContext = vi.fn(() => ({
  cwd: "/repo/feat",
  vars: { name: "feat", path: "/repo/feat" },
}));
vi.mock("../../utils/resolveItemContext.js", () => ({
  resolveItemContext: (...args: Array<unknown>) => mockResolveItemContext(...args),
}));

const mockGetCustomCommands = vi.fn<() => Array<CustomCommandConfig>>(() => []);
vi.mock("../../utils/customCommandConfig.js", () => ({
  getCustomCommands: (...args: Array<unknown>) => mockGetCustomCommands(...args),
}));

vi.mock("../../utils/template.js", () => ({
  renderTemplate: (input: string) => input,
}));

vi.mock("../../utils/outputChannel.js", () => ({
  log: vi.fn(),
  logError: vi.fn(),
}));

const { runCustomCommand } = await import("../customCommand.js");
const { logError } = await import("../../utils/outputChannel.js");

// --- Helpers ---

function makeItem() {
  return { worktreeInfo: { branch: "feat", head: "abc123", isDetached: false, isCurrent: false, isMain: false, isPrunable: false, name: "feat", path: "/repo/feat" } } as const;
}

// --- Tests ---

describe("runCustomCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockResolveItemContext.mockReturnValue({
      cwd: "/repo/feat",
      vars: { name: "feat", path: "/repo/feat" },
    });
  });

  describe("terminal mode", () => {
    it("creates terminal with name, cwd, and env, sends command, and shows", async () => {
      mockGetCustomCommands.mockReturnValue([
        { command: ["echo", "hello"], env: { FOO: "bar" }, label: "Echo", mode: "terminal" },
      ]);

      await runCustomCommand(makeItem(), "directory");

      expect(mockCreateTerminal).toHaveBeenCalledWith({
        cwd: "/repo/feat",
        env: { FOO: "bar" },
        name: "Echo",
      });
      expect(mockSendText).toHaveBeenCalledWith("echo hello");
      expect(mockShow).toHaveBeenCalled();
    });

    it("quotes arguments with spaces", async () => {
      mockGetCustomCommands.mockReturnValue([
        { command: ["echo", "hello world"], env: {}, label: "Echo", mode: "terminal" },
      ]);

      await runCustomCommand(makeItem(), "directory");

      expect(mockSendText).toHaveBeenCalledWith("echo 'hello world'");
    });
  });

  describe("spawn mode (default)", () => {
    it("calls spawn with correct arguments", async () => {
      mockGetCustomCommands.mockReturnValue([
        { command: ["git", "status"], env: {}, label: "Status", mode: "spawn" },
      ]);

      await runCustomCommand(makeItem(), "directory");

      expect(mockSpawn).toHaveBeenCalledWith(
        "git",
        ["status"],
        expect.objectContaining({
          cwd: "/repo/feat",
          detached: true,
          stdio: "ignore",
        }),
      );
      expect(mockUnref).toHaveBeenCalled();
    });
  });

  describe("terminal mode error handling", () => {
    it("calls logError and showErrorMessage when createTerminal throws", async () => {
      const error = new Error("terminal failed");
      mockCreateTerminal.mockImplementationOnce(() => {
        throw error;
      });
      mockGetCustomCommands.mockReturnValue([
        { command: ["echo"], env: {}, label: "Fail", mode: "terminal" },
      ]);

      await runCustomCommand(makeItem(), "directory");

      expect(logError).toHaveBeenCalledWith("Failed to run 'echo' in terminal", error);
      expect(mockShowErrorMessage).toHaveBeenCalledWith("Failed to run 'echo' in terminal.");
    });
  });

  describe("default mode when omitted", () => {
    it("behaves as spawn when mode is not specified", async () => {
      mockGetCustomCommands.mockReturnValue([
        { command: ["ls", "-la"], env: {}, label: "List", mode: "spawn" },
      ]);

      await runCustomCommand(makeItem(), "directory");

      expect(mockSpawn).toHaveBeenCalled();
      expect(mockCreateTerminal).not.toHaveBeenCalled();
    });
  });
});
