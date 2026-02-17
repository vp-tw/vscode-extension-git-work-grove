import type { WorktreeInfo } from "../types.js";

import * as vscode from "vscode";

function get<T>(key: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration().get<T>(key, defaultValue);
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;

  // Step 1: Conditional sections — {?key}content{/key}
  // Removes entire section when var is empty; keeps content otherwise
  result = result.replace(/\{\?(\w+)\}([\s\S]*?)\{\/\1\}/g, (_, key, content) => {
    return vars[key] ? content : "";
  });

  // Step 2: Variables with fallback — {key|fallback}
  // Uses fallback when var is empty
  result = result.replace(/\{(\w+)\|([^}]*)\}/g, (_, key, fallback) => {
    return vars[key] || fallback;
  });

  // Step 3: Simple variables — {key}
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }

  return result;
}

// --- Variable builders ---

export function worktreeVars(info: WorktreeInfo): Record<string, string> {
  return {
    name: info.name,
    branch: info.branch ?? "",
    ref: info.branch ?? info.head.slice(0, 8),
    head: info.head.slice(0, 8),
    path: info.path,
  };
}

export function workspaceFileVars(
  name: string,
  filePath: string,
  parent: WorktreeInfo | undefined,
): Record<string, string> {
  return {
    name,
    branch: parent?.branch ?? "",
    ref: parent?.branch ?? parent?.head.slice(0, 8) ?? "",
    head: parent?.head.slice(0, 8) ?? "",
    path: filePath,
    worktree: parent?.name ?? "",
  };
}

// --- Template getters ---

// Repository (main worktree header)
export function getRepositoryLabel(): string {
  return get("git-work-grove.template.repository.label", "Repository");
}
export function getRepositoryDescription(): string {
  return get("git-work-grove.template.repository.description", "");
}

// Linked worktree
export function getWorktreeLabel(): string {
  return get("git-work-grove.template.worktree.label", "{name}");
}
export function getWorktreeDescription(): string {
  return get("git-work-grove.template.worktree.description", "");
}

// Workspace file under repository
export function getRepositoryWorkspaceLabel(): string {
  return get("git-work-grove.template.repositoryWorkspace.label", "{name}");
}
export function getRepositoryWorkspaceDescription(): string {
  return get("git-work-grove.template.repositoryWorkspace.description", "");
}

// Workspace file under linked worktree
export function getWorktreeWorkspaceLabel(): string {
  return get("git-work-grove.template.worktreeWorkspace.label", "{name}");
}
export function getWorktreeWorkspaceDescription(): string {
  return get("git-work-grove.template.worktreeWorkspace.description", "");
}

// Favorite: repository
export function getFavoriteRepositoryLabel(): string {
  return get("git-work-grove.template.favoriteRepository.label", "Repository");
}
export function getFavoriteRepositoryDescription(): string {
  return get("git-work-grove.template.favoriteRepository.description", "");
}

// Favorite: linked worktree
export function getFavoriteWorktreeLabel(): string {
  return get("git-work-grove.template.favoriteWorktree.label", "{name}");
}
export function getFavoriteWorktreeDescription(): string {
  return get("git-work-grove.template.favoriteWorktree.description", "");
}

// Favorite: workspace file under repository
export function getFavoriteRepositoryWorkspaceLabel(): string {
  return get("git-work-grove.template.favoriteRepositoryWorkspace.label", "{name}");
}
export function getFavoriteRepositoryWorkspaceDescription(): string {
  return get("git-work-grove.template.favoriteRepositoryWorkspace.description", "");
}

// Favorite: workspace file under linked worktree
export function getFavoriteWorktreeWorkspaceLabel(): string {
  return get("git-work-grove.template.favoriteWorktreeWorkspace.label", "{name}");
}
export function getFavoriteWorktreeWorkspaceDescription(): string {
  return get("git-work-grove.template.favoriteWorktreeWorkspace.description", "🌲 {worktree}");
}
