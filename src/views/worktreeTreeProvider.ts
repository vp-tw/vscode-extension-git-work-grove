import type { FavoritesService } from "../services/favoritesService.js";
import type { GitWorktreeService } from "../services/gitWorktreeService.js";
import type { WorkspaceScanner } from "../services/workspaceScanner.js";
import type { ResolvedFavorite, WorktreeInfo } from "../types.js";

import * as fs from "node:fs";
import * as path from "node:path";

import * as vscode from "vscode";

import { MAX_WORKSPACE_FILES } from "../constants.js";
import { isWorkspaceFileDisplayCurrent, isWorktreeDisplayCurrent } from "../utils/currentIndicator.js";
import { logError } from "../utils/outputChannel.js";
import { getRepositoryDescription, getRepositoryLabel, renderTemplate, worktreeVars } from "../utils/template.js";
import { buildTooltip } from "../utils/tooltip.js";
import { buildResourceUri } from "./currentDecorationProvider.js";
import { FavoriteItem } from "./favoriteItem.js";
import { WorkspaceFileItem } from "./workspaceFileItem.js";
import { WorktreeItem } from "./worktreeItem.js";

export type TreeNode = FavoriteItem | GroupHeaderItem | InfoItem | WorkspaceFileItem | WorktreeItem;

const DRAG_MIME = "application/vnd.code.tree.gitworkgrove";

export class GroupHeaderItem extends vscode.TreeItem {
  readonly worktrees: Array<WorktreeInfo>;
  readonly favoriteItems: Array<FavoriteItem> | undefined;
  readonly worktreeInfo: WorktreeInfo | undefined;

  constructor(
    label: string,
    worktrees: Array<WorktreeInfo>,
    state = vscode.TreeItemCollapsibleState.Expanded,
    favoriteItems?: Array<FavoriteItem>,
    worktreeInfo?: WorktreeInfo,
  ) {
    super(label, state);
    this.worktrees = worktrees;
    this.favoriteItems = favoriteItems;
    this.worktreeInfo = worktreeInfo;
    this.contextValue = "group";
  }
}

class InfoItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "info";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

