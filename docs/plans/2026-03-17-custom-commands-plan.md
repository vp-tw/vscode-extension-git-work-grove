# Custom Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to configure external commands (e.g., open in Ghostty, Zed) triggered from tree view context menu.

**Architecture:** Two settings arrays (`customCommands.directory`, `customCommands.workspace`) define commands with `[bin, ...args]` + env. Two static VS Code commands show a QuickPick of matching commands, then `child_process.spawn` fire-and-forget. Template variables are rendered in args and env values.

**Tech Stack:** VS Code Extension API (commands, configuration, QuickPick), Node.js `child_process.spawn`, existing `renderTemplate()` + `worktreeVars()` / `workspaceFileVars()`

**Design doc:** `docs/plans/2026-03-17-custom-commands-design.md`

---

### Task 1: Add constants and config keys

**Files:**
- Modify: `src/constants.ts`

**Step 1: Add new constants**

Add to `src/constants.ts` (maintaining alphabetical order within each category):

```typescript
// Command IDs — add these:
export const CMD_CUSTOM_COMMAND_DIRECTORY = "gitWorkGrove.customCommand.directory";
export const CMD_CUSTOM_COMMAND_WORKSPACE = "gitWorkGrove.customCommand.workspace";

// Context keys — add these:
export const CTX_HAS_CUSTOM_COMMANDS_DIRECTORY = "gitWorkGrove.hasCustomCommands.directory";
export const CTX_HAS_CUSTOM_COMMANDS_WORKSPACE = "gitWorkGrove.hasCustomCommands.workspace";

// Config keys — add these:
export const CFG_CUSTOM_COMMANDS_DIRECTORY = "git-work-grove.customCommands.directory";
export const CFG_CUSTOM_COMMANDS_WORKSPACE = "git-work-grove.customCommands.workspace";
```

**Step 2: Verify lint passes**

Run: `pnpm lint:es`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add src/constants.ts
git commit -m "feat: add custom command constants"
```

---

### Task 2: Add `{dir}` variable to `workspaceFileVars()`

**Files:**
- Modify: `src/utils/template.ts`
- Modify: `src/utils/__tests__/template.test.ts`

**Step 1: Write the failing test**

Add test to `src/utils/__tests__/template.test.ts`:

```typescript
it("includes dir variable as parent directory of filePath", () => {
  const vars = workspaceFileVars("my-workspace", "/repo/worktrees/feature/.code-workspace/my-workspace.code-workspace", undefined);
  expect(vars.dir).toBe("/repo/worktrees/feature/.code-workspace");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `vars.dir` is `undefined`

**Step 3: Add `{dir}` to `workspaceFileVars()`**

In `src/utils/template.ts`, modify `workspaceFileVars()` to add `dir`:

```typescript
import * as path from "node:path";  // add import at top

export function workspaceFileVars(
  name: string,
  filePath: string,
  parent: WorktreeInfo | undefined,
): Record<string, string> {
  return {
    name,
    branch: parent?.branch ?? "",
    ref: parent?.branch ?? parent?.head.slice(0, 8) ?? "",
    head: parent?.head.slice(0, 8) ?? "",
    path: filePath,
    dir: path.dirname(filePath),
    worktree: parent?.name ?? "",
  };
}
```

**Step 4: Run tests to verify all pass**

Run: `pnpm test`
Expected: ALL PASS (74 existing + 1 new)

**Step 5: Commit**

```bash
git add src/utils/template.ts src/utils/__tests__/template.test.ts
git commit -m "feat: add {dir} template variable for workspace files"
```

---

### Task 3: Create custom command types and validation

**Files:**
- Create: `src/types/customCommand.ts` — OR add to existing `src/types.ts`
- Create: `src/utils/__tests__/customCommandConfig.test.ts`
- Create: `src/utils/customCommandConfig.ts`

**Step 1: Add type to `src/types.ts`**

```typescript
export interface CustomCommandConfig {
  label: string;
  command: string[];
  env?: Record<string, string>;
}
```

**Step 2: Write failing tests for config validation and getters**

Create `src/utils/__tests__/customCommandConfig.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { getCustomCommands, validateCustomCommand } from "../customCommandConfig.js";

describe("validateCustomCommand", () => {
  it("returns true for valid config", () => {
    expect(validateCustomCommand({ label: "Test", command: ["echo", "hi"] })).toBe(true);
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
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — module not found

**Step 4: Implement validation and config getter**

Create `src/utils/customCommandConfig.ts`:

```typescript
import * as vscode from "vscode";

import type { CustomCommandConfig } from "../types.js";

import { CFG_CUSTOM_COMMANDS_DIRECTORY, CFG_CUSTOM_COMMANDS_WORKSPACE } from "../constants.js";
import { log } from "./outputChannel.js";

export function validateCustomCommand(entry: unknown): entry is CustomCommandConfig {
  if (typeof entry !== "object" || entry === null) return false;
  const obj = entry as Record<string, unknown>;

  if (typeof obj.label !== "string" || obj.label === "") return false;
  if (!Array.isArray(obj.command) || obj.command.length === 0) return false;
  if (!obj.command.every((c: unknown) => typeof c === "string")) return false;

  return true;
}

function resolveEnv(entry: CustomCommandConfig): Record<string, string> {
  if (entry.env !== undefined && typeof entry.env === "object" && entry.env !== null) {
    return entry.env;
  }
  return {};
}

export function getCustomCommands(type: "directory" | "workspace"): CustomCommandConfig[] {
  const key = type === "directory" ? CFG_CUSTOM_COMMANDS_DIRECTORY : CFG_CUSTOM_COMMANDS_WORKSPACE;
  const raw = vscode.workspace.getConfiguration().get<unknown[]>(key, []);
  const valid: CustomCommandConfig[] = [];

  for (const entry of raw) {
    if (validateCustomCommand(entry)) {
      valid.push({ ...entry, env: resolveEnv(entry) });
    } else {
      log(`Invalid custom command entry in ${key}: ${JSON.stringify(entry)}`);
    }
  }

  return valid;
}
```

**Step 5: Run tests to verify all pass**

Run: `pnpm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/types.ts src/utils/customCommandConfig.ts src/utils/__tests__/customCommandConfig.test.ts
git commit -m "feat: add custom command config types and validation"
```

---

### Task 4: Implement command handler with spawn logic

**Files:**
- Create: `src/commands/customCommand.ts`

**Step 1: Create the command handler**

Create `src/commands/customCommand.ts`:

```typescript
import { spawn } from "node:child_process";
import * as path from "node:path";

import * as vscode from "vscode";

import type { CustomCommandConfig } from "../types.js";

import { getCustomCommands } from "../utils/customCommandConfig.js";
import { log, logError } from "../utils/outputChannel.js";
import { renderTemplate, workspaceFileVars, worktreeVars } from "../utils/template.js";

type CustomCommandItem =
  | { favoritePath: string; favoriteType: "repo" | "worktree" | "workspaceFile"; worktreeInfo?: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean }; parentWorktreeInfo?: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean } }
  | { workspaceFileInfo: { name: string; path: string }; parentWorktreeInfo: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean } }
  | { worktreeInfo: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean } };

