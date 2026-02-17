# Favorites Specification

Favorites are user-pinned shortcuts to any item (repository, worktree, or workspace file). They appear as a dedicated section at the top of the tree.

## Data Model

```jsonc
// VS Code setting (scope: application — shared across workspaces)
"git-work-grove.favorites": ["path1", "path2", ...]
```

- Stored as a `string[]` of absolute filesystem paths
- Array order = display order
- Type is NOT stored — resolved at render time from path matching

## Type Resolution

At render time, each favorite path is resolved against the current worktree list:

1. Path matches a worktree with `isMain === true` → **repo**
2. Path matches a worktree with `isMain === false` → **worktree**
3. Path does not match a worktree AND `fs.existsSync(path)` → **workspaceFile**
4. None of the above → stale entry, silently skipped

For workspace files, the parent worktree is determined by prefix matching: `path.startsWith(worktree.path + "/")`. This sets `parentWorktreeInfo` on the `ResolvedFavorite`, which determines whether it's a repository workspace or worktree workspace favorite.

## ResolvedFavorite

Runtime-only type (not persisted):

```typescript
interface ResolvedFavorite {
  type: "repo" | "worktree" | "workspaceFile";
  path: string;
  displayName: string;
  isCurrent: boolean;
  worktreeInfo?: WorktreeInfo;         // set for repo/worktree types
  parentWorktreeInfo?: WorktreeInfo;   // set for workspaceFile type
}
```

## Favorite Operations

### Add

Appends path to end of favorites array. No-op if already present.

### Remove

Removes path from favorites array. No-op if not found.

### Move (reorder)

Moves item from one index to another. Validates both indices are within bounds. Used by both drag-and-drop and move up/down commands.

### Cleanup Stale

Removes entries not in a provided `Set<string>` of valid paths. Two strategies:

- **Automatic (on tree refresh):** Only removes favorites whose path doesn't exist on disk AND doesn't match any worktree. Cheap — runs every refresh.
- **Manual (`cleanStaleFavorites` command):** Full validation — builds valid set from worktrees + existing files. Shows info message with count of removed items.

## Ordering

### Drag and Drop

Implemented via `TreeDragAndDropController<TreeNode>` on `WorktreeTreeProvider`:

- MIME type: `application/vnd.code.tree.gitworkgrove`
- Only `FavoriteItem` nodes are draggable
- Drop targets: `FavoriteItem` (inserts at that position) or Favorites `GroupHeaderItem` (moves to first position)
- Other drop targets are ignored

### Move Up / Move Down

Inline commands on FavoriteItem context menu:

- `gitWorkGrove.moveFavoriteUp` — swaps with previous entry (no-op at index 0)
- `gitWorkGrove.moveFavoriteDown` — swaps with next entry (no-op at last index)

## Click Behavior

Clicking a FavoriteItem opens the item using the configured `openBehavior`:

- repo / worktree → opens the folder
- workspace file → opens the workspace file

Handled via `treeView.onDidChangeSelection`, NOT via the `command` property on `TreeItem`. This avoids double-firing.

Current items (contextValue contains "current") are skipped — clicking the already-open item does nothing.

## Context Values

| Type | contextValue |
|---|---|
| Favorited repo | `favorite.repo[.current]` |
| Favorited worktree | `favorite.worktree[.current]` |
| Favorited workspace file | `favorite.workspaceFile[.current]` |

## Menu Visibility

- **Add Favorite** (`$(star-empty)`): Shown on `worktree`, `workspaceFile`, `repository` items that are NOT already favorited
- **Remove Favorite** (`$(star-full)`): Shown on any item with `favorite` in contextValue
- **Move Up/Down** (`$(chevron-up)`/`$(chevron-down)`): Shown only on `favorite.*` items
- **Open/Reveal**: Shown on `favorite.*` items (same as worktree/workspaceFile items)