export class WorktreeTreeProvider implements
  vscode.TreeDataProvider<TreeNode>,
  vscode.TreeDragAndDropController<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  readonly dropMimeTypes = [DRAG_MIME];
  readonly dragMimeTypes = [DRAG_MIME];

  private isRefreshing = false;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly gitService: GitWorktreeService,
    private readonly scanner: WorkspaceScanner,
    private readonly favorites: FavoritesService,
  ) {}

  refresh(): void {
    if (this.isRefreshing) return;
    this.cancelDebounce();
    this.gitService.invalidateCache();
    this._onDidChangeTreeData.fire(undefined);
  }

  debouncedRefresh(): void {
    this.cancelDebounce();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.refresh();
    }, 500);
  }

  cancelDebounce(): void {
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  async getChildren(element?: TreeNode): Promise<Array<TreeNode>> {
    if (!element) {
      return this.getRootChildren();
    }

    if (element instanceof WorktreeItem) {
      return this.getWorktreeChildren(element);
    }

    if (element instanceof GroupHeaderItem) {
      if (element.favoriteItems) {
        return element.favoriteItems;
      }
      if (element.worktreeInfo) {
        return this.getRepositoryChildren(element.worktreeInfo);
      }
      return element.worktrees.map((wt) => {
        return new WorktreeItem(wt, this.favorites.isFavorite(wt.path));
      });
    }

    return [];
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  // --- Drag and Drop ---

  handleDrag(
    source: ReadonlyArray<TreeNode>,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const favoriteItems = source.filter(
      (item): item is FavoriteItem => item instanceof FavoriteItem,
    );
    if (favoriteItems.length === 0) return;
    dataTransfer.set(
      DRAG_MIME,
      new vscode.DataTransferItem(favoriteItems[0].favoriteIndex),
    );
  }

  async handleDrop(
    target: TreeNode | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const raw = dataTransfer.get(DRAG_MIME);
    if (!raw) return;

    const fromIndex = raw.value as number;
    let toIndex: number;

    if (target instanceof FavoriteItem) {
      toIndex = target.favoriteIndex;
    } else if (target instanceof GroupHeaderItem && target.favoriteItems) {
      // Dropped on the Favorites header → move to first position
      toIndex = 0;
    } else {
      return;
    }

    await this.favorites.move(fromIndex, toIndex);
    this.refresh();
  }

  // --- Private ---

  private getWorkspaceFilePath(): string | undefined {
    const wsFile = vscode.workspace.workspaceFile;
    return wsFile?.scheme === "file" ? wsFile.fsPath : undefined;
  }

  private async getRootChildren(): Promise<Array<TreeNode>> {
    this.isRefreshing = true;
    try {
      const worktrees = await this.gitService.list();
      if (worktrees.length === 0) return [];

      const workspaceFilePath = this.getWorkspaceFilePath();

      // Auto-cleanup: silently remove favorites pointing to deleted items
      const worktreePaths = new Set(worktrees.map(wt => wt.path));
      const favPaths = this.favorites.getFavorites();
      const staleFavs = favPaths.filter(
        fav => !worktreePaths.has(fav) && !fs.existsSync(fav),
      );
      for (const stale of staleFavs) {
        await this.favorites.remove(stale);
      }

      // Build Favorites section
      const resolvedFavorites = this.resolveFavorites(
        this.favorites.getFavorites(),
        worktrees,
        workspaceFilePath,
      );
      const favoriteItems = resolvedFavorites.map(
        (resolved, index) => new FavoriteItem(resolved, index),
      );

      const nodes: Array<TreeNode> = [];

      if (favoriteItems.length > 0) {
        nodes.push(new GroupHeaderItem(
          "Favorites",
          [],
          vscode.TreeItemCollapsibleState.Expanded,
          favoriteItems,
        ));
      }

      // Main worktree in its own section
      const main = worktrees.find(wt => wt.isMain);
      const linked = worktrees.filter(wt => !wt.isMain);
      const sorted = this.sortWorktrees(linked);

      if (main) {
        const showCurrent = isWorktreeDisplayCurrent(main.isCurrent, workspaceFilePath);
        const isFavorite = this.favorites.isFavorite(main.path);
        const hasChildren = this.scanner.scan(main.path).totalCount > 0;
        const repoState = !hasChildren
          ? vscode.TreeItemCollapsibleState.None
          : main.isCurrent
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
        const repoVars = worktreeVars(main);
        const repoHeader = new GroupHeaderItem(
          renderTemplate(getRepositoryLabel(), repoVars),
          [],
          repoState,
          undefined,
          main,
        );

        // Repository-specific contextValue and icon
        const ctxParts = ["repository"];
        if (showCurrent) ctxParts.push("current");
        if (isFavorite) ctxParts.push("favorite");
        repoHeader.contextValue = ctxParts.join(".");
        repoHeader.iconPath = showCurrent
          ? new vscode.ThemeIcon("repo", new vscode.ThemeColor("terminal.ansiGreen"))
          : new vscode.ThemeIcon("repo");
        repoHeader.tooltip = buildTooltip({
          isCurrent: showCurrent,
          type: "Repository",
          path: main.path,
          worktreeInfo: main,
        });
        repoHeader.resourceUri = buildResourceUri(main.path, showCurrent);
        repoHeader.description = renderTemplate(getRepositoryDescription(), repoVars);

        nodes.push(repoHeader);
      }

      // Linked worktrees — always flat list
      for (const wt of sorted) {
        const showCurrent = isWorktreeDisplayCurrent(wt.isCurrent, workspaceFilePath);
        const wtHasChildren = this.scanner.scan(wt.path).totalCount > 0;
        nodes.push(new WorktreeItem(wt, this.favorites.isFavorite(wt.path), showCurrent, wtHasChildren));
      }

      return nodes;
    } catch (error) {
      logError("Failed to get tree children", error);
      return [];
    } finally {
      this.isRefreshing = false;
    }
  }

  private resolveFavorites(
    favPaths: Array<string>,
    worktrees: Array<WorktreeInfo>,
    workspaceFilePath: string | undefined,
  ): Array<ResolvedFavorite> {
    const wtByPath = new Map(worktrees.map(wt => [wt.path, wt]));
    const resolved: Array<ResolvedFavorite> = [];

    for (const favPath of favPaths) {
      const wt = wtByPath.get(favPath);
      if (wt) {
        // Matches a worktree
        resolved.push({
          type: wt.isMain ? "repo" : "worktree",
          path: favPath,
          displayName: wt.isMain ? "Repository" : wt.name,
          isCurrent: isWorktreeDisplayCurrent(wt.isCurrent, workspaceFilePath),
          worktreeInfo: wt,
        });
        continue;
      }

      // Check if it's a workspace file belonging to this repo
      if (!fs.existsSync(favPath)) continue;
      const parentWt = worktrees.find(w => favPath.startsWith(w.path + path.sep));
      if (!parentWt) continue;
      const isCurrent = isWorkspaceFileDisplayCurrent(favPath, workspaceFilePath);

      resolved.push({
        type: "workspaceFile",
        path: favPath,
        displayName: path.basename(favPath, ".code-workspace"),
        isCurrent,
        parentWorktreeInfo: parentWt,
      });
    }

    return resolved;
  }

  private getWorktreeChildren(item: WorktreeItem): Array<TreeNode> {
    return this.scanWorkspaceFiles(item.worktreeInfo);
  }

  private getRepositoryChildren(main: WorktreeInfo): Array<TreeNode> {
    return this.scanWorkspaceFiles(main);
  }

  private scanWorkspaceFiles(parent: WorktreeInfo): Array<TreeNode> {
    try {
      const { files, totalCount } = this.scanner.scan(parent.path);
      const workspaceFilePath = this.getWorkspaceFilePath();
      const nodes: Array<TreeNode> = files.map((f) => {
        const isCurrent = isWorkspaceFileDisplayCurrent(f.path, workspaceFilePath);
        const isFavorite = this.favorites.isFavorite(f.path);
        return new WorkspaceFileItem(f, isCurrent, isFavorite, parent);
      });

      if (totalCount > MAX_WORKSPACE_FILES) {
        nodes.push(
          new InfoItem(`Showing first ${MAX_WORKSPACE_FILES} of ${totalCount} workspace files`),
        );
      }

      return nodes;
    } catch (error) {
      logError(`Failed to scan workspace files for ${parent.path}`, error);
      return [];
    }
  }

  private sortWorktrees(worktrees: Array<WorktreeInfo>): Array<WorktreeInfo> {
    return [...worktrees].sort((a, b) => a.name.localeCompare(b.name));
  }

  dispose(): void {
    this.cancelDebounce();
    this._onDidChangeTreeData.dispose();
  }
}
