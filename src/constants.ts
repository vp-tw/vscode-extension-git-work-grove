// View IDs
export const VIEW_WORKTREES = "gitWorkGrove.worktrees";

// Command IDs
export const CMD_PRUNE_WORKTREES = "gitWorkGrove.pruneWorktrees";
export const CMD_OPEN_IN_NEW_WINDOW = "gitWorkGrove.openInNewWindow";
export const CMD_OPEN_IN_CURRENT_WINDOW = "gitWorkGrove.openInCurrentWindow";
export const CMD_ADD_FAVORITE = "gitWorkGrove.addFavorite";
export const CMD_REMOVE_FAVORITE = "gitWorkGrove.removeFavorite";
export const CMD_MOVE_FAVORITE_UP = "gitWorkGrove.moveFavoriteUp";
export const CMD_MOVE_FAVORITE_DOWN = "gitWorkGrove.moveFavoriteDown";
export const CMD_COPY_NAME = "gitWorkGrove.copyName";
export const CMD_COPY_PATH = "gitWorkGrove.copyPath";
export const CMD_REVEAL_IN_OS = "gitWorkGrove.revealInOS";
export const CMD_REFRESH = "gitWorkGrove.refresh";
export const CMD_SHOW_OUTPUT = "gitWorkGrove.showOutput";
export const CMD_CLEAN_STALE_FAVORITES = "gitWorkGrove.cleanStaleFavorites";

// Context keys
export const CTX_HAS_REPOSITORY = "gitWorkGrove.hasRepository";
export const CTX_GIT_UNAVAILABLE = "gitWorkGrove.gitUnavailable";

// Config keys (kebab-case per VS Code convention)
export const CFG_OPEN_BEHAVIOR = "git-work-grove.openBehavior";
export const CFG_WORKSPACE_FILE_INCLUDE = "git-work-grove.workspaceFile.include";
export const CFG_WORKSPACE_FILE_EXCLUDE = "git-work-grove.workspaceFile.exclude";

// Output channel name
export const OUTPUT_CHANNEL_NAME = "Git WorkGrove";

// Timeouts (ms)
export const TIMEOUT_GIT_SHORT = 5_000;
export const DEBOUNCE_WATCHER = 500;

// Limits
export const MAX_WORKSPACE_FILES = 10;

// Cache TTL (ms)
export const CACHE_TTL = 5_000;
