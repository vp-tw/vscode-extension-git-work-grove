# Git WorkGrove

> A code-workspace friendly worktree explorer for VS Code

Git WorkGrove provides first-class `.code-workspace` support for git worktrees. It appears in the Source Control view, letting you browse worktrees and directly open their workspace files.

![Git WorkGrove tree view](https://raw.githubusercontent.com/vp-tw/vscode-extension-git-work-grove/main/docs/images/screenshot.png)

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

## Usage

### Tree View

Git WorkGrove adds a **WORKGROVE** panel in the Source Control sidebar. It shows:

1. **Favorites** — Pinned items at the top (if any exist)
2. **Repository** — The main worktree (collapsible, with workspace files as children)
3. **Linked worktrees** — All other worktrees (alphabetically sorted, each with workspace files)

Click a workspace file to open it. Click a worktree to expand/collapse its children.

### Context Menu (Right-Click)

Right-click any item in the tree to access:

| Action | Description |
|--------|-------------|
| **Open in New Window** | Opens the worktree or workspace file in a new VS Code window |
| **Open in Current Window** | Opens in the current VS Code window |
| **Reveal in Finder** | Opens the item's location in your OS file manager |
| **Copy Name** | Copy the item's display name to clipboard |
| **Copy Path** | Copy the item's filesystem path to clipboard |

Favorite-specific actions appear as inline buttons:

| Button | Description |
|--------|-------------|
| **Add Favorite** (star outline) | Pin this item to the Favorites section |
| **Remove Favorite** (filled star) | Unpin from Favorites |
| **Move Up / Move Down** (chevrons) | Reorder within Favorites |

You can also drag and drop favorites to reorder them.

### View Title Actions

The WORKGROVE panel header provides:

| Action | Location | Description |
|--------|----------|-------------|
| **Refresh** | Header icon | Re-scan worktrees and workspace files |
| **Prune Worktrees** | `...` overflow menu | Run `git worktree prune` to clean up stale records |
| **Clean Stale Favorites** | `...` overflow menu | Remove favorites that no longer exist on disk |

### Open Behavior

When you click a workspace file, the behavior depends on the `openBehavior` setting:

- **`ask`** (default) — Shows a picker with options: _Open in New Window_, _Open in Current Window_, plus "Always" variants that persist your choice
- **`newWindow`** — Always opens in a new window
- **`currentWindow`** — Always opens in the current window

### Current Indicator

The currently open workspace or worktree is highlighted with:

- A **green-tinted icon**
- A **green dot badge** (●)

Clicking the current item does nothing (it's already open).

## Settings

Open VS Code Settings (`Cmd+,` / `Ctrl+,`) and search for `git-work-grove`:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `git-work-grove.openBehavior` | `ask` \| `newWindow` \| `currentWindow` | `ask` | Default action when opening a workspace |
| `git-work-grove.workspaceFile.include` | `string[]` | `["*.code-workspace"]` | Glob patterns for workspace file scanning |
| `git-work-grove.workspaceFile.exclude` | `string[]` | `[]` | Glob patterns to exclude from scanning |
| `git-work-grove.template.*` | `string` | *(varies)* | Display templates — see [Template Customization](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/templates.md) |
| `git-work-grove.favorites` | `string[]` | `[]` | Ordered list of favorited item paths (managed via the UI) |

### Template Customization

All tree item labels and descriptions are customizable. Templates support variables like `{name}`, `{branch}`, `{ref}`, fallback syntax (`{branch|detached}`), and conditional sections (`{?branch}({branch}){/branch}`).

See [Template Customization](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/templates.md) for all 8 item types, available variables, and examples.

## Commands

All commands use the `Git WorkGrove:` prefix. Some are available via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), while others appear only in the tree view context menu or inline buttons.

### Command Palette

| Command | Description |
|---------|-------------|
| Refresh | Re-scan worktrees and workspace files |
| Prune Worktrees | Run `git worktree prune` to clean up stale records |
| Show Output | Open the extension's output channel for debugging |
| Clean Stale Favorites | Remove favorites pointing to deleted items |

### Context Menu Only

These commands appear when right-clicking items in the tree view:

| Command | Description |
|---------|-------------|
| Open in New Window | Open worktree or workspace file in a new VS Code window |
| Open in Current Window | Open in the current VS Code window |
| Reveal in Finder | Open the item's location in your OS file manager |
| Copy Name | Copy the item's display name to clipboard |
| Copy Path | Copy the item's filesystem path to clipboard |
| Add Favorite | Pin this item to the Favorites section |
| Remove Favorite | Unpin from Favorites |
| Move Favorite Up / Down | Reorder within Favorites |

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
- [Empty States](https://github.com/vp-tw/vscode-extension-git-work-grove/blob/main/docs/spec/empty-states.md) — Git unavailable, no repository, no worktrees messages

## Installation

### VS Code Marketplace

Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vdustr.git-work-grove):

1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for **Git WorkGrove**
4. Click **Install**

### Open VSX Registry

Install from [Open VSX](https://open-vsx.org/extension/vdustr/git-work-grove) for VS Code alternatives (VSCodium, code-server, Gitpod, etc.):

1. Open your editor's extension panel
2. Search for **Git WorkGrove**
3. Click **Install**

## Requirements

- VS Code 1.95.0+
- Git installed and available in PATH

## License

MIT
