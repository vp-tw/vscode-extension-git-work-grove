# Empty States Specification

The WorkGrove tree view displays contextual messages when it cannot show worktree items. These messages help users understand why the tree is empty and how to resolve it.

## States

The tree view has 3 possible empty states, checked in priority order:

| Priority | State | Condition | Message |
|---|---|---|---|
| 1 | Git unavailable | `git --version` fails or times out | "Git is not available.\n[Learn More](https://git-scm.com)" |
| 2 | No repository | Git works but no `.git` found in workspace | "No git repository found in the current workspace." |
| 3 | No worktrees | Repository exists but `git worktree list` returns only the main worktree with no workspace files | "No worktrees found." |

## View Visibility

The tree view must be visible in all 3 empty states so the user can see the message. The `when` clause on the view uses both VS Code's built-in git detection and our own context key:

```
"when": "gitOpenRepositoryCount > 0 || gitWorkGrove.gitUnavailable"
```

Without `gitWorkGrove.gitUnavailable`, the view would be hidden when git is not installed (because VS Code's own Git extension also cannot detect repositories, leaving `gitOpenRepositoryCount` at 0).

### Reachability Note

The "No repository" message is a safety net for edge cases (e.g., VS Code's Git extension detects a repo but our extension's `resolveGitCwd()` does not). In the common scenario — user opens a non-git folder — `gitOpenRepositoryCount` is 0, so the view itself is hidden and no message is shown. This is intentional: showing an empty panel in a project unrelated to git would be noise.

## Context Keys

| Key | Type | Set when |
|---|---|---|
| `gitWorkGrove.gitUnavailable` | boolean | `git --version` fails or times out (5s) |
| `gitWorkGrove.hasRepository` | boolean | Git is available AND `.git` found in workspace folders |

Initial values (set synchronously at activation): both `false`.

## Welcome Message Conditions

Each welcome message has a `when` clause that ensures only one message shows at a time:

| Message | `when` clause |
|---|---|
| Git unavailable | `gitWorkGrove.gitUnavailable` |
| No repository | `!gitWorkGrove.gitUnavailable && !gitWorkGrove.hasRepository` |
| No worktrees | `gitWorkGrove.hasRepository` |

The priority order is enforced by the `when` clauses — only one message is visible at any time.

## Detection Flow

```
activate()
  ├─ git --version (5s timeout)
  │   ├─ FAIL → set gitUnavailable=true, hasRepository=false → early return
  │   └─ OK → walk workspace folders looking for .git
  │       ├─ NOT FOUND → set hasRepository=false → early return
  │       └─ FOUND → set hasRepository=true → continue initialization
  └─ (tree provider returns [] if no worktrees)
```

## Message Content

### Git unavailable

```
Git is not available.
[Learn More](https://git-scm.com)
```

The link points to the official Git download page so users can install git.

### No repository

```
No git repository found in the current workspace.
```

No link needed — the user needs to open a folder that contains a git repository.

### No worktrees

```
No worktrees found.
```

This appears when the tree provider returns an empty array. In practice this is rare since the main worktree always exists if a repository is detected, but it covers edge cases (e.g., corrupt git state).

## Output Channel Logging

Each empty state logs a message to the "Git WorkGrove" output channel:

| State | Log message |
|---|---|
| Git unavailable | `Git is not available` |
| No repository | `No git repository found in workspace folders` |
| No worktrees | *(no explicit log — tree simply returns empty)* |
