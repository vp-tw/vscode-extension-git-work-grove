# Prunable Worktree Debugging Aids

Issue: [#11](https://github.com/vp-tw/vscode-extension-git-work-grove/issues/11)

## Summary

Enhance prunable worktree UX with two changes:

1. **Tooltip enhancement** — show branch, expected path, fish-style abbreviated config path, and "Directory missing" message on hover
2. **Context menu overhaul** — hide inapplicable actions, add `Copy Worktree Config Path`, rename `Copy Path` to `Copy Path (Missing)`

## Tooltip Design

Prunable worktree tooltip example:

```
⚠ Prunable Worktree
Branch: hotfix/login
Expected path: /tmp/grove-test/wt-hotfix
Config: ~/r/v/m/.git/worktrees/wt-hotfix
Directory missing — run Prune to clean up
```

### Fish-Style Path Abbreviation Rules

1. Replace `$HOME` prefix with `~`
2. Abbreviate each path component to its first character, **except**:
   - The final component (preserve full name)
   - Everything after `.git/` (preserve full path: `worktrees/<name>`)
3. Non-home paths skip step 1 but follow the same abbreviation

Examples:

| Full path | Abbreviated |
|-----------|-------------|
| `/Users/v/repo/vp-tw/main-repo/.git/worktrees/wt-hotfix` | `~/r/v/m/.git/worktrees/wt-hotfix` |
| `/tmp/grove-test/main-repo/.git/worktrees/wt-hotfix` | `/t/g/m/.git/worktrees/wt-hotfix` |

### Data Sources

- **Branch**: already in `WorktreeInfo.branch` (parsed from `git worktree list --porcelain`)
- **Expected path**: `WorktreeInfo.path` (the worktree path git recorded, which no longer exists)
- **Config path**: `path.join(commonDir, "worktrees", worktreeInfo.name)` — requires `getCommonDir()` result

## Context Menu Design

### Prunable Worktree Menu (new)

Only these items appear for prunable worktrees:

| Command | Group | Purpose |
|---------|-------|---------|
| Copy Name | `5_cutcopypaste@1` | Branch name for recreating |
| Copy Path (Missing) | `5_cutcopypaste@2` | Original expected worktree path |
| Copy Worktree Config Path | `5_cutcopypaste@3` | Git internal directory (absolute) |

### Hidden for Prunable

These commands add `!(viewItem =~ /prunable/)` to their `when` clause:

- Open in New Window
- Open in Current Window
- Reveal in OS
- Open in Terminal
- Add Favorite

### Copy Path (Missing)

- Separate command from `copyPath` (VS Code requires distinct commands for distinct titles)
- Command ID: `gitWorkGrove.copyMissingPath`
- `when`: `viewItem =~ /prunable/`
- Behavior: copies `WorktreeInfo.path` to clipboard (same value as regular Copy Path)

### Copy Worktree Config Path

- Command ID: `gitWorkGrove.copyWorktreeConfigPath`
- `when`: `viewItem =~ /prunable/`
- Behavior: copies absolute path to `<commonDir>/worktrees/<name>/`
- Requires resolving `commonDir` at copy time (or caching it)

## Implementation Scope

### New Constants

```
CMD_COPY_MISSING_PATH = "gitWorkGrove.copyMissingPath"
CMD_COPY_WORKTREE_CONFIG_PATH = "gitWorkGrove.copyWorktreeConfigPath"
```

### Files to Modify

| File | Change |
|------|--------|
| `src/constants.ts` | Add 2 command IDs |
| `src/utils/tooltip.ts` | Add fish-style abbreviation, add config path + expected path lines for prunable |
| `src/utils/fishPath.ts` | **New file** — fish-style path abbreviation utility |
| `src/extension.ts` | Register 2 new commands |
| `src/commands/copyInfo.ts` | Add `copyWorktreeConfigPath` handler; `copyMissingPath` reuses `copyPath` |
| `package.json` | Add 2 commands, update `when` clauses for prunable exclusion, add new menu entries |
| `docs/spec/commands.md` | Document new commands and prunable menu behavior |

### Not in Scope

- Option A (open folder) from the issue — deferred, can add later if needed
