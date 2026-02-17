# Git WorkGrove — Project Instructions

## Specifications

Design specs live in `docs/spec/`. These are the **source of truth** for how features should work.

### Spec Maintenance Rules

1. **Read specs before implementing** — Always consult relevant spec files before modifying a feature. The specs define the expected behavior.
2. **Update specs when changing features** — Any code change that alters behavior MUST have a corresponding spec update in the same work session. Specs and code must stay in sync.
3. **Create specs for new features** — New functionality requires a new spec document (or an update to an existing one) BEFORE or DURING implementation.
4. **Optimize specs continuously** — When you notice a spec is incomplete, ambiguous, or inconsistent with the code, fix it. Specs should be clear enough for any developer or AI to implement from.
5. **Cross-reference between specs** — When one spec depends on another (e.g., favorites depends on tree-structure), reference it explicitly.

### Current Specs

| Spec | Covers |
|------|--------|
| `docs/spec/tree-structure.md` | 4 fundamental types, node hierarchy, icons, collapsible states |
| `docs/spec/current-indicator.md` | Single-current-item rule, detection logic, visual effects |
| `docs/spec/favorites.md` | Data model, resolution, ordering, drag-and-drop, stale cleanup |
| `docs/spec/templates.md` | 8 template types, variables, defaults, selection logic |
| `docs/spec/commands.md` | All commands, menu placement, behaviors |
| `docs/spec/workspace-scanning.md` | File discovery, include/exclude patterns, limits |
| `docs/spec/open-behavior.md` | Open modes, URI resolution, click handling |
| `docs/spec/empty-states.md` | Git unavailable, no repository, no worktrees messages |

## The 4 Fundamental Types

**Critical design principle:** Every item in the tree falls into one of 4 categories based on two axes. All templates, icons, context values, and behaviors must properly distinguish these 4 types:

|  | Repository (main worktree) | Linked worktree |
|---|---|---|
| **Worktree itself** | Repository | Worktree |
| **Workspace file under it** | Repository Workspace | Worktree Workspace |

With favorites, these become 8 item types (4 normal + 4 favorite). Never conflate repository workspace with worktree workspace — they have different available template variables and may display different information.

## Code Conventions

- **ESLint**: Uses `@antfu/eslint-config` with `perfectionist/sort-named-imports` — named imports MUST be alphabetically sorted
- **Formatting**: Uses `oxfmt` (not Prettier)
- **Build**: `pnpm build` (esbuild, single CJS output)
- **Tests**: `pnpm test` (vitest)
- **Lint**: `pnpm lint:es`
- **Local install**: `pnpm local:install` (build + package + install to VS Code)

## Project Structure

```
src/
  commands/       — Command handlers (one file per command group)
  services/       — Business logic (git, favorites, workspace scanner)
  utils/          — Shared utilities (config, template, currentIndicator, outputChannel)
  views/          — TreeItem subclasses and TreeDataProvider
  types.ts        — Shared TypeScript interfaces
  constants.ts    — All constant values (command IDs, config keys, etc.)
  extension.ts    — Extension entry point (activation, registration)
docs/
  spec/           — Design specifications (source of truth)
  templates.md    — User-facing template customization guide
```
