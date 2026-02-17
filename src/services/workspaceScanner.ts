import type { WorkspaceFileInfo } from "../types.js";

import * as fs from "node:fs";
import * as path from "node:path";

import { MAX_WORKSPACE_FILES } from "../constants.js";
import { getWorkspaceFileExclude, getWorkspaceFileInclude } from "../utils/config.js";

// Converts a simple glob pattern to a RegExp.
// Supports `*` (any non-slash chars) and `?` (single char).
// Does NOT support `**` or `{a,b}` brace expansion.
const regexCache = new Map<string, RegExp>();

function matchSimpleGlob(pattern: string, filename: string): boolean {
  let re = regexCache.get(pattern);
  if (!re) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (ch) => {
      if (ch === "*") return "[^/]*";
      if (ch === "?") return ".";
      return `\\${ch}`;
    });
    re = new RegExp(`^${escaped}$`);
    regexCache.set(pattern, re);
  }
  return re.test(filename);
}

export class WorkspaceScanner {
  scan(worktreePath: string): {
    files: Array<WorkspaceFileInfo>;
    totalCount: number;
  } {
    const includePatterns = getWorkspaceFileInclude();
    const excludePatterns = getWorkspaceFileExclude();

    let dirEntries: Array<fs.Dirent>;
    try {
      dirEntries = fs.readdirSync(worktreePath, { withFileTypes: true });
    } catch {
      return { files: [], totalCount: 0 };
    }

    const matched = dirEntries
      .filter((entry) => {
        if (!entry.isFile()) return false;
        const name = entry.name;
        const included = includePatterns.some(p => matchSimpleGlob(p, name));
        if (!included) return false;
        const excluded = excludePatterns.some(p => matchSimpleGlob(p, name));
        return !excluded;
      })
      .map(entry => entry.name)
      .sort();

    const totalCount = matched.length;

    const files: Array<WorkspaceFileInfo> = matched
      .slice(0, MAX_WORKSPACE_FILES)
      .map(name => ({
        name: name.replace(/\.code-workspace$/, ""),
        path: path.join(worktreePath, name),
      }));

    return { files, totalCount };
  }
}
