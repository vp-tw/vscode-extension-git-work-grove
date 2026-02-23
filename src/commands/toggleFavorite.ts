import type { FavoritesService } from "../services/favoritesService.js";
import type { ActionableItem } from "../utils/resolveItemPath.js";
import type { WorktreeTreeProvider } from "../views/worktreeTreeProvider.js";

import { resolveItemPath } from "../utils/resolveItemPath.js";

export async function toggleFavorite(
  item: ActionableItem | undefined,
  favorites: FavoritesService,
  treeProvider: WorktreeTreeProvider,
): Promise<void> {
  if (!item) return;

  const path = resolveItemPath(item);
  if (!path) return;

  // FavoriteItem — always remove; others — toggle
  if ("favoritePath" in item || favorites.isFavorite(path)) {
    await favorites.remove(path);
  } else {
    await favorites.add(path);
  }

  treeProvider.refresh();
}
