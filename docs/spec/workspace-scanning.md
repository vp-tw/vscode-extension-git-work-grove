# Workspace Scanning Specification

Workspace scanning discovers `.code-workspace` files within worktree directories.

## Scan Strategy

- **Shallow scan only** — reads the immediate directory contents of a worktree path (`fs.readdirSync` with `withFileTypes`)
- **No recursive traversal** — workspace files are expected at the root of each worktree
- **Synchronous** — `readdirSync` is used for simplicity and speed (single directory read)

## Include / Exclude Patterns

### Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `git-work-grove.workspaceFile.include` | `string[]` | `["*.code-workspace"]` | Glob patterns for file matching |
| `git-work-grove.workspaceFile.exclude` | `string[]` | `[]` | Glob patterns to exclude |

### Pattern Matching

Simple glob matching (NOT full glob):

- `*` matches any non-slash characters
- `?` matches a single character
- No `**` support (not needed — single directory)
- No `{a,b}` brace expansion

A file is included when:
1. It is a regular file (not a directory, symlink, etc.)
2. It matches at least one include pattern
3. It does NOT match any exclude pattern

## Sorting

Matched files are sorted alphabetically by filename.

## Limits

- **`MAX_WORKSPACE_FILES = 10`** — Only the first 10 files are returned as `WorkspaceFileInfo`
- When the total count exceeds the limit, an `InfoItem` is appended: "Showing first 10 of N workspace files"
- The `totalCount` is always returned for UI messaging

## Return Type

```typescript
{
  files: WorkspaceFileInfo[];  // up to MAX_WORKSPACE_FILES
  totalCount: number;          // total matching files
}
```

Where `WorkspaceFileInfo`:

```typescript
{
  name: string;  // filename without .code-workspace extension
  path: string;  // absolute path to the file
}
```

## Collapsible State Integration

The `totalCount` from scanning determines whether a worktree shows an expand arrow:

- `totalCount > 0` → Collapsed or Expanded (based on `isCurrent`)
- `totalCount === 0` → `CollapsibleState.None` (no expand arrow)

This scan happens in `getRootChildren()` for both the repository header and each linked worktree.

## Error Handling

If `readdirSync` throws (e.g., directory doesn't exist), returns `{ files: [], totalCount: 0 }` silently. This handles prunable worktrees whose directories have been deleted.
