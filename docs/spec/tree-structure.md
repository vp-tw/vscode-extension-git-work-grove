# Tree Structure Specification

The WorkGrove tree view (`gitWorkGrove.worktrees`) displays in the Source Control sidebar. It organizes items into a flat, predictable hierarchy.

## The 4 Fundamental Types

Every displayable item belongs to one of 4 categories based on two axes:

|  | Repository (main worktree) | Linked worktree |
|---|---|---|
| **Worktree itself** | Repository | Worktree |
| **Workspace file under it** | Repository Workspace | Worktree Workspace |

These 4 types determine icons, templates, context values, and behaviors throughout the extension.

## Tree Hierarchy

```
[Favorites section]           ← GroupHeaderItem (only when favorites exist)
  FavoriteItem (repo)         ← leaf node
  FavoriteItem (worktree)     ← leaf node
  FavoriteItem (workspace)    ← leaf node

[Repository section]          ← GroupHeaderItem wrapping main worktree
  WorkspaceFileItem           ← workspace file under main worktree

[Linked worktrees]            ← WorktreeItem (flat, alphabetically sorted)
  WorkspaceFileItem           ← workspace file under linked worktree

[More linked worktrees...]
```

## Node Types

### GroupHeaderItem

Used for structural grouping. Has two variants:

1. **Favorites header** — `label: "Favorites"`, holds `favoriteItems: FavoriteItem[]`. `contextValue: "group"`.
2. **Repository header** — Represents the main worktree. Holds `worktreeInfo: WorktreeInfo`. `contextValue: "repository[.current][.favorite]"`.

Repository header uses template-driven label/description via `template.repository.*` settings.

### WorktreeItem

Represents a linked worktree. Each is a direct child of the root.

- `contextValue: "worktree[.main][.current][.prunable][.favorite]"`
- Icon: `$(worktree)`, or `$(repo)` if main, or `$(warning)` if prunable
- Green tint when `displayCurrent` is true
- Collapsible when workspace files exist; `None` when empty

### WorkspaceFileItem

Represents a `.code-workspace` file found in a worktree directory.

- `contextValue: "workspaceFile[.current][.favorite]"`
- Icon: `$(window)`, green tint when current
- Always a leaf node (`CollapsibleState.None`)
- Template selection depends on parent: `repositoryWorkspace.*` vs `worktreeWorkspace.*`

### FavoriteItem

A shortcut to any favorited item, displayed in the Favorites section.

- `contextValue: "favorite.repo[.current]"` / `"favorite.worktree[.current]"` / `"favorite.workspaceFile[.current]"`
- Always a leaf node (`CollapsibleState.None`)
- Icon matches the original item type: `$(repo)`, `$(worktree)`, or `$(window)`
- Template selection uses the `favorite*` variant, with repo/worktree workspace distinction

### InfoItem

Informational message (e.g., "Showing first 10 of 15 workspace files").

- `contextValue: "info"`
- Icon: `$(info)`
- Leaf node, no interactions

## Collapsible State Rules

| Item | Has children | isCurrent | State |
|---|---|---|---|
| Repository header | yes | yes | Expanded |
| Repository header | yes | no | Collapsed |
| Repository header | no | any | None |
| WorktreeItem | yes | yes | Expanded |
| WorktreeItem | yes | no | Collapsed |
| WorktreeItem | no | any | None |
| FavoriteItem | — | — | None (always leaf) |
| WorkspaceFileItem | — | — | None (always leaf) |

Note: "Has children" means at least one workspace file exists in the worktree directory (determined by `WorkspaceScanner.scan()`). `isCurrent` for expansion uses `WorktreeInfo.isCurrent`, NOT `displayCurrent` (see current-indicator.md).

## Icons

| Item type | Normal | Current (green) | Prunable |
|---|---|---|---|
| Repository | `$(repo)` | `$(repo)` + green | — |
| Worktree | `$(worktree)` | `$(worktree)` + green | `$(warning)` |
| Workspace file | `$(window)` | `$(window)` + green | — |
| Favorite (repo) | `$(repo)` | `$(repo)` + green | — |
| Favorite (worktree) | `$(worktree)` | `$(worktree)` + green | — |
| Favorite (workspace) | `$(window)` | `$(window)` + green | — |

Green color: `new vscode.ThemeColor("terminal.ansiGreen")`

## Tooltips

All items use a unified tooltip format via `buildTooltip()` (`src/utils/tooltip.ts`). Fields shown in order:

| Field | When shown | Example |
|---|---|---|
| `● Current` | Item is the current item | `● Current` |
| **Type** | Always | `Repository`, `Worktree`, `Repository Workspace`, `Worktree Workspace` |
| **Path** | Always | `/path/to/item` |
| **Branch** | Worktree has a branch | `main`, `feat/auth` |
| **HEAD** | Worktree is detached (no branch) | `detached` |
| **Commit** | Worktree info available | `abc12345` (first 8 chars) |
| ⚠ Warning | Item is prunable | `Directory missing — run Prune to clean up` |

Tooltip type names map to the 4 fundamental types:

| Item | Tooltip type |
|---|---|
| Repository header | `Repository` |
| Linked worktree | `Worktree` |
| Workspace file under repository | `Repository Workspace` |
| Workspace file under worktree | `Worktree Workspace` |

Favorite items use the same type names as their original items.

## Sorting

Linked worktrees are sorted alphabetically by `name` (`localeCompare`). Repository always appears first (after Favorites). Favorites maintain user-defined order.
