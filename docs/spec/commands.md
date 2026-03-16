# Commands Specification

All commands use the `gitWorkGrove.*` prefix.

## Command Registry

| Command ID | Title | Icon | Enablement |
|---|---|---|---|
| `pruneWorktrees` | Prune Worktrees | — | `gitWorkGrove.hasRepository` |
| `openInNewWindow` | Open in New Window | `$(link-external)` | `gitWorkGrove.hasRepository` |
| `openInCurrentWindow` | Open in Current Window | `$(window)` | `gitWorkGrove.hasRepository` |
| `addFavorite` | Add Favorite | `$(star-empty)` | `gitWorkGrove.hasRepository` |
| `removeFavorite` | Remove Favorite | `$(star-full)` | `gitWorkGrove.hasRepository` |
| `moveFavoriteUp` | Move Favorite Up | `$(chevron-up)` | `gitWorkGrove.hasRepository` |
| `moveFavoriteDown` | Move Favorite Down | `$(chevron-down)` | `gitWorkGrove.hasRepository` |
| `copyName` | Copy Name | — | `gitWorkGrove.hasRepository` |
| `copyPath` | Copy Path | — | `gitWorkGrove.hasRepository` |
| `openInTerminal` | Open in Terminal | `$(terminal)` | `gitWorkGrove.hasRepository` |
| `revealInOS` | Reveal in Finder | — | `gitWorkGrove.hasRepository` |
| `refresh` | Refresh | `$(refresh)` | `gitWorkGrove.hasRepository` |
| `showOutput` | Show Output | — | *(always)* |
| `cleanStaleFavorites` | Clean Stale Favorites | — | `gitWorkGrove.hasRepository` |

## Menu Placement

### View Title (`view/title`)

| Command | Group | When |
|---|---|---|
| `refresh` | `navigation@1` | `view == gitWorkGrove.worktrees` |
| `pruneWorktrees` | `overflow@1` | `view == gitWorkGrove.worktrees` |
| `cleanStaleFavorites` | `overflow@2` | `view == gitWorkGrove.worktrees` |

### Item Context (`view/item/context`)

| Command | Group | When clause |
|---|---|---|
| `openInNewWindow` | `navigation@1` | `viewItem =~ /^worktree\|^workspaceFile\|^repository\|^favorite\./` |
| `openInCurrentWindow` | `navigation@2` | *(same)* |
| `revealInOS` | `navigation@3` | *(same)* |
| `openInTerminal` | `navigation@4` | *(same)* |
| `copyName` | `5_cutcopypaste@1` | *(same)* |
| `copyPath` | `5_cutcopypaste@2` | *(same)* |
| `openInTerminal` | `inline` | `viewItem =~ /^worktree\|^workspaceFile\|^repository/` AND NOT `viewItem =~ /favorite/` |
| `addFavorite` | `inline` | `viewItem =~ /^worktree\|^workspaceFile\|^repository/` AND NOT `viewItem =~ /favorite/` |
| `removeFavorite` | `inline` | `viewItem =~ /favorite/` |
| `moveFavoriteUp` | `inline` | `viewItem =~ /^favorite\./` |
| `moveFavoriteDown` | `inline` | `viewItem =~ /^favorite\./` |

## Command Behaviors

### Open Commands

All open commands resolve a URI from the tree item:

- `WorktreeItem` → `worktreeInfo.path`
- `WorkspaceFileItem` → `workspaceFileInfo.path`
- `FavoriteItem` → `favoritePath`

`openInNewWindow` always opens in a new window. `openInCurrentWindow` always opens in the current window.

### Open in Terminal

Opens a new VS Code terminal at the item's location. See [Open in Terminal spec](open-in-terminal.md) for full details.

- `WorktreeItem` / `GroupHeaderItem` (repository) → cwd is `worktreeInfo.path`
- `WorkspaceFileItem` → cwd is `dirname(workspaceFileInfo.path)`
- `FavoriteItem` → resolved via duck-typing (same detection order as `resolveUri`)

Terminal name is rendered from `template.*.terminalName` settings (4 templates — favorites reuse non-favorite templates).

Prunable worktree guard: checks `fs.existsSync(cwd)` before creating the terminal. Shows a warning if the directory is missing.

### Default Open (click)

Handled by `treeView.onDidChangeSelection`, not a registered command. Triggers on:

- `FavoriteItem` click (when not current)
- `WorkspaceFileItem` click (when not current)
- `WorktreeItem` click (leaf only — `CollapsibleState.None`, i.e., no workspace files)
- `GroupHeaderItem` (repository) click (leaf only — `CollapsibleState.None`, i.e., no workspace files)

Uses `openBehavior` setting: `"ask"` shows a QuickPick, `"newWindow"` / `"currentWindow"` / `"terminal"` opens directly. The QuickPick includes "Always" options that persist the choice.

WorktreeItem and GroupHeaderItem (repository) clicks with children expand/collapse only (no open).

### Copy Name / Copy Path

Both commands apply to all actionable item types (`WorktreeItem`, `WorkspaceFileItem`, `FavoriteItem`).

- `copyName` — copies the item's display name to clipboard:
  - `WorktreeItem` → `worktreeInfo.name` (branch name)
  - `WorkspaceFileItem` → `workspaceFileInfo.name` (filename)
  - `FavoriteItem` → rendered label
- `copyPath` — copies the filesystem path to clipboard:
  - `WorktreeItem` → `worktreeInfo.path`
  - `WorkspaceFileItem` → `workspaceFileInfo.path`
  - `FavoriteItem` → `favoritePath`

### Prune

Runs `git worktree prune`, refreshes the tree. Shows error with "Show Logs" option on failure.

### Reveal in OS

Resolves the filesystem path (same as open commands) and executes `revealFileInOS`.

### Favorite Toggle

Accepts `WorktreeItem`, `WorkspaceFileItem`, or `FavoriteItem`:

- `FavoriteItem` → always removes
- Other items → toggles (add if not present, remove if present)

### Move Favorite

- `moveFavoriteUp` — swaps `favoriteIndex` with `favoriteIndex - 1` (no-op at 0)
- `moveFavoriteDown` — swaps `favoriteIndex` with `favoriteIndex + 1` (no-op at last)

### Refresh

Invalidates the git worktree cache and fires `onDidChangeTreeData`. Protected against concurrent refreshes via `isRefreshing` flag.

Debounced refresh (`debouncedRefresh`) used by FileSystemWatcher — 500ms debounce.

### Clean Stale Favorites

Builds a set of valid paths from: all worktree paths + favorites that exist on disk. Passes to `FavoritesService.cleanupStale()`.

## Context Keys

| Key | Set when |
|---|---|
| `gitWorkGrove.hasRepository` | A git repository is found in workspace folders |
| `gitWorkGrove.gitUnavailable` | `git --version` fails |
