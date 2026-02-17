# Current Indicator Specification

The "current" indicator (green icon + `●` badge) highlights the **single most specific item** the user currently has open.

## Rule

**Only ONE item shows the current indicator at any time.** When a workspace file is open, the workspace file item is current — NOT its parent worktree/repository.

## Four Cases

| Case | VS Code has open | Current item | Parent item |
|---|---|---|---|
| **repo** | Main worktree folder (no `.code-workspace`) | Repository header | — |
| **repo workspace** | `.code-workspace` under main worktree | WorkspaceFileItem | Repository header is NOT current |
| **worktree** | Linked worktree folder (no `.code-workspace`) | WorktreeItem | — |
| **worktree workspace** | `.code-workspace` under linked worktree | WorkspaceFileItem | WorktreeItem is NOT current |

## Detection Logic

Two inputs determine which item is current:

- `WorktreeInfo.isCurrent` — `true` when VS Code's working directory is inside this worktree
- `workspaceFilePath` — the `.code-workspace` file path if one is open, or `undefined`

### Worktree / Repository display-current

```
displayCurrent = worktree.isCurrent && workspaceFilePath === undefined
```

A worktree (or repository header) shows current only when:
1. VS Code is inside that worktree (`isCurrent === true`)
2. No workspace file is open (`workspaceFilePath === undefined`)

If a workspace file IS open, the worktree still expands (for navigation convenience) but does NOT show the green current indicator.

### Workspace file display-current

```
displayCurrent = workspaceFilePath === filePath
```

A workspace file shows current when it is the exact file VS Code has open.

## Visual Effects

When `displayCurrent` is `true`:

| Effect | Source |
|---|---|
| Green icon tint | `new vscode.ThemeColor("terminal.ansiGreen")` on `ThemeIcon` |
| `●` badge | `CurrentDecorationProvider` via `resourceUri` with `query: "current"` |
| `.current` in `contextValue` | Enables current-specific menu items |

## Favorites

Favorite items mirror the current state of their original item. A favorited worktree shows current when the worktree itself would show current. A favorited workspace file shows current when that workspace file is open. The same single-current-item rule applies.

## Expansion Behavior

Worktrees and repository headers expand based on `worktree.isCurrent`, NOT `displayCurrent`. This means:

- **repo workspace** case: Repository header expands (so the user sees the current workspace file) but does NOT show green
- **worktree workspace** case: WorktreeItem expands but does NOT show green
