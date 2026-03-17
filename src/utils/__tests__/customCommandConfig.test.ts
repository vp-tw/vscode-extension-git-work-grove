import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: (_k: string, d: unknown) => d }) },
}));

const { validateCustomCommand } = await import("../customCommandConfig.js");

describe("validateCustomCommand", () => {
  it("returns true for valid config", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo", "hi"] })).toBe(true);
  });

  it("returns true for valid config with env", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], env: { FOO: "bar" } })).toBe(true);
  });

  it("returns false when label is missing", () => {
    expect(validateCustomCommand({ command: ["echo"] })).toBe(false);
  });

  it("returns false when label is empty", () => {
    expect(validateCustomCommand({ label: "", command: ["echo"] })).toBe(false);
  });

  it("returns false when command is missing", () => {
    expect(validateCustomCommand({ label: "Test" })).toBe(false);
  });

  it("returns false when command is empty array", () => {
    expect(validateCustomCommand({ label: "Test", command: [] })).toBe(false);
  });

  it("returns false when command is not an array", () => {
    expect(validateCustomCommand({ label: "Test", command: "echo" })).toBe(false);
  });

  it("returns false when command contains non-strings", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo", 123] })).toBe(false);
  });

  it("returns false for null", () => {
    expect(validateCustomCommand(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(validateCustomCommand("string")).toBe(false);
  });
});
