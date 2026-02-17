import * as fs from "node:fs";
import * as path from "node:path";

import * as vscode from "vscode";

import { moveFavoriteDown, moveFavoriteUp } from "./commands/moveFavorite.js";
import { openDefault, openInCurrentWindow, openInNewWindow } from "./commands/openWorkspace.js";
import { pruneWorktrees } from "./commands/pruneWorktrees.js";
import { toggleFavorite } from "./commands/toggleFavorite.js";
import {
  CMD_ADD_FAVORITE,
  CMD_CLEAN_STALE_FAVORITES,
  CMD_MOVE_FAVORITE_DOWN,
  CMD_MOVE_FAVORITE_UP,
  CMD_OPEN_IN_CURRENT_WINDOW,
  CMD_OPEN_IN_NEW_WINDOW,
  CMD_PRUNE_WORKTREES,
  CMD_REFRESH,
  CMD_REMOVE_FAVORITE,
  CMD_REVEAL_IN_OS,
  CMD_SHOW_OUTPUT,
  CTX_GIT_UNAVAILABLE,
  CTX_HAS_REPOSITORY,
  DEBOUNCE_WATCHER,
  VIEW_WORKTREES,
} from "./constants.js";
import { FavoritesService } from "./services/favoritesService.js";
import { GitWorktreeService } from "./services/gitWorktreeService.js";
import { WorkspaceScanner } from "./services/workspaceScanner.js";
import { getOutputChannel, log, logError } from "./utils/outputChannel.js";
import { CurrentDecorationProvider } from "./views/currentDecorationProvider.js";
import { WorktreeTreeProvider } from "./views/worktreeTreeProvider.js";

function setContext(key: string, value: boolean): Thenable<unknown> {
  return vscode.commands.executeCommand("setContext", key, value);
}

async function checkGitAndRepository(
  gitService: GitWorktreeService,
): Promise<{ gitAvailable: boolean; hasRepository: boolean }> {
  const gitAvailable = await gitService.initialize();
  if (!gitAvailable) {
    return { gitAvailable: false, hasRepository: false };
  }

  const cwd = gitService.resolveGitCwd();
  return { gitAvailable: true, hasRepository: cwd !== undefined };
}


