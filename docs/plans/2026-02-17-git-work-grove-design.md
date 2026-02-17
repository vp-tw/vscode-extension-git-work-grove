# Git WorkGrove — Design Document

> **A code-workspace friendly worktree manager**

- **Repository**: `vdustr/vscode-extension-git-work-grove`
- **Extension ID**: `git-work-grove`
- **Display Name**: `Git WorkGrove`
- **Publisher**: `vdustr`
- **License**: MIT 2026
- **Category**: `SCM Providers`
- **Keywords**: `git`, `worktree`, `workspace`, `code-workspace`, `source-control`

---

## 1. Positioning

A VS Code extension that provides first-class `.code-workspace` support for git worktrees. Appears in the Source Control view, letting users browse worktrees and directly open their workspace files.

### Problem Statement

When using git worktrees in monorepos, VS Code opens worktrees as plain folders. Dev server console output shows relative paths that can't be clicked to open files — because VS Code doesn't know the workspace file context. Users must manually locate and open `.code-workspace` files every time they switch worktrees.

### Differentiator

Existing worktree extensions (Git Worktree Manager, Git Worktrees, Git Worktree, Git Worktree Assistant) either don't handle `.code-workspace` files at all or only have early/buggy support. Git WorkGrove makes the worktree-to-workspace mapping the core experience.

### Non-Goals

- Bare repository support (requires different UX; may revisit post-v1)
- Phosphor icon theming (use ThemeIcon only)
- Full-featured git client (no merge, rebase, etc.)
- Telemetry / analytics (not in v1)
- i18n (English only in v1)

---

## 2. Tech Stack

| Tool | Purpose |
|------|---------|
| TypeScript + tsc | Language + type checking |
| esbuild | Bundler |
| `@vp-tw/eslint-config` | Linting (uses `vdustr()` function) |
| `@vp-tw/tsconfig` | TypeScript config |
| oxfmt | Formatter (`.oxfmtrc.json`) |
| `@vscode/vsce` | Packaging + publishing |
| pnpm | Package manager |

---

## 3. Naming Convention

Extension ID and settings use **kebab-case** (`git-work-grove.*`), matching VS Code convention (`editor.fontSize`, `files.autoSave`).

Internal contribution point IDs (views, commands) use **camelCase** (`gitWorkGrove.*`), matching VS Code extension convention (GitLens uses `gitlens.*`, GitHub PR uses `pr.*`).

| Scope | Format | Example |
|-------|--------|---------|
| Extension ID | kebab-case | `git-work-grove` |
| Settings | kebab-case | `git-work-grove.openBehavior` |
| View IDs | camelCase | `gitWorkGrove.worktrees` |
| Command IDs | camelCase | `gitWorkGrove.createWorktree` |
| Context keys | camelCase | `gitWorkGrove.hasRepository` |

---

## 4. Features

### 4.1 Source Control Tree View

**Location**: Source Control view container (`scm`).

**Empty State**: When no worktrees exist (only main working tree), show welcome content with a "Create Worktree" button. Welcome content gated by `gitWorkGrove.hasRepository` context key.

**Tree Structure**: Two-layer hierarchy with optional favorites section:

```
[Favorites]
▸ ★ ~/worktrees/auth             ← favorited worktree (star inline action)
    monorepo                     ← workspace file (window icon)
[All Worktrees]
▸ ~/worktrees/auth               ← worktree (folder-active icon + green if current)
    monorepo
▸ ~/worktrees/bug-123
    monorepo
```

If no favorites exist, the grouping headers are hidden and all worktrees display in a flat list.

**Display Rules**:
- Worktree label: Home directory abbreviated (`~`), rest kept as-is. Full path in tooltip.
- Workspace file label: Filename without `.code-workspace` suffix.
- Branch name: NOT shown in label. Shown in tooltip only.
- Tooltip: `vscode.MarkdownString` with full path, branch (if any), commit hash, and current status. Branch names must be escaped before inserting into markdown (prevent injection of links or formatting via malicious branch names).

