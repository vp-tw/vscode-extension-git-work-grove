---
"git-work-grove": minor
---

Add Open in Terminal command for worktrees and workspace files

- New context menu and inline button to open a terminal at any item's location
- Terminal CWD resolves to the worktree directory (or parent directory for workspace files)
- Customizable terminal name templates for all 4 item types
- Added "terminal" option to the openBehavior setting
- Leaf worktrees/repository (no workspace files) now respond to clicks via openBehavior
- QuickPick includes "Open in Terminal" and "Always Open in Terminal" options
