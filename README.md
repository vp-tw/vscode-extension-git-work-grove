# Git WorkGrove

> A code-workspace friendly worktree explorer for VS Code

Git WorkGrove provides first-class `.code-workspace` support for git worktrees. It appears in the Source Control view, letting you browse worktrees and directly open their workspace files.

## Why This Extension Exists

Git worktrees are powerful for parallel development — but VS Code and its extensions don't handle `.code-workspace` files well in worktree workflows.

**The problem:** When you switch to a worktree, tools open the folder — not the `.code-workspace` file. This means:

- Dev server output shows relative paths that **can't be clicked** to open files
- Multi-root workspace configurations are **silently lost**
- Workspace-scoped settings and tasks **don't apply**

This has been a long-standing pain point across both VS Code and GitLens:

- [Open workspace file instead of root folder when opening a worktree (GitLens #4016)](https://github.com/gitkraken/vscode-gitlens/issues/4016) — the core issue
- [Workspace settings are lost when switching between worktrees (GitLens #1956)](https://github.com/gitkraken/vscode-gitlens/issues/1956)
- [Improve workspace + worktree experience (GitLens #4453)](https://github.com/gitkraken/vscode-gitlens/issues/4453) — umbrella tracking issue
- [Git - Support git worktrees in workspace (VS Code #68038)](https://github.com/microsoft/vscode/issues/68038) — original feature request

**What Git WorkGrove does — and doesn't do:**

Git WorkGrove focuses on one thing: making `.code-workspace` files a first-class citizen in the worktree workflow. It does **not** manage worktrees — creating, deleting, and switching worktrees is best handled by [VS Code's built-in git support](https://code.visualstudio.com/docs/sourcecontrol/overview) or extensions like [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens).

If VS Code or GitLens ever ships proper `.code-workspace` support for worktrees, this extension will have served its purpose.

## Features

- **Source Control tree view** — Browse all worktrees with their `.code-workspace` files
- **Worktree names** — Labels match `git worktree` names instead of raw paths
- **Favorites** — Pin any item (repository, worktree, workspace file) to the top with drag-and-drop reordering
- **Current indicator** — Green icon and badge highlight the currently open item
- **Customizable templates** — Full control over labels and descriptions for all 8 item types
- **Prune** — Clean up stale worktree records
- **Live updates** — FileSystemWatcher detects worktree changes automatically

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `git-work-grove.openBehavior` | `ask` \| `newWindow` \| `currentWindow` | `ask` | Default action when opening a workspace |
| `git-work-grove.workspaceFile.include` | `string[]` | `["*.code-workspace"]` | Glob patterns for workspace file scanning |
| `git-work-grove.workspaceFile.exclude` | `string[]` | `[]` | Glob patterns to exclude from scanning |
| `git-work-grove.template.*` | `string` | *(varies)* | Display templates — see [Template Customization](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/templates.md) |
| `git-work-grove.favorites` | `string[]` | `[]` | Ordered list of favorited item paths |

## Documentation

- [Template Customization](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/templates.md) — Customize labels and descriptions for all item types with template variables

### Specifications

Design documents for contributors and AI-assisted development:

- [Tree Structure](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/tree-structure.md) — 4 fundamental types, node hierarchy, icons, collapsible states
- [Current Indicator](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/current-indicator.md) — Single-current-item rule, detection logic
- [Favorites](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/favorites.md) — Data model, resolution, ordering, stale cleanup
- [Templates](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/templates.md) — 8 template types, variables, defaults, selection logic
- [Commands](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/commands.md) — All commands, menu placement, behaviors
- [Workspace Scanning](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/workspace-scanning.md) — File discovery, include/exclude patterns
- [Open Behavior](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/open-behavior.md) — Open modes, URI resolution, click handling

## Requirements

- VS Code 1.95.0+
- Git installed and available in PATH

## License

MIT
