import type { Buffer } from "node:buffer";

import type { WorktreeInfo } from "../types.js";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";

import * as vscode from "vscode";

import {
  CACHE_TTL,
  TIMEOUT_GIT_SHORT,
} from "../constants.js";
import { log, logError } from "../utils/outputChannel.js";

function execGit(
  args: Array<string>,
  cwd: string,
  timeout: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`git ${args[0]} timed out after ${timeout}ms`));
    }, timeout);

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trimEnd());
      } else {
        reject(new Error(`git ${args[0]} failed (code ${code}): ${stderr.trimEnd()}`));
      }
    });
  });
}

export function parseWorktreeListPorcelain(output: string): Array<Omit<WorktreeInfo, "isCurrent" | "isMain">> {
  if (!output.trim()) {
    return [];
  }

  const entries: Array<Omit<WorktreeInfo, "isCurrent" | "isMain">> = [];
  const blocks = output.split("\n\n");

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length === 0) continue;

    let worktreePath = "";
    let head = "";
    let branch: string | undefined;
    let isDetached = false;
    let isPrunable = false;

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        worktreePath = line.slice("worktree ".length);
      } else if (line.startsWith("HEAD ")) {
        head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        const ref = line.slice("branch ".length);
        branch = ref.startsWith("refs/heads/")
          ? ref.slice("refs/heads/".length)
          : ref;
      } else if (line === "detached") {
        isDetached = true;
      } else if (line === "prunable") {
        isPrunable = true;
      }
    }

    if (worktreePath) {
      entries.push({ name: "", path: worktreePath, head, branch, isDetached, isPrunable });
    }
  }

  return entries;
}

export class GitWorktreeService {
  private cache: { entries: Array<WorktreeInfo>; timestamp: number } | undefined;
  private cwd: string | undefined;

  async initialize(): Promise<boolean> {
    try {
      await execGit(["--version"], process.cwd(), TIMEOUT_GIT_SHORT);
      return true;
    } catch {
      return false;
    }
  }

  resolveGitCwd(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return undefined;

    for (const folder of folders) {
      let dir = folder.uri.fsPath;
      while (true) {
        if (fs.existsSync(path.join(dir, ".git"))) {
          this.cwd = dir;
          return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    return undefined;
  }

  async getCommonDir(): Promise<string | undefined> {
    const cwd = this.cwd ?? this.resolveGitCwd();
    if (!cwd) return undefined;

    try {
      const result = await execGit(
        ["rev-parse", "--git-common-dir"],
        cwd,
        TIMEOUT_GIT_SHORT,
      );
      const absolute = path.isAbsolute(result)
        ? result
        : path.resolve(cwd, result);
      return fs.realpathSync(absolute);
    } catch (error) {
      logError("Failed to resolve git common dir", error);
      return undefined;
    }
  }

  async getCurrentWorktreePath(): Promise<string | undefined> {
    const cwd = this.cwd ?? this.resolveGitCwd();
    if (!cwd) return undefined;

    try {
      const result = await execGit(
        ["rev-parse", "--show-toplevel"],
        cwd,
        TIMEOUT_GIT_SHORT,
      );
      return fs.realpathSync(result);
    } catch {
      try {
        return fs.realpathSync(cwd);
      } catch {
        return undefined;
      }
    }
  }

  private async resolveWorktreeNames(): Promise<Map<string, string>> {
    const nameMap = new Map<string, string>();
    const commonDir = await this.getCommonDir();
    if (!commonDir) return nameMap;

    const worktreesDir = path.join(commonDir, "worktrees");
    let entries: Array<fs.Dirent>;
    try {
      entries = fs.readdirSync(worktreesDir, { withFileTypes: true });
    } catch {
      return nameMap;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const gitdirFile = path.join(worktreesDir, entry.name, "gitdir");
      try {
        const content = fs.readFileSync(gitdirFile, "utf-8").trim();
        const resolved = path.isAbsolute(content)
          ? content
          : path.resolve(path.dirname(gitdirFile), content);
        // gitdir points to <worktree>/.git, so parent is the worktree path
        const worktreePath = path.dirname(resolved);
        const normalized = fs.realpathSync(worktreePath);
        nameMap.set(normalized, entry.name);
      } catch {
        // Missing or unresolvable gitdir — skip
      }
    }

    return nameMap;
  }

  async list(forceRefresh = false): Promise<Array<WorktreeInfo>> {
    if (
      !forceRefresh
      && this.cache
      && Date.now() - this.cache.timestamp < CACHE_TTL
    ) {
      return this.cache.entries;
    }

    const cwd = this.cwd ?? this.resolveGitCwd();
    if (!cwd) return [];

    try {
      const output = await execGit(
        ["worktree", "list", "--porcelain"],
        cwd,
        TIMEOUT_GIT_SHORT,
      );
      const parsed = parseWorktreeListPorcelain(output);
      const [currentPath, nameMap] = await Promise.all([
        this.getCurrentWorktreePath(),
        this.resolveWorktreeNames(),
      ]);

      const entries: Array<WorktreeInfo> = parsed.map((entry, index) => {
        let isCurrent = false;
        let normalizedPath: string | undefined;
        if (currentPath) {
          try {
            normalizedPath = fs.realpathSync(entry.path);
            isCurrent = normalizedPath === currentPath;
          } catch {
            isCurrent = false;
          }
        }
        const isPrunable = entry.isPrunable || (!isCurrent && !fs.existsSync(entry.path));
        const name = (normalizedPath ? nameMap.get(normalizedPath) : undefined)
          ?? path.basename(entry.path);
        return { ...entry, name, isCurrent, isMain: index === 0, isPrunable };
      });

      this.cache = { entries, timestamp: Date.now() };
      return entries;
    } catch (error) {
      logError("Failed to list worktrees", error);
      return [];
    }
  }

  invalidateCache(): void {
    this.cache = undefined;
  }

  async pruneWorktrees(): Promise<void> {
    const cwd = this.cwd ?? this.resolveGitCwd();
    if (!cwd) throw new Error("No git repository found");

    await execGit(["worktree", "prune"], cwd, TIMEOUT_GIT_SHORT);
    this.invalidateCache();
    log("Pruned worktrees");
  }
}
