# git-work-grove

## 0.3.0

### Minor Changes

- 3173d91: Add Open in Terminal command for worktrees and workspace files

  - New context menu and inline button to open a terminal at any item's location
  - Terminal CWD resolves to the worktree directory (or parent directory for workspace files)
  - Customizable terminal name templates for all 4 item types
  - Added "terminal" option to the openBehavior setting
  - Leaf worktrees/repository (no workspace files) now respond to clicks via openBehavior
  - QuickPick includes "Open in Terminal" and "Always Open in Terminal" options

## 0.2.0

### Minor Changes

- d20394c: Add Copy Name and Copy Path context menu commands

### Patch Changes

- cad2599: Add Open VSX Registry publishing support

## 0.1.2

### Patch Changes

- b85fbcc: Add screenshot and comprehensive usage documentation to README

## 0.1.1

### Patch Changes

- f80a0d9: Show contextual welcome messages when git is unavailable or no repository is found in the workspace
