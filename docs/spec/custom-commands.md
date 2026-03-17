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
| `mode` | `"spawn" \| "terminal"` | No | Execution mode — `"spawn"` (default): detached background process. `"terminal"`: VS Code integrated terminal |

## Template Variables

### Directory items (`customCommands.directory`)

Same variables as repository/worktree templates:

| Variable | Value |
|---|---|
| `{name}` | Branch name, or `HEAD` if detached |
| `{branch}` | Full branch name (empty if detached HEAD) |
| `{ref}` | Branch name or short commit hash (always non-empty) |
| `{head}` | Short commit hash (8 chars) |
| `{path}` | Absolute worktree directory path |

### Workspace items (`customCommands.workspace`)

Same variables as worktree workspace templates, plus `{dir}`:

| Variable | Value |
|---|---|
| `{name}` | File name (without `.code-workspace` extension) |
| `{branch}` | Parent worktree branch (empty if detached HEAD) |
| `{ref}` | Branch name or short commit hash (always non-empty) |
| `{head}` | Short commit hash (8 chars) |
| `{path}` | Absolute workspace file path |
| `{dir}` | Absolute parent directory of workspace file |
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
6. The command is executed based on the entry's `mode`: spawned detached (`"spawn"`) or run in an integrated terminal (`"terminal"`)

## Execution

- **Spawn**: `child_process.spawn(bin, args, { detached: true, stdio: "ignore" })`
- **Shell**: `shell: true` on Windows only (`win32`) for `.cmd`/`.bat` support. POSIX uses direct exec (no shell) to avoid command injection via path metacharacters.
- **Detached + unref**: Fire-and-forget — the child process outlives the extension
- **Environment**: `process.env` merged with rendered `env` from the config entry (config values override)
- **macOS GUI apps**: Use `open -a <AppName> --args ...` instead of calling the binary directly — `detached: true` creates a new process group that prevents direct GUI binaries from connecting to WindowServer
- **Command not found**: On macOS, VS Code launched from Finder has a limited PATH. Use full binary paths or `open -a` for GUI apps.
- **Logging**: Spawned command is logged to the output channel

## Terminal Mode

When `mode` is `"terminal"`, the command runs in a VS Code integrated terminal instead of a detached background process.

- **Terminal name**: Uses the entry's `label`
- **Command**: `sendText(quote([bin, ...args]))` — shell-quoted via the `shell-quote` library
- **Environment**: Only custom `env` is passed (VS Code merges with its inherited environment automatically)
- **Lifecycle**: The terminal remains open after the command finishes — the user can interact or close it manually
- **Error handling**: try/catch around `createTerminal` + `sendText` — shows error via `showErrorMessage` and logs via `logError`

### Known Limitation

`shell-quote` produces POSIX-style quoting which may not work correctly in PowerShell terminals (on any platform). Users whose VS Code terminal profile uses PowerShell should prefer `"mode": "spawn"` for commands with arguments containing spaces or special characters.

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
- **Settings validation**: Invalid entries are skipped with a log message. Checks: `label` must be a non-empty string, `command` must be a non-empty string array, and `env` values (if present) must all be strings
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

### Using environment variables

```json
{
  "git-work-grove.customCommands.directory": [
    {
      "command": ["open", "-a", "Ghostty", "--args", "--working-directory={path}"],
      "env": { "GHOSTTY_TITLE": "{ref}" },
      "label": "Open in Ghostty"
    }
  ]
}
```

### Run an interactive CLI tool in terminal

```json
{
  "git-work-grove.customCommands.directory": [
    {
      "command": ["npm", "run", "dev"],
      "label": "Run Dev Server",
      "mode": "terminal"
    }
  ]
}
```

### Start Claude Code in a worktree

```json
{
  "git-work-grove.customCommands.directory": [
    {
      "command": ["claude"],
      "label": "Claude Code",
      "mode": "terminal"
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
