# Custom Commands Specification

User-defined commands that can be triggered from the tree view context menu, with template variable support for dynamic arguments.

## Settings

Two separate arrays — one for directory-level items (repository/worktree), one for workspace file items:

| Setting | Applies to | Scope |
|---|---|---|
| `git-work-grove.customCommands.directory` | Repository, Worktree, Favorite (repo/worktree) | `resource` |
| `git-work-grove.customCommands.workspace` | Workspace files, Favorite (workspace file) | `resource` |

### Item Schema

Each entry in the array:

| Property | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Yes | Display text in context menu and QuickPick |
| `command` | `string[]` | Yes | Command as `[bin, ...args]` — supports template variables |
| `env` | `Record<string, string>` | No | Environment variables — values support template variables |

## Template Variables

### Directory items (`customCommands.directory`)

Same variables as repository/worktree templates:

| Variable | Value |
|---|---|
| `{name}` | Worktree folder name |
| `{branch}` | Git branch (empty if detached HEAD) |
| `{ref}` | Branch or short commit hash (always non-empty) |
| `{head}` | Short commit hash (8 chars) |
| `{path}` | Filesystem path |

### Workspace items (`customCommands.workspace`)

Same variables as worktree workspace templates, plus `{dir}`:

| Variable | Value |
|---|---|
| `{name}` | File name (without `.code-workspace`) |
| `{branch}` | Parent worktree branch (empty if detached HEAD) |
| `{ref}` | Branch or short commit hash (always non-empty) |
| `{head}` | Short commit hash (8 chars) |
| `{path}` | Workspace file path |
| `{dir}` | Parent directory of workspace file path |
| `{worktree}` | Parent worktree folder name |

Template syntax (fallback, conditional) is the same as display templates. See [templates.md](../../docs/templates.md) for syntax reference.

## Registered Commands

| Command ID | Title | Enablement |
|---|---|---|
| `gitWorkGrove.customCommand.directory` | Custom Commands... | `gitWorkGrove.hasRepository` |
| `gitWorkGrove.customCommand.workspace` | Custom Commands... | `gitWorkGrove.hasRepository` |

## Context Menu Placement

Both commands appear in the `custom@1` group, which renders after the copy group (`5_cutcopypaste`).

| Command | When clause |
|---|---|
| `customCommand.directory` | `hasCustomCommands.directory` AND `viewItem` matches worktree/repository (excluding workspace files and prunable) |
| `customCommand.workspace` | `hasCustomCommands.workspace` AND `viewItem` matches workspace file items (including favorites) |

The menu items are only visible when the corresponding setting array is non-empty, controlled by context keys:

| Context key | Set when |
|---|---|
| `gitWorkGrove.hasCustomCommands.directory` | `customCommands.directory` has at least one valid entry |
| `gitWorkGrove.hasCustomCommands.workspace` | `customCommands.workspace` has at least one valid entry |

## UX Flow

1. User right-clicks a tree item
2. Selects **Custom Commands...** from the context menu
3. A QuickPick appears listing all configured commands for that item type
4. Each QuickPick item shows the `label` and the rendered command as detail
5. User selects a command
6. The command is spawned detached in the background

## Execution

- **Spawn**: `child_process.spawn(bin, args, { detached: true, shell: true, stdio: "ignore" })`
- **Shell**: `shell: true` on all platforms — ensures commands resolve via the user's shell PATH
- **Detached + unref**: Fire-and-forget — the child process outlives the extension
- **Environment**: `process.env` merged with rendered `env` from the config entry (config values override)
- **macOS GUI apps**: Use `open -a <AppName> --args ...` instead of calling the binary directly — `detached: true` creates a new process group that prevents direct GUI binaries from connecting to WindowServer
- **Logging**: Spawned command is logged to the output channel

## CWD Resolution

Same logic as Open in Terminal (see [open-in-terminal.md](open-in-terminal.md)):

| Item type | CWD |
|---|---|
| Repository / Worktree | `worktreeInfo.path` |
| Workspace file | `dirname(workspaceFileInfo.path)` |
| Favorite | Resolved via duck-typing to the underlying type |

## Error Handling

- **Spawn failure** (synchronous): try/catch around `spawn()` — shows error via `showErrorMessage`
- **Process error** (asynchronous): `child.on("error")` — shows error with "Show Logs" action
- **Settings validation**: Invalid entries (missing `label`, empty `command`) are skipped with a log message
- **Template rendering**: Uses the same `renderTemplate` function as display templates — unknown variables remain as-is

## Examples

### Open worktree directory in an external terminal

```json
{
  "git-work-grove.customCommands.directory": [
    {
      "command": ["open", "-a", "Terminal", "{path}"],
      "label": "Open in Terminal.app"
    }
  ]
}
```

Common terminal emulators:

| App | `command` |
|-----|-----------|
| Terminal.app | `["open", "-a", "Terminal", "{path}"]` |
| iTerm2 | `["open", "-a", "iTerm", "{path}"]` |
| Ghostty | `["open", "-a", "Ghostty", "--args", "--working-directory={path}", "--window-inherit-working-directory=false"]` |
| WezTerm | `["wezterm", "start", "--cwd", "{path}"]` |
| Alacritty | `["alacritty", "--working-directory", "{path}"]` |
| Kitty | `["kitty", "--directory", "{path}"]` |

### Open worktree directory in an external editor

```json
{
  "git-work-grove.customCommands.directory": [
    {
      "command": ["zed", "{path}"],
      "label": "Open in Zed"
    }
  ]
}
```

### Open workspace file in an external editor

```json
{
  "git-work-grove.customCommands.workspace": [
    {
      "command": ["zed", "{path}"],
      "label": "Open in Zed"
    }
  ]
}
```

### Open workspace file's parent directory in a terminal

```json
{
  "git-work-grove.customCommands.workspace": [
    {
      "command": ["open", "-a", "Terminal", "{dir}"],
      "label": "Open dir in Terminal.app"
    }
  ]
}
```

### Multiple commands

```json
{
  "git-work-grove.customCommands.directory": [
    {
      "command": ["open", "-a", "Terminal", "{path}"],
      "label": "Open in Terminal.app"
    },
    {
      "command": ["zed", "{path}"],
      "label": "Open in Zed"
    }
  ]
}
```

## Cross-References

- [templates.md](../../docs/templates.md) — Template syntax (fallback, conditional sections)
- [commands.md](commands.md) — Full command registry
- [open-in-terminal.md](open-in-terminal.md) — CWD resolution logic
