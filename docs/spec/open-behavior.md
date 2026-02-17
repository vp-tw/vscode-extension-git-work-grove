# Open Behavior Specification

Controls how items are opened when clicked or via context menu commands.

## Setting

| Setting | Type | Default | Scope |
|---|---|---|---|
| `git-work-grove.openBehavior` | `"ask" \| "newWindow" \| "currentWindow"` | `"ask"` | resource |

## Modes

### `"ask"` (default)

Shows a QuickPick with 4 options:

1. **Open in New Window** — opens once in new window
2. **Open in Current Window** — opens once in current window
3. **Always Open in New Window** — persists `"newWindow"` to global settings, then opens
4. **Always Open in Current Window** — persists `"currentWindow"` to global settings, then opens

The "Always" options update the setting globally, so future clicks use the new mode.

### `"newWindow"`

Opens the target in a new VS Code window (`forceNewWindow: true`).

### `"currentWindow"`

Opens the target in the current VS Code window (`forceNewWindow: false`).

## Trigger Points

| Trigger | Behavior |
|---|---|
| Click on `WorkspaceFileItem` | Uses `openBehavior` setting |
| Click on `FavoriteItem` | Uses `openBehavior` setting |
| Click on `WorktreeItem` | Expands/collapses only (no open) |
| Context menu "Open in New Window" | Always new window (ignores setting) |
| Context menu "Open in Current Window" | Always current window (ignores setting) |

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