function resolveVars(item: CustomCommandItem): { vars: Record<string, string>; cwd: string } | undefined {
  // FavoriteItem
  if ("favoritePath" in item) {
    switch (item.favoriteType) {
      case "repo":
      case "worktree": {
        const info = item.worktreeInfo!;
        return { vars: worktreeVars(info), cwd: item.favoritePath };
      }
      case "workspaceFile": {
        const wsName = path.basename(item.favoritePath, ".code-workspace");
        const vars = workspaceFileVars(wsName, item.favoritePath, item.parentWorktreeInfo);
        return { vars, cwd: path.dirname(item.favoritePath) };
      }
    }
  }

  // WorkspaceFileItem
  if ("workspaceFileInfo" in item) {
    const vars = workspaceFileVars(item.workspaceFileInfo.name, item.workspaceFileInfo.path, item.parentWorktreeInfo);
    return { vars, cwd: path.dirname(item.workspaceFileInfo.path) };
  }

  // WorktreeItem / GroupHeaderItem (repository)
  if ("worktreeInfo" in item && item.worktreeInfo) {
    return { vars: worktreeVars(item.worktreeInfo), cwd: item.worktreeInfo.path };
  }

  return undefined;
}

function renderCommand(config: CustomCommandConfig, vars: Record<string, string>): { bin: string; args: string[]; env: Record<string, string> } {
  const rendered = config.command.map(part => renderTemplate(part, vars));
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.env ?? {})) {
    env[key] = renderTemplate(value, vars);
  }
  return { bin: rendered[0], args: rendered.slice(1), env };
}

