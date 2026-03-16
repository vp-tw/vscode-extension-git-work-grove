# Open in Terminal Specification

Opens a new VS Code terminal at the item's filesystem location.

## Command

| Command ID | Title | Icon |
|---|---|---|
| `gitWorkGrove.openInTerminal` | Open in Terminal | `$(terminal)` |

## CWD Resolution

The working directory depends on the item type:

| Item type | CWD |
|---|---|
| `GroupHeaderItem` (repository) | `worktreeInfo.path` |
| `WorktreeItem` | `worktreeInfo.path` |
| `WorkspaceFileItem` | `dirname(workspaceFileInfo.path)` |
| `FavoriteItem` | Resolved via duck-typing (see detection order below) |

### Detection Order (duck-typing)

Same order as `resolveUri` in `open-behavior.md`:

1. `"favoritePath" in item` → resolve to underlying type
2. `"workspaceFileInfo" in item` → `dirname(workspaceFileInfo.path)`
3. `"worktreeInfo" in item && item.worktreeInfo` → `worktreeInfo.path`

## Terminal Naming

The terminal name is rendered from `template.*.terminalName` settings. Only 4 templates exist (one per non-favorite type). Favorites reuse the corresponding non-favorite template.

| Item type | Template setting |
|---|---|
| Repository | `template.repository.terminalName` |
| Worktree | `template.worktree.terminalName` |
| Repository Workspace | `template.repositoryWorkspace.terminalName` |
| Worktree Workspace | `template.worktreeWorkspace.terminalName` |

### Defaults

| Setting | Default |
|---|---|
| `template.repository.terminalName` | `{ref}` |
| `template.worktree.terminalName` | `{ref}` |
| `template.repositoryWorkspace.terminalName` | `{name}` |
| `template.worktreeWorkspace.terminalName` | `{name} ({ref})` |

Templates use the same variables and syntax as label/description templates. See [templates.md](templates.md) for variable reference.

## Prunable Worktree Guard

Before creating the terminal, checks `fs.existsSync(cwd)`. If the directory does not exist (prunable worktree), shows a warning message instead of creating the terminal.

## Error Handling

The `createTerminal` call is wrapped in a try/catch. On failure, shows an error message via `showErrorMessage` and logs the error via `logError`.

## Integration with openBehavior

The `openBehavior` setting now accepts `"terminal"` as a fourth option. When set, clicking an item (at trigger points listed in [open-behavior.md](open-behavior.md)) opens a terminal instead of a window.

Leaf worktree and repository items (`CollapsibleState.None`, i.e., no workspace files found) now trigger `openBehavior` on click. Previously these clicks were inert (only expand/collapse applied, and leaf items had nothing to expand).

## Menu Placement

- **Context menu**: `navigation@4` — appears for all actionable item types
- **Inline button**: `$(terminal)` icon on non-favorite items only (favorites already have 3 inline buttons: remove, move up, move down)
