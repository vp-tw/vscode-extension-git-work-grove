import * as vscode from "vscode";

import { log } from "../utils/outputChannel.js";

export class FavoritesService {
  getFavorites(): Array<string> {
    return vscode.workspace
      .getConfiguration("git-work-grove")
      .get<Array<string>>("favorites", []);
  }

  isFavorite(path: string): boolean {
    return this.getFavorites().includes(path);
  }

  async add(path: string): Promise<void> {
    const favorites = this.getFavorites();
    if (favorites.includes(path)) return;
    favorites.push(path);
    await this.updateFavorites(favorites);
  }

  async remove(path: string): Promise<void> {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(path);
    if (index === -1) return;
    favorites.splice(index, 1);
    await this.updateFavorites(favorites);
  }

  async move(fromIndex: number, toIndex: number): Promise<void> {
    const favorites = this.getFavorites();
    if (
      fromIndex < 0 || fromIndex >= favorites.length
      || toIndex < 0 || toIndex >= favorites.length
      || fromIndex === toIndex
    ) return;
    const [item] = favorites.splice(fromIndex, 1);
    favorites.splice(toIndex, 0, item);
    await this.updateFavorites(favorites);
  }

  async cleanupStale(validPaths: Set<string>): Promise<number> {
    const favorites = this.getFavorites();
    const stale = favorites.filter(fav => !validPaths.has(fav));

    if (stale.length > 0) {
      const updated = favorites.filter(fav => validPaths.has(fav));
      await this.updateFavorites(updated);
      log(`Removed ${stale.length} stale favorite(s)`);

      vscode.window.showInformationMessage(
        `${stale.length} item(s) removed from favorites (no longer exist)`,
      );
    }

    return stale.length;
  }

  private async updateFavorites(favorites: Array<string>): Promise<void> {
    await vscode.workspace
      .getConfiguration("git-work-grove")
      .update("favorites", favorites, vscode.ConfigurationTarget.Global);
  }
}