export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Set initial context keys synchronously
  void setContext(CTX_HAS_REPOSITORY, false);
  void setContext(CTX_GIT_UNAVAILABLE, false);

  // Services
  const gitService = new GitWorktreeService();
  const scanner = new WorkspaceScanner();
  const favorites = new FavoritesService();
  const treeProvider = new WorktreeTreeProvider(gitService, scanner, favorites);

  // Decoration provider (colors current item labels green)
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new CurrentDecorationProvider()),
  );

  // Tree view with drag-and-drop
  const treeView = vscode.window.createTreeView(VIEW_WORKTREES, {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    dragAndDropController: treeProvider,
  });
  context.subscriptions.push(treeView, treeProvider);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(CMD_PRUNE_WORKTREES, () =>
      pruneWorktrees(gitService, treeProvider)),
    vscode.commands.registerCommand(CMD_OPEN_IN_NEW_WINDOW, (item) =>
      openInNewWindow(item)),
    vscode.commands.registerCommand(CMD_OPEN_IN_CURRENT_WINDOW, (item) =>
      openInCurrentWindow(item)),
    vscode.commands.registerCommand(CMD_ADD_FAVORITE, (item) =>
      toggleFavorite(item, favorites, treeProvider)),
    vscode.commands.registerCommand(CMD_REMOVE_FAVORITE, (item) =>
      toggleFavorite(item, favorites, treeProvider)),
    vscode.commands.registerCommand(CMD_MOVE_FAVORITE_UP, (item) =>
      moveFavoriteUp(item, favorites, treeProvider)),
    vscode.commands.registerCommand(CMD_MOVE_FAVORITE_DOWN, (item) =>
      moveFavoriteDown(item, favorites, treeProvider)),
    vscode.commands.registerCommand(CMD_REVEAL_IN_OS, (item) => {
      const fsPath = item && "favoritePath" in item
        ? item.favoritePath
        : item && "workspaceFileInfo" in item
          ? item.workspaceFileInfo.path
          : item && "worktreeInfo" in item
            ? item.worktreeInfo.path
            : undefined;
      if (fsPath) {
        void vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(fsPath));
      }
    }),
    vscode.commands.registerCommand(CMD_REFRESH, () =>
      treeProvider.refresh()),
    vscode.commands.registerCommand(CMD_SHOW_OUTPUT, () =>
      getOutputChannel().show()),
    vscode.commands.registerCommand(CMD_CLEAN_STALE_FAVORITES, async () => {
      const worktrees = await gitService.list();
      const validPaths = new Set<string>();
      for (const wt of worktrees) {
        validPaths.add(wt.path);
      }
      // Also validate workspace file paths
      for (const fav of favorites.getFavorites()) {
        if (!validPaths.has(fav) && fs.existsSync(fav)) {
          validPaths.add(fav);
        }
      }
      await favorites.cleanupStale(validPaths);
    }),
  );

  // Tree item click → default open behavior
  context.subscriptions.push(
    treeView.onDidChangeSelection((e) => {
      const item = e.selection[0];
      if (!item) return;

      // Handle FavoriteItem clicks
      if ("favoritePath" in item) {
        if (typeof item.contextValue === "string" && item.contextValue.includes("current")) return;
        openDefault(item);
        return;
      }

      // Handle WorkspaceFileItem clicks (existing behavior)
      if ("workspaceFileInfo" in item) {
        if (typeof item.contextValue === "string" && item.contextValue.includes("current")) return;
        openDefault(item);
      }
    }),
  );

  // Check git availability and repository
  const { gitAvailable, hasRepository } = await checkGitAndRepository(gitService);

  if (!gitAvailable) {
    void setContext(CTX_GIT_UNAVAILABLE, true);
    void setContext(CTX_HAS_REPOSITORY, false);
    log("Git is not available");
    return;
  }

  void setContext(CTX_HAS_REPOSITORY, hasRepository);

  if (!hasRepository) {
    log("No git repository found in workspace folders");
    return;
  }

  // FileSystemWatcher for worktree changes
  try {
    const commonDir = await gitService.getCommonDir();
    if (commonDir) {
      const worktreesDir = path.join(commonDir, "worktrees");
      if (fs.existsSync(worktreesDir)) {
        const pattern = new vscode.RelativePattern(
          vscode.Uri.file(commonDir),
          "worktrees/**",
        );
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        const debouncedRefresh = () => treeProvider.debouncedRefresh();
        watcher.onDidChange(debouncedRefresh);
        watcher.onDidCreate(debouncedRefresh);
        watcher.onDidDelete(debouncedRefresh);
        context.subscriptions.push(watcher);
        log(`Watching ${worktreesDir} for changes (${DEBOUNCE_WATCHER}ms debounce)`);
      }
    }
  } catch (error) {
    logError("FileSystemWatcher setup failed, relying on manual refresh", error);
  }

  // Configuration changes (e.g. template, openBehavior, workspaceFile include/exclude)
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("git-work-grove")) {
        treeProvider.refresh();
      }
    }),
  );

  // Workspace trust changes
  context.subscriptions.push(
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      log("Workspace trust granted");
      treeProvider.refresh();
    }),
  );

  // Workspace folder changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const gitCwd = gitService.resolveGitCwd();
      void setContext(CTX_HAS_REPOSITORY, gitCwd !== undefined);
      if (gitCwd) {
        treeProvider.refresh();
      }
    }),
  );

  log("Git WorkGrove activated");
}

export function deactivate(): void {
  // Subscriptions are disposed automatically via context.subscriptions
}
