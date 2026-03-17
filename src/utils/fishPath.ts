import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

let resolvedHome: string | undefined;

function getHome(): string {
  if (resolvedHome === undefined) {
    try {
      resolvedHome = fs.realpathSync(os.homedir());
    } catch {
      resolvedHome = os.homedir();
    }
  }
  return resolvedHome;
}

export function abbreviatePath(absolutePath: string): string {
  const home = getHome();
  let display = absolutePath;
  let prefix = "";

  if (display === home || display.startsWith(`${home}/`)) {
    display = display.slice(home.length);
    prefix = "~";
  }

  const parts = display.split("/").filter(Boolean);
  const dotGitIndex = parts.indexOf(".git");

  const abbreviated = parts.map((part, i) => {
    // Last component: always full
    if (i === parts.length - 1) return part;
    // Everything at or after .git: always full
    if (dotGitIndex !== -1 && i >= dotGitIndex) return part;
    // Abbreviate to first character
    return part[0] ?? part;
  });

  const result = abbreviated.join("/");
  if (prefix) {
    return result ? `${prefix}/${result}` : prefix;
  }
  return `/${result}`;
}