**Icons**:
- Current worktree: `new ThemeIcon("folder-active", new ThemeColor("terminal.ansiGreen"))`
- Other worktrees: `ThemeIcon("folder")`
- Workspace files: `ThemeIcon("window")`
- Prunable worktrees (missing directory): `ThemeIcon("warning")`

**Context Values** (for menu `when` clauses):
- Worktree items: compound `contextValue` built from flags. Valid combinations:
  - `"worktree"` — normal worktree
  - `"worktree.current"` — current window's worktree
  - `"worktree.favorite"` — favorited worktree
  - `"worktree.current.favorite"` — current + favorited
  - `"worktree.prunable"` — worktree with missing directory
  - `"worktree.prunable.favorite"` — prunable + favorited
  - Note: `current` and `prunable` are mutually exclusive (the current worktree's directory always exists)
- Workspace file items: `contextValue = "workspaceFile"`
- Group headers (when favorites exist): `contextValue = "group"`, `collapsibleState: Expanded` (always expanded, not clickable, no collapse UI)

**Sorting**: Alphabetical by path. Current worktree pinning to top is configurable (default: off).

**Live Updates**: `FileSystemWatcher` on `<git-common-dir>/worktrees/` directory with 500ms debounce. The common git dir is resolved via `git rev-parse --git-common-dir` executed with `cwd` set to the first workspace folder that contains a `.git` file/directory (same folder used for current detection in Section 4.2). The result is converted to absolute path with `path.isAbsolute(result) ? result : path.resolve(cwd, result)`, then symlinks resolved with `fs.realpathSync()`. Before creating the watcher, verify `<absoluteCommonDir>/worktrees` directory exists — if not, disable live updates. Watcher pattern: `new vscode.RelativePattern(absoluteCommonDir, 'worktrees/**')` — monitors all file and directory changes within `worktrees/` subdirectories (including git metadata files like `gitdir`, `HEAD`, `commondir`). If the command fails or the path doesn't exist, disable live updates and rely on manual refresh only (log warning to output channel). All watchers registered in `context.subscriptions` for automatic disposal. Manual refresh button in view title bar as fallback.

**Concurrent Refresh Protection**: All refresh triggers (FileSystemWatcher debounce, manual refresh button, post-command refresh) funnel through a single `refresh()` method that ignores calls while a refresh is already in flight. Manual refresh cancels any pending debounced refresh and executes immediately. State-mutating commands (create, delete, prune) immediately invalidate cache, cancel pending debounced refreshes, and trigger an immediate refresh — they do not wait for the FileSystemWatcher.

**Lazy Loading**: Workspace files are scanned only when a worktree node is expanded (`collapsibleState: Collapsed`). Results capped at 10 per worktree. If more than 10 files found, show an informational TreeItem: label "Showing first 10 of N workspace files", icon `ThemeIcon("info")`, `contextValue = "info"` (no menu items), `collapsibleState: None`.

### 4.2 Worktree Discovery

Use `git worktree list --porcelain` with 5s timeout. Works from both main repo and any worktree (shared `.git` metadata).

Output format:
```
worktree /Users/v/repo/myproject
HEAD abc1234
branch refs/heads/main

worktree /Users/v/wt/auth
HEAD def5678
branch refs/heads/feature/auth

worktree /Users/v/wt/experiment
HEAD 789abcdef
detached
```

**Current detection**: Run `git rev-parse --show-toplevel` in the first workspace folder that contains a `.git` file/directory, then normalize both the result and parsed worktree paths with `fs.realpathSync()` before comparing (handles symlinks). If the command fails (e.g., bare repository), fall back to comparing `fs.realpathSync(workspaceFolder.uri.fsPath)` against normalized worktree paths directly.

**Prunable detection**: Check if worktree directory exists on disk. Show with warning icon if missing.

**Caching**: Results cached for 5s. Cache invalidated on FileSystemWatcher events and manual refresh.

### 4.3 Workspace File Scanning

Scan each worktree directory for `.code-workspace` files using `vscode.workspace.findFiles()` with a `RelativePattern` scoped to the worktree's URI: `new vscode.RelativePattern(vscode.Uri.file(worktreePath), includePattern)`. This allows scanning worktree directories that are outside the currently opened workspace.

**Default**: Root directory only (`["*.code-workspace"]`).

**Configurable** via include/exclude arrays. Users can change to `["**/*.code-workspace"]` for recursive scanning. Max 10 results per worktree.

### 4.4 Open Behavior

**Click action**: Opens the workspace file (or folder if no workspace file).

**Default mode**: Ask — shows a quick pick with:
- "Open in New Window"
- "Open in Current Window"
- "Always Open in New Window" (updates `git-work-grove.openBehavior` setting)
- "Always Open in Current Window" (updates `git-work-grove.openBehavior` setting)

**Setting**: `ask` | `newWindow` | `currentWindow`

**Quick pick option → setting value mapping**:
- "Always Open in New Window" → `"newWindow"`
- "Always Open in Current Window" → `"currentWindow"`

**API**: `vscode.commands.executeCommand("vscode.openFolder", workspaceFileUri, { forceNewWindow: boolean })`

**Context menu**: Always shows both "Open in New Window" and "Open in Current Window" regardless of default setting.

### 4.5 Create Worktree

Command: `gitWorkGrove.createWorktree`

**Branch picker** (step 1):
- Local branches: `git branch --format='%(refname:short)'`
- Remote branches: `git branch -r --format='%(refname:short)'` — displayed as-is (e.g., `origin/feature`). Selecting a remote branch creates a local tracking branch automatically via `git worktree add`.
- "Create new branch" option: if selected →
  1. Input box for new branch name
  2. Quick pick to select base ref (local branches + `HEAD`)
  3. Command becomes: `git worktree add -b <new-branch> <path> <base>`

**Flow**:
1. Show branch picker (see above)
2. Input box for worktree directory path (default: `<defaultWorktreePath>/<branch-name>`)
3. Validate path:
   - Resolve to absolute path, normalize, then resolve symlinks
   - Must not be (or be a subdirectory of) system directories:
     - Unix/macOS: `/etc`, `/usr`, `/bin`, `/sbin`, `/System`, `/Library`, `/private`
     - Windows: `C:\Windows`, `C:\Program Files`, `C:\Program Files (x86)`
   - Must not be a Windows UNC path (`\\server\share`, `\\?\UNC\`) or device path (`\\.\`, `\\?\`)
   - Use `startsWith()` on the resolved path to catch subdirectories
4. Execute `git worktree add <path> <branch>` (or `-b` variant for new branch)
5. If trusted: copy files matching copy patterns (skip files that already exist). If worktree directory disappears between step 4 and 5 (e.g., external cleanup), the copy phase catches `ENOENT` and shows error notification (see Section 4.9 error handling).
6. If trusted: run post-create hook commands if configured
7. Refresh tree view
8. Ask user: "Open the new worktree?" — quick pick with "Open in New Window" / "Open in Current Window" / "Don't Open"

**Command execution**: All git commands use `child_process.spawn()` with arguments array (never shell string concatenation) to prevent command injection via branch names or paths.

### 4.6 Delete Worktree

Command: `gitWorkGrove.deleteWorktree`

Flow:
1. Quick pick to select worktree (or right-click from tree)
2. Prevent deletion if the worktree is the current window's workspace — enforced at **command level** (not just menu `when` clause), since the command is also callable from Command Palette
3. Verify path exists in `git worktree list --porcelain` output before proceeding
4. Confirmation dialog
5. If worktree has an associated branch (skip for detached HEAD): offer option to also delete the branch:
   - First attempt `git branch -d <branch>` (safe delete, fails if unmerged)
   - If `-d` fails, show confirmation: "Branch has unmerged changes. Force delete?" with warning that this cannot be undone
   - If user confirms force delete, use `git branch -D <branch>`
   - If branch deletion fails for any reason other than user cancellation, abort entire operation and show error
6. Execute `git worktree remove <path>`
7. Refresh tree view

### 4.7 Prune Worktrees

Command: `gitWorkGrove.pruneWorktrees`

Executes `git worktree prune` to clean up stale worktree records where the directory has been manually deleted.

### 4.8 Favorites

Users can mark worktrees as favorites.

- Toggle via context menu or inline action (star icon)
- Favorites group shown at top of tree view (separate section, hidden when no favorites)
- Persisted in `context.workspaceState` (favorites are per-project)
- Storage key: `gitWorkGrove.favorites`, value: `string[]` of absolute worktree paths
- Stale entries (worktree paths absent from `git worktree list` output) are removed from favorites on each refresh. When entries are removed, show info notification: "N worktree(s) removed from favorites (no longer exist)". Prunable worktrees (missing directory but still in git metadata) remain in favorites and show with warning icon.

### 4.9 Copy Patterns

When creating a new worktree, copy files from the **source worktree** (the current workspace folder from which the Create Worktree command was invoked) matching include patterns, excluding those matching exclude patterns. Runs **after** `git worktree add`.

**Implementation**: Uses `vscode.workspace.findFiles()` with `RelativePattern` scoped to the source worktree URI for pattern matching. Patterns containing `..` segments are rejected (prevents path traversal outside the source worktree). Symlinks are not followed. Copy uses `fs.copyFile(src, dest, fs.constants.COPYFILE_EXCL)` — the `COPYFILE_EXCL` flag atomically skips files that already exist (no separate `existsSync()` check needed, avoids TOCTOU). `EEXIST` errors are caught and silently skipped. Additionally, all resolved source file paths are verified to be within the source worktree directory before copying.

**Error handling**:
- Target worktree directory `ENOENT` (deleted externally after creation): abort copy phase + show error "Worktree directory was deleted after creation" with "Prune" action
- Source file unreadable: skip + log warning, continue
- Target directory unwritable: skip all remaining copies + show error notification
- `findFiles()` failure: skip entire copy phase + log error, continue to hooks
- Individual `copyFile()` failure (other than `EEXIST`): skip + log warning, continue

**Settings** (scope: `application` — not overridable by workspace settings):
```jsonc
{
  "git-work-grove.copyPatterns.include": [".env.local"],
  "git-work-grove.copyPatterns.exclude": ["node_modules/**", ".git/**"]
}
```

### 4.10 Post-Create Hook

Run shell command(s) after worktree creation and file copying completes.

**Setting** (scope: `application` — not overridable by workspace settings):
```jsonc
{
  "git-work-grove.postCreateCommands": ["pnpm install"]
}
```

**Execution environment**:
- Working directory: the newly created worktree path
- Execution: `child_process.spawn(vscode.env.shell, ['-c', command])` — shell execution is intentional since commands like `pnpm install` require shell features. The security boundary is `application` scope + `restricted` + confirmation dialog (not input sanitization).
- Environment variables: inherited from VS Code process

**Security**:
- Disabled in untrusted workspaces (`vscode.workspace.isTrusted` check)
- Only reads from user/machine settings (scope: `application`, `restricted: true`), never from workspace `.vscode/settings.json`
- Shows confirmation dialog listing all commands before execution
- Execution uses `vscode.window.withProgress()` with cancel button
- 60-second timeout per command
- Output shown in "Git WorkGrove" output channel

**Cancel behavior**: When user clicks cancel, send `SIGTERM` to the running process. Skip all remaining commands. The worktree itself is kept (already created in step 4). Show info notification: "Post-create commands cancelled. Worktree created successfully."

**Error handling**: If a command fails, stop remaining commands. Show error notification with "Show Logs" action.

---

## 5. Settings Summary

| Setting | Type | Default | Scope | Description |
|---------|------|---------|-------|-------------|
| `git-work-grove.openBehavior` | `"ask"` \| `"newWindow"` \| `"currentWindow"` | `"ask"` | user | Default action when opening a workspace |
| `git-work-grove.pinCurrent` | `boolean` | `false` | user | Pin current worktree to top of list |
| `git-work-grove.defaultWorktreePath` | `string` | `""` | user | Default directory for new worktrees (relative to the main worktree root from `git rev-parse --show-toplevel`, e.g. `../worktrees`). Empty = prompt every time. |
| `git-work-grove.workspaceFile.include` | `string[]` | `["*.code-workspace"]` | user | Glob patterns for workspace file scanning |
| `git-work-grove.workspaceFile.exclude` | `string[]` | `[]` | user | Glob patterns to exclude from scanning |
| `git-work-grove.copyPatterns.include` | `string[]` | `[]` | application (restricted) | Files to copy when creating worktree |
| `git-work-grove.copyPatterns.exclude` | `string[]` | `["node_modules/**", ".git/**"]` | application (restricted) | Files to exclude from copying |
| `git-work-grove.postCreateCommands` | `string[]` | `[]` | application (restricted) | Commands to run after worktree creation |

Settings marked `restricted` require **two declarations**:
1. `"restricted": true` in the configuration JSON Schema (marks as security-sensitive)
2. Full setting IDs listed in the top-level `restrictedConfigurations` array (Section 6.6)

When both are present, VS Code only returns user-defined values for these settings in Restricted Mode.

---

## 6. VS Code Contribution Points

### 6.1 Activation Events

No explicit `activationEvents` needed. Since VS Code 1.74.0+, contributed views automatically trigger extension activation when rendered. View visibility is controlled by `when: "gitOpenRepositoryCount > 0"`.

### 6.2 Views

```jsonc
{
  "views": {
    "scm": [
      {
        "id": "gitWorkGrove.worktrees",
        "name": "WorkGrove",
        "icon": "$(folder-library)",
        "when": "gitOpenRepositoryCount > 0",
        "contextualTitle": "Git WorkGrove"
      }
    ]
  }
}
```

### 6.3 View Welcome

```jsonc
{
  "viewsWelcome": [
    {
      "view": "gitWorkGrove.worktrees",
      "contents": "No worktrees found.\n[Create Worktree](command:gitWorkGrove.createWorktree)",
      "when": "gitWorkGrove.hasRepository"
    },
    {
      "view": "gitWorkGrove.worktrees",
      "contents": "Git is not available.\n[Learn More](https://git-scm.com)",
      "when": "gitWorkGrove.gitUnavailable"
    }
  ]
}
```

Context keys: `gitWorkGrove.hasRepository` and `gitWorkGrove.gitUnavailable` are mutually exclusive. If `git --version` fails, `gitUnavailable` is set to `true`. See Section 7 for lifecycle details.

### 6.4 Commands

| Command | Title | Icon | Enablement |
|---------|-------|------|------------|
| `gitWorkGrove.createWorktree` | Git WorkGrove: Create Worktree | `$(plus)` | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.deleteWorktree` | Git WorkGrove: Delete Worktree | `$(trash)` | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.pruneWorktrees` | Git WorkGrove: Prune Worktrees | | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.openInNewWindow` | Git WorkGrove: Open in New Window | `$(link-external)` | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.openInCurrentWindow` | Git WorkGrove: Open in Current Window | `$(window)` | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.toggleFavorite` | Git WorkGrove: Toggle Favorite | `$(star)` | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.refresh` | Git WorkGrove: Refresh | `$(refresh)` | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.showOutput` | Git WorkGrove: Show Output | | |

All commands except `showOutput` use `enablement` to prevent execution from Command Palette when no repository is detected. The `gitWorkGrove.hasRepository` context key is set programmatically via `vscode.commands.executeCommand("setContext", ...)` — it does not need a `package.json` declaration.

### 6.5 Menus

```jsonc
{
  "menus": {
    "view/title": [
      {
        "command": "gitWorkGrove.createWorktree",
        "when": "view == gitWorkGrove.worktrees",
        "group": "navigation@1"
      },
      {
        "command": "gitWorkGrove.refresh",
        "when": "view == gitWorkGrove.worktrees",
        "group": "navigation@2"
      },
      {
        "command": "gitWorkGrove.pruneWorktrees",
        "when": "view == gitWorkGrove.worktrees",
        "group": "overflow"
      }
    ],
    "view/item/context": [
      {
        "command": "gitWorkGrove.openInNewWindow",
        "when": "view == gitWorkGrove.worktrees && viewItem =~ /^worktree|^workspaceFile/",
        "group": "navigation@1"
      },
      {
        "command": "gitWorkGrove.openInCurrentWindow",
        "when": "view == gitWorkGrove.worktrees && viewItem =~ /^worktree|^workspaceFile/",
        "group": "navigation@2"
      },
      {
        "command": "gitWorkGrove.toggleFavorite",
        "when": "view == gitWorkGrove.worktrees && viewItem =~ /^worktree/",
        "group": "inline"
      },
      {
        "command": "gitWorkGrove.deleteWorktree",
        "when": "view == gitWorkGrove.worktrees && viewItem =~ /^worktree/ && viewItem != worktree.current && viewItem != worktree.current.favorite",
        "group": "7_modification"
      }
    ]
  }
}
```

### 6.6 Restricted Configurations

```jsonc
{
  "restrictedConfigurations": [
    "git-work-grove.copyPatterns.include",
    "git-work-grove.copyPatterns.exclude",
    "git-work-grove.postCreateCommands"
  ]
}
```

This top-level `package.json` array is **required** in addition to marking individual settings with `"restricted": true` in their JSON Schema. It tells VS Code which settings should only use user/machine values (never workspace values) when in Restricted Mode.

---

## 7. Error Handling

### General Strategy

All errors follow this pattern:
1. Log detailed message (with stack trace) to "Git WorkGrove" output channel
2. Show user-facing notification with actionable message
3. Include "Show Logs" action button in error notifications
4. Use `showWarningMessage` for expected failures, `showErrorMessage` for unexpected ones

### Git Command Execution

All git commands use `child_process.spawn()` with arguments passed as an array (never shell string interpolation). This prevents command injection via branch names, paths, or other user-provided values.

### Git Command Timeouts

| Command | Timeout |
|---------|---------|
| `git --version`, `git rev-parse` | 5s |
| `git worktree list --porcelain` | 5s |
| `git worktree add`, `git worktree remove` | 30s |
| `git branch -d/-D` | 5s |
| Post-create commands | 60s each |

### Git Availability

On activation, verify `git --version` succeeds. If not, show error message with "Learn More" action and set `gitWorkGrove.hasRepository` to `false`.

### Prunable Worktrees

If `git worktree list` returns a worktree whose directory doesn't exist on disk, show it with a warning icon and tooltip "Directory missing — run Prune to clean up".

### Workspace Trust

| Feature | Trusted | Untrusted |
|---------|---------|-----------|
| Tree View | Enabled | Enabled |
| Open Workspace | Enabled | Enabled |
| Create Worktree | Enabled | Enabled (no hooks/copy) |
| Copy Patterns | Enabled | Disabled |
| Post-Create Hook | Enabled | Disabled |

Listen for `vscode.workspace.onDidGrantWorkspaceTrust` to re-enable features.

### Multi-root Workspace

Use `git rev-parse --show-toplevel` from the first workspace folder that contains a `.git` file/directory. If the command fails (e.g., bare repository), fall back to direct path comparison. If no git repository found at all, set `gitWorkGrove.hasRepository` to `false`.

### Context Key Lifecycle

**`gitWorkGrove.hasRepository`** — initial value: `false` (set synchronously in `activate()` before async checks begin). Updated to `true` when all of:
- At least one workspace folder exists
- `git --version` succeeds
- At least one workspace folder contains a `.git` file/directory

Updated on:
- Extension activation (async check, initial `false` prevents commands firing during init)
- `vscode.workspace.onDidChangeWorkspaceFolders` event

Set to `false` otherwise. Gates the welcome view content (Section 6.3) and command `enablement` (Section 6.4).

**`gitWorkGrove.gitUnavailable`** — initial value: `false`. Set to `true` when `git --version` fails. Mutually exclusive with `hasRepository`. Gates the "Git is not available" welcome view content (Section 6.3).

---

## 8. Architecture

```
src/
├── extension.ts              # activate / deactivate + DI wiring
├── constants.ts              # Command IDs, view IDs, config keys
├── types.ts                  # Shared type definitions
├── commands/
│   ├── createWorktree.ts
│   ├── deleteWorktree.ts
│   ├── openWorkspace.ts
│   ├── pruneWorktrees.ts
│   └── toggleFavorite.ts
├── views/
│   ├── worktreeTreeProvider.ts    # TreeDataProvider + group header TreeItems
│   ├── worktreeItem.ts            # TreeItem for worktree nodes
│   └── workspaceFileItem.ts       # TreeItem for workspace file nodes
├── services/
│   ├── gitWorktreeService.ts      # git worktree list --porcelain parsing + caching
│   ├── workspaceScanner.ts        # .code-workspace file discovery
│   ├── favoritesService.ts        # Favorites persistence (workspaceState)
│   ├── copyService.ts             # Copy patterns logic
│   └── postCreateService.ts       # Post-create hook execution
└── utils/
    ├── pathAbbreviation.ts        # Home directory path shortening
    ├── config.ts                  # Settings reader
    └── outputChannel.ts           # Logging
```

### Dependency Injection

All services instantiated in `activate()` and passed to consumers via constructor parameters. No singletons or global state.

```typescript
export async function activate(context: vscode.ExtensionContext) {
  const gitService = new GitWorktreeService();
  const scanner = new WorkspaceScanner();
  const favorites = new FavoritesService(context.workspaceState);
  const treeProvider = new WorktreeTreeProvider(gitService, scanner, favorites);
  // ... register commands, views, watchers
}
```

---

## 9. Data Flow

### Opening a Workspace

```
User clicks workspace file in tree
  → Check openBehavior setting
  → If "ask": show quick pick with 4 options
  → If user picks "Always ...": update setting, then open
  → vscode.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow })
```

### Creating a Worktree

```
User triggers gitWorkGrove.createWorktree
  → Show branch picker (local + remote branches, "Create new branch")
  → Show input for worktree path (default from defaultWorktreePath setting)
  → Validate path (no system directories)
  → git worktree add <path> <branch>
  → If trusted: copy files per copyPatterns (skip existing, COPYFILE_EXCL)
  → If trusted: show confirmation dialog listing commands, then run with progress UI
  → Refresh tree view
  → Ask user: open new worktree? (New Window / Current Window / Don't Open)
```

### Refreshing the Tree

```
FileSystemWatcher detects change in <git-common-dir>/worktrees/
  → 500ms debounce
  → gitWorktreeService.list() (invalidates cache)
  → worktreeTreeProvider.refresh()
  → Workspace files loaded lazily on node expand
```

---

## 10. Project Setup

### package.json Key Fields

```jsonc
{
  "name": "git-work-grove",
  "displayName": "Git WorkGrove",
  "description": "Workspace-first worktree manager for VS Code",
  "version": "0.1.0",
  "publisher": "vdustr",
  "license": "MIT",
  "icon": "icon.png",
  "categories": ["SCM Providers"],
  "keywords": ["git", "worktree", "workspace", "code-workspace", "source-control"],
  "repository": {
    "type": "git",
    "url": "https://github.com/vdustr/vscode-extension-git-work-grove.git"
  },
  "bugs": {
    "url": "https://github.com/vdustr/vscode-extension-git-work-grove/issues"
  },
  "homepage": "https://github.com/vdustr/vscode-extension-git-work-grove#readme",
  "qna": "marketplace",
  "preview": true,
  "engines": {
    "vscode": "^1.95.0"
  },
  "main": "./dist/extension.js"
}
```

**VS Code `^1.95.0`**: Uses Electron 31 / Node.js 20. Required for `ThemeIcon` color parameter support.

### Scripts

```jsonc
{
  "scripts": {
    "build": "esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --minify --target=node20",
    "build:dev": "esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --sourcemap --target=node20",
    "watch": "pnpm run build:dev --watch",
    "lint:es": "eslint .",
    "lint:es:dry": "eslint . --fix-dry-run",
    "lint:oxfmt": "oxfmt --check .",
    "lint:oxfmt:dry": "oxfmt .",
    "test": "vitest run",
    "package": "vsce package",
    "publish": "vsce publish"
  }
}
```

### .vscodeignore

```
.vscode/**
.vscode-test/**
src/**
node_modules/**
.gitignore
eslint.config.*
.oxfmtrc.json
tsconfig.json
*.md
!README.md
!CHANGELOG.md
!LICENSE
```

### Required Project Files

- `icon.png` — 128x128 PNG for Marketplace
- `README.md` — Feature overview with screenshots/GIF
- `CHANGELOG.md` — Keep a Changelog format
- `LICENSE` — MIT

---

## 11. Testing Strategy

### Unit Tests (vitest)

- `gitWorktreeService`: porcelain output parsing (normal, detached, bare, prunable)
- `pathAbbreviation`: home shortening across platforms
- `workspaceScanner`: glob pattern matching
- `favoritesService`: toggle, persistence

### Integration Tests (@vscode/test-electron)

- TreeDataProvider: getChildren, getTreeItem, refresh
- Commands: createWorktree, deleteWorktree flow
- FileSystemWatcher: debounce behavior

### Manual Testing Checklist

- Light/dark theme icon rendering
- No worktrees (empty state / welcome view)
- Multiple workspace files per worktree
- Prunable worktree display
- Windows / macOS / Linux path handling

---

## 12. References

### VS Code — Git Worktree

- [Git - Support git worktrees in workspace #68038](https://github.com/microsoft/vscode/issues/68038) — The original feature request for worktree support in VS Code
- [Support the worktree options in the source control command menu #190958](https://github.com/microsoft/vscode/issues/190958) — Request for worktree commands in SCM menu
- [SCM doesn't show worktrees and repositories when using bare repository #267606](https://github.com/microsoft/vscode/issues/267606) — Bare repo + worktree SCM visibility issue
- [Relative worktrees are not detected #282227](https://github.com/microsoft/vscode/issues/282227) — `git.detectWorktrees` fails on relative paths
- [Default worktree location has no write permission in dev container #277754](https://github.com/microsoft/vscode/issues/277754) — Dev container worktree path permission issue

### VS Code — Workspace Files

- [Support .code-workspace.local files for untracked local setting overrides #282806](https://github.com/microsoft/vscode/issues/282806) — Request for per-checkout workspace settings
- [Open workspace from file uses wrong workspace folder path #179763](https://github.com/microsoft/vscode/issues/179763) — Bug when opening workspace files

### VS Code — Extension API

- [Disable tree items when enablement clause on linked command is false #102794](https://github.com/microsoft/vscode/issues/102794) — TreeItem enablement behavior
- [TreeDataProvider.getChildren is called on extension activation #27745](https://github.com/microsoft/vscode/issues/27745) — Lazy loading implications for TreeDataProvider

### GitLens — Worktree + Workspace

- [Open workspace file instead of root folder when opening a worktree #4016](https://github.com/gitkraken/vscode-gitlens/issues/4016) — Core pain point this extension addresses
- [Improve workspace + worktree experience #4453](https://github.com/gitkraken/vscode-gitlens/issues/4453) — GitLens umbrella issue for worktree UX improvements
- [Workspace settings are lost when switching between worktrees #1956](https://github.com/gitkraken/vscode-gitlens/issues/1956) — Settings lost on worktree switch
- [Add back option to add worktree to workspace on creation #3160](https://github.com/gitkraken/vscode-gitlens/issues/3160) — Request for workspace integration on create
