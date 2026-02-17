import type { FavoritesService } from "../services/favoritesService.js";
import type { FavoriteItem } from "../views/favoriteItem.js";
import type { WorktreeTreeProvider } from "../views/worktreeTreeProvider.js";

export async function moveFavoriteUp(
  item: FavoriteItem | undefined,
  favorites: FavoritesService,
  treeProvider: WorktreeTreeProvider,
): Promise<void> {
  if (!item || item.favoriteIndex <= 0) return;
  await favorites.move(item.favoriteIndex, item.favoriteIndex - 1);
  treeProvider.refresh();
}

export async function moveFavoriteDown(
  item: FavoriteItem | undefined,
  favorites: FavoritesService,
  treeProvider: WorktreeTreeProvider,
): Promise<void> {
  if (!item) return;
  const total = favorites.getFavorites().length;
  if (item.favoriteIndex >= total - 1) return;
  await favorites.move(item.favoriteIndex, item.favoriteIndex + 1);
  treeProvider.refresh();
}
