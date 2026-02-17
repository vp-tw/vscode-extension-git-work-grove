import { vdustr } from "@vp-tw/eslint-config";

export default vdustr({
  ignores: ["docs/**"],
}, {
  files: ["package.json"],
  rules: {
    "package-json/no-empty-fields": "off",
  },
});
