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

  it("returns false when env is not an object", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], env: "bad" })).toBe(false);
  });

  it("returns false when env is an array", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], env: ["bad"] })).toBe(false);
  });

  it("returns false when env values are not strings", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], env: { FOO: 123 } })).toBe(false);
  });

  it("returns true when env is omitted", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"] })).toBe(true);
  });

  it("returns true when mode is 'spawn'", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], mode: "spawn" })).toBe(true);
  });

  it("returns true when mode is 'terminal'", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], mode: "terminal" })).toBe(true);
  });

  it("returns true when mode is omitted", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"] })).toBe(true);
  });

  it("returns false when mode is invalid", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo"], mode: "invalid" })).toBe(false);
  });
});
