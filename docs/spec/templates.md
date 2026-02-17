# Templates Specification

The template system allows users to customize the label and description of every item type in the tree via VS Code settings.

## The 8 Item Types

Based on the 4 fundamental cases (repository, worktree, repositoryWorkspace, worktreeWorkspace), each has a normal and favorite variant:

| # | Type | Setting prefix | Appears in |
|---|---|---|---|
| 1 | Repository | `template.repository` | Main worktree header in tree |
| 2 | Worktree | `template.worktree` | Linked worktree in tree |
| 3 | Repository Workspace | `template.repositoryWorkspace` | Workspace file under main worktree |
| 4 | Worktree Workspace | `template.worktreeWorkspace` | Workspace file under linked worktree |
| 5 | Favorite Repository | `template.favoriteRepository` | Favorited repository in Favorites section |
| 6 | Favorite Worktree | `template.favoriteWorktree` | Favorited worktree in Favorites section |
| 7 | Favorite Repo Workspace | `template.favoriteRepositoryWorkspace` | Favorited workspace file from repository |
| 8 | Favorite Worktree Workspace | `template.favoriteWorktreeWorkspace` | Favorited workspace file from linked worktree |

Each type has `.label` and `.description` settings (16 settings total).

## Template Rendering

Templates are strings processed by `renderTemplate()` in three steps:

### Step 1: Conditional sections — `{?key}content{/key}`

If the variable is non-empty, the content is kept (inner variables still get processed in later steps). If the variable is empty, the entire section is removed.

```
{?branch}({branch}){/branch}
  → branch="main"  → "(main)"
  → branch=""      → ""
```

### Step 2: Fallback variables — `{key|fallback}`

If the variable is empty, the fallback text is used instead.

```
{branch|no branch}
  → branch="main"  → "main"
  → branch=""      → "no branch"
```

### Step 3: Simple variables — `{key}`

Replaces `{key}` with the variable value. Empty variables become empty strings.

## Variables by Type

### Repository / Worktree items (types 1, 2, 5, 6)

Built by `worktreeVars(info: WorktreeInfo)`:

| Variable | Source | Example |
|---|---|---|
| `{name}` | `info.name` (worktree folder name) | `stellar-app`, `feat-auth` |
| `{branch}` | `info.branch` (git branch, `""` if detached) | `main`, `feat/auth` |
| `{ref}` | `info.branch ?? info.head` (always non-empty) | `main`, `abc12345` |
| `{head}` | `info.head` (short commit hash, 8 chars) | `abc12345` |
| `{path}` | `info.path` (absolute filesystem path) | `/path/to/feat-auth` |

### Repository Workspace items (types 3, 7)

Built by `workspaceFileVars(name, filePath, parent)` where `parent.isMain === true`:

| Variable | Source | Example |
|---|---|---|
| `{name}` | File name without `.code-workspace` extension | `stellar-app` |
| `{branch}` | `parent.branch` (repository branch, `""` if detached) | `main` |
| `{ref}` | `parent.branch ?? parent.head` (always non-empty) | `main`, `abc12345` |
| `{head}` | `parent.head` (short commit hash, 8 chars) | `abc12345` |
| `{path}` | Absolute workspace file path | `/path/to/repo/stellar-app.code-workspace` |
| `{worktree}` | `parent.name` | `stellar-app` |

Note: `{worktree}` is technically available but equals the repository name. Users should prefer `{branch}` or `{ref}` for repository workspace items.

### Worktree Workspace items (types 4, 8)

Built by `workspaceFileVars(name, filePath, parent)` where `parent.isMain === false`:

| Variable | Source | Example |
|---|---|---|
| `{name}` | File name without `.code-workspace` extension | `stellar-app` |
| `{worktree}` | `parent.name` (parent worktree folder name) | `feat-auth` |
| `{branch}` | `parent.branch` (parent worktree branch, `""` if detached) | `feat/auth` |
| `{ref}` | `parent.branch ?? parent.head` (always non-empty) | `feat/auth`, `abc12345` |
| `{head}` | `parent.head` (short commit hash, 8 chars) | `abc12345` |
| `{path}` | Absolute workspace file path | `/path/to/feat-auth/stellar-app.code-workspace` |

## Defaults

| Setting | Default |
|---|---|
| `template.repository.label` | `Repository` |
| `template.repository.description` | *(empty)* |
| `template.worktree.label` | `{name}` |
| `template.worktree.description` | *(empty)* |
| `template.repositoryWorkspace.label` | `{name}` |
| `template.repositoryWorkspace.description` | *(empty)* |
| `template.worktreeWorkspace.label` | `{name}` |
| `template.worktreeWorkspace.description` | *(empty)* |
| `template.favoriteRepository.label` | `Repository` |
| `template.favoriteRepository.description` | *(empty)* |
| `template.favoriteWorktree.label` | `{name}` |
| `template.favoriteWorktree.description` | *(empty)* |
| `template.favoriteRepositoryWorkspace.label` | `{name}` |
| `template.favoriteRepositoryWorkspace.description` | *(empty)* |
| `template.favoriteWorktreeWorkspace.label` | `{name}` |
| `template.favoriteWorktreeWorkspace.description` | `🌲 {worktree}` |

Design rationale: Only `favoriteWorktreeWorkspace.description` has a non-empty default because it's the only type that needs disambiguation — a workspace file shortcut in the Favorites section has no visible parent to indicate which worktree it belongs to.

## Template Selection Logic

### WorkspaceFileItem (in normal tree)

The parent `WorktreeInfo` determines which template pair to use:

```
if parent.isMain → repositoryWorkspace.label / repositoryWorkspace.description
else             → worktreeWorkspace.label / worktreeWorkspace.description
```

### FavoriteItem (in Favorites section)

For `type === "workspaceFile"`:

```
if parentWorktreeInfo.isMain → favoriteRepositoryWorkspace.label / .description
else                         → favoriteWorktreeWorkspace.label / .description
```

For `type === "repo"` / `"worktree"`: Uses the corresponding `favoriteRepository.*` / `favoriteWorktree.*` templates directly.

### Repository header (GroupHeaderItem)

Always uses `repository.label` / `repository.description` with `worktreeVars(main)`.

## Implementation

All template getters are in `src/utils/template.ts`. Each is a thin wrapper around `vscode.workspace.getConfiguration().get()` with the appropriate default value.

The `renderTemplate()` function and variable builders (`worktreeVars`, `workspaceFileVars`) are also in `src/utils/template.ts`.
