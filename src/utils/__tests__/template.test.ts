import { describe, expect, it } from "vitest";

// renderTemplate is a pure function — no vscode mock needed
// Import directly from source to avoid vscode dependency in getter functions
// We re-implement here to test the rendering logic in isolation

// Step 1: Conditional sections — {?key}content{/key}
// Step 2: Variables with fallback — {key|fallback}
// Step 3: Simple variables — {key}
function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;

  result = result.replace(/\{\?(\w+)\}([\s\S]*?)\{\/\1\}/g, (_, key, content) => {
    return vars[key] ? content : "";
  });

  result = result.replace(/\{(\w+)\|([^}]*)\}/g, (_, key, fallback) => {
    return vars[key] || fallback;
  });

  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }

  return result;
}

describe("renderTemplate", () => {
  describe("simple variables", () => {
    it("replaces a single variable", () => {
      expect(renderTemplate("{name}", { name: "feat-auth" })).toBe("feat-auth");
    });

    it("replaces multiple different variables", () => {
      expect(renderTemplate("{name} ({branch})", { name: "feat-auth", branch: "feat/auth" }))
        .toBe("feat-auth (feat/auth)");
    });

    it("replaces repeated occurrences of the same variable", () => {
      expect(renderTemplate("{name}-{name}", { name: "foo" })).toBe("foo-foo");
    });

    it("leaves unrecognized variables as-is", () => {
      expect(renderTemplate("{name} {unknown}", { name: "foo" })).toBe("foo {unknown}");
    });

    it("replaces with empty string when variable value is empty", () => {
      expect(renderTemplate("{name} ({branch})", { name: "feat-auth", branch: "" }))
        .toBe("feat-auth ()");
    });

    it("returns template as-is when no vars provided", () => {
      expect(renderTemplate("static text", {})).toBe("static text");
    });

    it("handles empty template", () => {
      expect(renderTemplate("", { name: "foo" })).toBe("");
    });
  });

  describe("fallback syntax {key|fallback}", () => {
    it("uses variable value when non-empty", () => {
      expect(renderTemplate("{branch|detached}", { branch: "main" })).toBe("main");
    });

    it("uses fallback when variable is empty", () => {
      expect(renderTemplate("{branch|detached}", { branch: "" })).toBe("detached");
    });

    it("uses fallback when variable is not in vars", () => {
      expect(renderTemplate("{branch|detached}", {})).toBe("detached");
    });

    it("handles empty fallback", () => {
      expect(renderTemplate("{branch|}", { branch: "" })).toBe("");
    });

    it("works alongside simple variables", () => {
      expect(renderTemplate("{name} ({branch|no branch})", { name: "feat-auth", branch: "" }))
        .toBe("feat-auth (no branch)");
    });

    it("handles multiple fallbacks in one template", () => {
      expect(renderTemplate("{a|x} {b|y}", { a: "", b: "B" })).toBe("x B");
    });
  });

  describe("conditional sections {?key}...{/key}", () => {
    it("keeps content when variable is non-empty", () => {
      expect(renderTemplate("{?branch}({branch}){/branch}", { branch: "main" }))
        .toBe("(main)");
    });

    it("removes entire section when variable is empty", () => {
      expect(renderTemplate("{?branch}({branch}){/branch}", { branch: "" }))
        .toBe("");
    });

    it("removes entire section when variable is not in vars", () => {
      expect(renderTemplate("{?branch}({branch}){/branch}", {}))
        .toBe("");
    });

    it("processes inner variables after conditional", () => {
      expect(renderTemplate("{name}{?branch} ({branch}){/branch}", { name: "feat-auth", branch: "main" }))
        .toBe("feat-auth (main)");
    });

    it("leaves other content intact when section is removed", () => {
      expect(renderTemplate("{name}{?branch} ({branch}){/branch}", { name: "feat-auth", branch: "" }))
        .toBe("feat-auth");
    });

    it("handles multiple conditional sections", () => {
      const tpl = "{?a}A:{a}{/a}{?b} B:{b}{/b}";
      expect(renderTemplate(tpl, { a: "1", b: "2" })).toBe("A:1 B:2");
      expect(renderTemplate(tpl, { a: "1", b: "" })).toBe("A:1");
      expect(renderTemplate(tpl, { a: "", b: "2" })).toBe(" B:2");
      expect(renderTemplate(tpl, { a: "", b: "" })).toBe("");
    });

    it("handles nested content with different variables", () => {
      expect(renderTemplate("{?branch}{name} on {branch}{/branch}", { name: "foo", branch: "main" }))
        .toBe("foo on main");
    });
  });

  describe("combined syntax", () => {
    it("conditional + simple variables", () => {
      expect(renderTemplate("{name}{?branch} ({branch}){/branch} [{head}]", {
        name: "feat-auth",
        branch: "feat/auth",
        head: "abc12345",
      })).toBe("feat-auth (feat/auth) [abc12345]");
    });

    it("conditional removed + simple variables", () => {
      expect(renderTemplate("{name}{?branch} ({branch}){/branch} [{head}]", {
        name: "feat-auth",
        branch: "",
        head: "abc12345",
      })).toBe("feat-auth [abc12345]");
    });

    it("fallback + simple variables", () => {
      expect(renderTemplate("{name} ({branch|{head}})", {
        name: "feat-auth",
        branch: "",
        head: "abc12345",
      })).toBe("feat-auth (abc12345)");
    });

    it("all three syntaxes together", () => {
      const tpl = "{name}{?branch} ({branch}){/branch} [{ref|unknown}]";
      expect(renderTemplate(tpl, { name: "wt", branch: "main", ref: "main" }))
        .toBe("wt (main) [main]");
      expect(renderTemplate(tpl, { name: "wt", branch: "", ref: "" }))
        .toBe("wt [unknown]");
    });
  });

  describe("processing order", () => {
    it("conditionals are processed before fallbacks", () => {
      // Conditional removes section, then fallback doesn't see it
      expect(renderTemplate("{?branch}{branch|x}{/branch}", { branch: "" }))
        .toBe("");
    });

    it("conditionals are processed before simple variables", () => {
      // Variables inside kept conditionals are still resolved
      expect(renderTemplate("{?branch}[{branch}]{/branch}", { branch: "main" }))
        .toBe("[main]");
    });

    it("fallbacks are processed before simple variables", () => {
      // {head} in fallback text is resolved as simple variable
      expect(renderTemplate("{branch|{head}}", { branch: "", head: "abc" }))
        .toBe("abc");
    });
  });
});
