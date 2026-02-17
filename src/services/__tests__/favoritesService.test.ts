import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory store backing the mock configuration
let store: Array<string>;

// Mock vscode module with getConfiguration and other required APIs
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((_key: string, defaultValue: Array<string>) =>
        store.length > 0 ? store : defaultValue),
      update: vi.fn(async (_key: string, value: Array<string>) => {
        store = [...value];
      }),
    })),
  },
  ConfigurationTarget: { Global: 1 },
  window: {
    showInformationMessage: vi.fn(),
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
}));

const { FavoritesService } = await import("../favoritesService.js");

describe("favoritesService", () => {
  let service: InstanceType<typeof FavoritesService>;

  beforeEach(() => {
    store = [];
    service = new FavoritesService();
  });

  it("returns empty favorites initially", () => {
    expect(service.getFavorites()).toEqual([]);
  });

  describe("add", () => {
    it("adds a favorite", async () => {
      await service.add("/path/to/worktree");
      expect(service.isFavorite("/path/to/worktree")).toBe(true);
    });

    it("does not add duplicates", async () => {
      await service.add("/path/to/worktree");
      await service.add("/path/to/worktree");
      expect(service.getFavorites()).toEqual(["/path/to/worktree"]);
    });

    it("appends to the end", async () => {
      await service.add("/path/a");
      await service.add("/path/b");
      expect(service.getFavorites()).toEqual(["/path/a", "/path/b"]);
    });
  });

  describe("remove", () => {
    it("removes an existing favorite", async () => {
      await service.add("/path/to/worktree");
      await service.remove("/path/to/worktree");
      expect(service.isFavorite("/path/to/worktree")).toBe(false);
    });

    it("does nothing for non-existent path", async () => {
      await service.add("/path/a");
      await service.remove("/path/nonexistent");
      expect(service.getFavorites()).toEqual(["/path/a"]);
    });
  });

  describe("move", () => {
    it("moves an item forward", async () => {
      await service.add("/path/a");
      await service.add("/path/b");
      await service.add("/path/c");
      await service.move(0, 2);
      expect(service.getFavorites()).toEqual(["/path/b", "/path/c", "/path/a"]);
    });

    it("moves an item backward", async () => {
      await service.add("/path/a");
      await service.add("/path/b");
      await service.add("/path/c");
      await service.move(2, 0);
      expect(service.getFavorites()).toEqual(["/path/c", "/path/a", "/path/b"]);
    });

    it("swaps adjacent items", async () => {
      await service.add("/path/a");
      await service.add("/path/b");
      await service.move(0, 1);
      expect(service.getFavorites()).toEqual(["/path/b", "/path/a"]);
    });

    it("does nothing for same index", async () => {
      await service.add("/path/a");
      await service.add("/path/b");
      await service.move(1, 1);
      expect(service.getFavorites()).toEqual(["/path/a", "/path/b"]);
    });

    it("does nothing for out-of-bounds indices", async () => {
      await service.add("/path/a");
      await service.add("/path/b");
      await service.move(-1, 0);
      expect(service.getFavorites()).toEqual(["/path/a", "/path/b"]);
      await service.move(0, 5);
      expect(service.getFavorites()).toEqual(["/path/a", "/path/b"]);
    });
  });

  describe("cleanupStale", () => {
    it("removes paths not in valid set", async () => {
      await service.add("/path/exists");
      await service.add("/path/gone");

      const validPaths = new Set(["/path/exists"]);
      const removed = await service.cleanupStale(validPaths);
      expect(removed).toBe(1);
      expect(service.isFavorite("/path/exists")).toBe(true);
      expect(service.isFavorite("/path/gone")).toBe(false);
    });

    it("does not remove valid entries", async () => {
      await service.add("/path/a");
      await service.add("/path/b");

      const validPaths = new Set(["/path/a", "/path/b"]);
      const removed = await service.cleanupStale(validPaths);
      expect(removed).toBe(0);
      expect(service.getFavorites()).toEqual(["/path/a", "/path/b"]);
    });
  });
});