function spawnCommand(bin: string, args: string[], env: Record<string, string>, cwd: string): void {
  try {
    const child = spawn(bin, args, {
      detached: true,
      stdio: "ignore",
      cwd,
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
    });
    child.unref();
    child.on("error", (err) => {
      logError(`Failed to run '${bin}'`, err);
      void vscode.window.showErrorMessage(
        `Failed to run '${bin}': ${err.message}`,
        "Show Logs",
      ).then((action) => {
        if (action === "Show Logs") {
          void vscode.commands.executeCommand("gitWorkGrove.showOutput");
        }
      });
    });
    log(`Custom command: ${bin} ${args.join(" ")}`);
  } catch (error) {
    logError(`Failed to spawn '${bin}'`, error);
    void vscode.window.showErrorMessage(`Failed to run '${bin}'.`);
  }
}

export async function runCustomCommand(
  item: CustomCommandItem | undefined,
  type: "directory" | "workspace",
): Promise<void> {
  if (!item) return;

  const resolved = resolveVars(item);
  if (!resolved) return;

  const commands = getCustomCommands(type);
  if (commands.length === 0) return;

  const quickPickItems = commands.map((cmd) => {
    const rendered = renderCommand(cmd, resolved.vars);
    return {
      label: cmd.label,
      detail: `${rendered.bin} ${rendered.args.join(" ")}`,
      command: cmd,
    };
  });

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select a command to run",
  });

  if (!selected) return;

  const { bin, args, env } = renderCommand(selected.command, resolved.vars);
  spawnCommand(bin, args, env, resolved.cwd);
}
```

**Step 2: Verify lint passes**

Run: `pnpm lint:es`
Expected: PASS

**Step 3: Commit**

```bash
git add src/commands/customCommand.ts
git commit -m "feat: implement custom command handler with spawn and QuickPick"
```

---

### Task 5: Register commands and context keys in extension.ts

**Files:**
- Modify: `src/extension.ts`

**Step 1: Add imports**

Add to imports in `extension.ts`:

```typescript
import { runCustomCommand } from "./commands/customCommand.js";
```

Add to constants imports:

```typescript
CMD_CUSTOM_COMMAND_DIRECTORY,
CMD_CUSTOM_COMMAND_WORKSPACE,
CTX_HAS_CUSTOM_COMMANDS_DIRECTORY,
CTX_HAS_CUSTOM_COMMANDS_WORKSPACE,
```

**Step 2: Add context key update function**

Add after the `setContext` helper function (~line 44):

```typescript
import { getCustomCommands } from "./utils/customCommandConfig.js";

function updateCustomCommandContextKeys(): void {
  void setContext(CTX_HAS_CUSTOM_COMMANDS_DIRECTORY, getCustomCommands("directory").length > 0);
  void setContext(CTX_HAS_CUSTOM_COMMANDS_WORKSPACE, getCustomCommands("workspace").length > 0);
}
```

**Step 3: Set initial context keys**

Add after existing `setContext` calls (~line 62):

```typescript
void setContext(CTX_HAS_CUSTOM_COMMANDS_DIRECTORY, false);
void setContext(CTX_HAS_CUSTOM_COMMANDS_WORKSPACE, false);
```

**Step 4: Register the two commands**

Add to the `context.subscriptions.push(...)` block (~after line 133):

```typescript
vscode.commands.registerCommand(CMD_CUSTOM_COMMAND_DIRECTORY, (item) =>
  runCustomCommand(item, "directory")),
vscode.commands.registerCommand(CMD_CUSTOM_COMMAND_WORKSPACE, (item) =>
  runCustomCommand(item, "workspace")),
