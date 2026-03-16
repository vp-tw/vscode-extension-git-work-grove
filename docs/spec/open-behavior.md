# Open Behavior Specification

Controls how items are opened when clicked or via context menu commands.

## Setting

| Setting | Type | Default | Scope |
|---|---|---|---|
| `git-work-grove.openBehavior` | `"ask" \| "newWindow" \| "currentWindow" \| "terminal"` | `"ask"` | resource |

## Modes

### `"ask"` (default)

Shows a QuickPick with 6 options:

1. **Open in New Window** — opens once in new window
2. **Open in Current Window** — opens once in current window
3. **Open in Terminal** — opens once in terminal
4. **Always Open in New Window** — persists `"newWindow"` to global settings, then opens
5. **Always Open in Current Window** — persists `"currentWindow"` to global settings, then opens
6. **Always Open in Terminal** — persists `"terminal"` to global settings, then opens terminal

The "Always" options update the setting globally, so future clicks use the new mode.

### `"newWindow"`

Opens the target in a new VS Code window (`forceNewWindow: true`).

### `"currentWindow"`

Opens the target in the current VS Code window (`forceNewWindow: false`).

### `"terminal"`

Opens a new VS Code terminal at the item's location instead of opening a window. See [Open in Terminal spec](open-in-terminal.md) for CWD resolution and terminal naming details.

## Trigger Points

| Trigger | Behavior |
|---|---|
| Click on `WorkspaceFileItem` | Uses `openBehavior` setting |
| Click on `FavoriteItem` | Uses `openBehavior` setting |
| Click on `WorktreeItem` (has children) | Expands/collapses only (no open) |
| Click on `WorktreeItem` (leaf, no workspace files) | Uses `openBehavior` setting |
| Click on `GroupHeaderItem` (repository, has children) | Expands/collapses only (no open) |
| Click on `GroupHeaderItem` (repository, leaf, no workspace files) | Uses `openBehavior` setting |
| Context menu "Open in New Window" | Always new window (ignores setting) |
| Context menu "Open in Current Window" | Always current window (ignores setting) |
| Context menu "Open in Terminal" | Always opens terminal (ignores setting) |

## URI Resolution

All open commands resolve a `vscode.Uri` from the tree item:

| Item type | Property used |
|---|---|
| `FavoriteItem` | `favoritePath` |
| `WorkspaceFileItem` | `workspaceFileInfo.path` |
| `WorktreeItem` | `worktreeInfo.path` |

Detection order: `"favoritePath" in item` → `"workspaceFileInfo" in item` → `"worktreeInfo" in item`

## Current Item Skip

When clicking items via `onDidChangeSelection`, items with `"current"` in their `contextValue` are skipped — reopening the already-open item is a no-op.

## Implementation

- `openFolder()` — delegates to `vscode.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow })`
- `askAndOpen()` — shows QuickPick, optionally persists setting
- `openWithBehavior()` — dispatches based on current setting
- `openDefault()` — entry point for click handler, reads setting and delegates
