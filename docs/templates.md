# Display Templates

All tree item labels and descriptions are customizable via `git-work-grove.template.*` settings.

## The 8 Item Types

Based on the 4 fundamental cases (repository, worktree, repositoryWorkspace, worktreeWorkspace), each has a normal and favorite variant:

| # | Setting prefix | Where it appears |
|---|---|---|
| 1 | `template.repository` | Repository header in tree |
| 2 | `template.worktree` | Linked worktree in tree |
| 3 | `template.repositoryWorkspace` | Workspace file under Repository |
| 4 | `template.worktreeWorkspace` | Workspace file under linked worktree |
| 5 | `template.favoriteRepository` | Favorited repository in Favorites section |
| 6 | `template.favoriteWorktree` | Favorited worktree in Favorites section |
| 7 | `template.favoriteRepositoryWorkspace` | Favorited workspace file from Repository |
| 8 | `template.favoriteWorktreeWorkspace` | Favorited workspace file from linked worktree |

Each has `.label` and `.description`. Set to empty string to hide.

## Settings

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

## Variables

### Repository / Worktree items (types 1, 2, 5, 6)

| Variable | Value | Example |
|---|---|---|
| `{name}` | Worktree folder name | `stellar-app`, `feat-auth` |
| `{branch}` | Git branch (empty if detached HEAD) | `main`, `feat/auth` |
| `{ref}` | Branch or short commit hash (always non-empty) | `main`, `abc12345` |
| `{head}` | Short commit hash (8 chars) | `abc12345` |
| `{path}` | Filesystem path | `/path/to/feat-auth` |

### Repository Workspace items (types 3, 7)

| Variable | Value | Example |
|---|---|---|
| `{name}` | File name (without `.code-workspace`) | `stellar-app` |
| `{branch}` | Repository branch (empty if detached HEAD) | `main` |
| `{ref}` | Branch or short commit hash (always non-empty) | `main`, `abc12345` |
| `{head}` | Short commit hash (8 chars) | `abc12345` |
| `{path}` | Workspace file path | `/path/to/repo/stellar-app.code-workspace` |

### Worktree Workspace items (types 4, 8)

| Variable | Value | Example |
|---|---|---|
| `{name}` | File name (without `.code-workspace`) | `stellar-app` |
| `{worktree}` | Parent worktree folder name | `feat-auth` |
| `{branch}` | Parent worktree branch (empty if detached HEAD) | `feat/auth` |
| `{ref}` | Branch or short commit hash (always non-empty) | `feat/auth`, `abc12345` |
| `{head}` | Short commit hash (8 chars) | `abc12345` |
| `{path}` | Workspace file path | `/path/to/feat-auth/stellar-app.code-workspace` |

Note: `{worktree}` is only available for worktree workspace items (types 4, 8). Repository workspace items don't have a parent worktree.

## Advanced Syntax

### Fallback — `{key|fallback}`

When a variable is empty, the fallback text is used instead:

```
{branch|detached}       → "main" or "detached"
{branch|{head}}         → "main" or "abc12345"
```

### Conditional sections — `{?key}content{/key}`

When a variable is empty, the entire section is removed:

```
{name}{?branch} ({branch}){/branch}
  → branch="main"    → "feat-auth (main)"
  → branch=""        → "feat-auth"
```

Variables inside conditional sections are still processed normally.

## Examples

### Default

```
★ Favorites
  $(repo)     Repository
  $(worktree) feat-auth
  $(window)   stellar-app                          ← from repo (no description)
  $(window)   stellar-app     🌲 feat-auth          ← from worktree
Repository
  stellar-app
feat-auth
  stellar-app
chore-ci
```

### Worktree first (for multiple worktrees sharing the same workspace name)

```jsonc
"git-work-grove.template.favoriteWorktreeWorkspace.label": "🌲 {worktree}",
"git-work-grove.template.favoriteWorktreeWorkspace.description": "{name}"
```

```
★ Favorites
  $(window) 🌲 feat-auth     stellar-app
  $(window) 🌲 hotfix-pay    stellar-app
```

### Show ref everywhere

```jsonc
// Repository & worktree: ref in description (safe for detached HEAD)
"git-work-grove.template.repository.description": "{ref}",
"git-work-grove.template.worktree.description": "{ref}",
"git-work-grove.template.favoriteRepository.description": "{ref}",
"git-work-grove.template.favoriteWorktree.description": "{ref}",

// Workspace under repo: just ref (no worktree context needed)
"git-work-grove.template.repositoryWorkspace.description": "{ref}",
"git-work-grove.template.favoriteRepositoryWorkspace.description": "{ref}",

// Workspace under worktree: worktree name + ref
"git-work-grove.template.worktreeWorkspace.description": "🌲 {worktree} ({ref})",
"git-work-grove.template.favoriteWorktreeWorkspace.description": "🌲 {worktree} ({ref})"
```

```
★ Favorites
  $(repo)     Repository      main
  $(worktree) feat-auth       feat/auth
  $(window)   stellar-app     main                          ← from repo
  $(window)   stellar-app     🌲 feat-auth (feat/auth)      ← from worktree
Repository  main
  stellar-app  main
feat-auth   feat/auth
  stellar-app  🌲 feat-auth (feat/auth)
chore-ci    abc12345                                        ← detached HEAD shows commit hash
```

### Safe branch display (handles detached HEAD)

```jsonc
// Use {ref} — always has a value (branch name or short commit hash)
"git-work-grove.template.worktree.description": "{ref}"

// Or use fallback syntax
"git-work-grove.template.worktree.description": "{branch|{head}}"

// Or use conditional to hide when no branch
"git-work-grove.template.worktree.description": "{?branch}({branch}){/branch}"
```

### Minimal favorites (no description)

```jsonc
"git-work-grove.template.favoriteWorktreeWorkspace.description": ""
```

### Combined label

```jsonc
"git-work-grove.template.favoriteWorktreeWorkspace.label": "{worktree} / {name}",
"git-work-grove.template.favoriteWorktreeWorkspace.description": ""
```

```
★ Favorites
  $(window) feat-auth / stellar-app
```