```

**Step 5: Update context keys on config change and after repository check**

In the `onDidChangeConfiguration` handler (~line 206-210), add context key update:

```typescript
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("git-work-grove")) {
    treeProvider.refresh();
    updateCustomCommandContextKeys();
  }
}),
```

After `void setContext(CTX_HAS_REPOSITORY, hasRepository)` (~line 174), add:

```typescript
updateCustomCommandContextKeys();
```

**Step 6: Verify build passes**

Run: `pnpm build`
Expected: PASS

**Step 7: Commit**

```bash
git add src/extension.ts
git commit -m "feat: register custom command handlers and context keys"
```

---

### Task 6: Add commands, menus, and settings to package.json

**Files:**
- Modify: `package.json`

**Step 1: Add command declarations**

Add to `contributes.commands` array (after `cleanStaleFavorites`, before `moveFavoriteUp`):

```json
{
  "command": "gitWorkGrove.customCommand.directory",
  "title": "Git WorkGrove: Custom Commands...",
  "enablement": "gitWorkGrove.hasRepository"
},
{
  "command": "gitWorkGrove.customCommand.workspace",
  "title": "Git WorkGrove: Custom Commands...",
  "enablement": "gitWorkGrove.hasRepository"
}
```

**Step 2: Add menu entries**

Add to `contributes.menus.view/item/context` array (after the last `5_cutcopypaste` entry, before `inline` entries):

```json
{
  "command": "gitWorkGrove.customCommand.directory",
  "when": "view == gitWorkGrove.worktrees && gitWorkGrove.hasCustomCommands.directory && viewItem =~ /^worktree|^repository|^favorite\\./ && !(viewItem =~ /workspaceFile/) && !(viewItem =~ /prunable/)",
  "group": "custom@1"
},
{
  "command": "gitWorkGrove.customCommand.workspace",
  "when": "view == gitWorkGrove.worktrees && gitWorkGrove.hasCustomCommands.workspace && viewItem =~ /^workspaceFile|^favorite\\.workspaceFile/",
  "group": "custom@1"
}
```

**Step 3: Add configuration properties**

Add to `contributes.configuration.properties` (after `git-work-grove.favorites`, before closing `}`):

```json
"git-work-grove.customCommands.directory": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["label", "command"],
    "properties": {
      "label": {
        "type": "string",
        "description": "Display text in the context menu and QuickPick."
      },
      "command": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Command to execute as [bin, ...args]. Supports template variables: {name}, {branch}, {ref}, {head}, {path}."
      },
      "env": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "description": "Environment variables. Values support template variables."
      }
    }
  },
  "default": [],
  "markdownDescription": "Custom commands for worktree/repository items. Each entry defines a command triggered from the context menu. Template variables: `{name}`, `{branch}`, `{ref}`, `{head}`, `{path}`.",
  "scope": "resource"
},
"git-work-grove.customCommands.workspace": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["label", "command"],
    "properties": {
      "label": {
        "type": "string",
        "description": "Display text in the context menu and QuickPick."
      },
      "command": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Command to execute as [bin, ...args]. Supports template variables: {name}, {branch}, {ref}, {head}, {path}, {dir}, {worktree}."
      },
      "env": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "description": "Environment variables. Values support template variables."
      }
    }
  },
  "default": [],
  "markdownDescription": "Custom commands for workspace file items. Each entry defines a command triggered from the context menu. Template variables: `{name}`, `{branch}`, `{ref}`, `{head}`, `{path}`, `{dir}`, `{worktree}`.",
  "scope": "resource"
}
```

**Step 4: Verify build passes**

Run: `pnpm build`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add custom commands to package.json (commands, menus, settings)"
```

---

### Task 7: Create spec and update documentation

**Files:**
- Create: `docs/spec/custom-commands.md`
- Modify: `docs/templates.md` (add `{dir}` variable)
- Modify: `README.md` (add Custom Commands section)
- Modify: `docs/spec/commands.md` (add new commands)
- Modify: `CLAUDE.md` (add spec to table)

**Step 1: Create `docs/spec/custom-commands.md`**

Copy the content from the design doc `docs/plans/2026-03-17-custom-commands-design.md` into a proper spec, reformatted as a specification (not a plan). Remove plan-specific language.

**Step 2: Update `docs/spec/commands.md`**

Add the two new commands to the commands spec.

**Step 3: Update `docs/templates.md`**

Add `{dir}` to the workspace file template variables table.

**Step 4: Update `README.md`**

Add a "Custom Commands" section under Settings with examples.

**Step 5: Update `CLAUDE.md`**

Add `docs/spec/custom-commands.md` to the Current Specs table.

**Step 6: Commit**

```bash
git add docs/ README.md CLAUDE.md
git commit -m "docs: add custom commands spec and update documentation"
```

---

### Task 8: Add changeset

**Files:**
- Create: `.changeset/<name>.md`

**Step 1: Create changeset**

```markdown
---
"git-work-grove": minor
---

Add custom commands: configure external commands (e.g., open in Ghostty, Zed) triggered from the tree view context menu. Supports template variables for dynamic arguments and environment variables.
```

**Step 2: Commit**

```bash
git add .changeset/
git commit -m "chore: add changeset for custom commands"
```

---

### Task 9: Final verification

**Step 1: Run all tests**

Run: `pnpm test`
Expected: ALL PASS

**Step 2: Run lint**

Run: `pnpm lint:es`
Expected: PASS

**Step 3: Run build**

Run: `pnpm build`
Expected: PASS

**Step 4: Local install and manual test**

Run: `pnpm local:install`

Manual verification:
1. Add a custom command to settings (e.g., `"git-work-grove.customCommands.directory": [{"label": "Open in Finder", "command": ["open", "{path}"]}]`)
2. Right-click a worktree → "Custom Commands..." should appear
3. Select → Finder should open at the worktree path
4. Right-click a workspace file → "Custom Commands..." should NOT appear (no workspace commands configured)
5. Add a workspace command → should now appear on workspace files
