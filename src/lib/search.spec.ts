import { describe, expect, it } from "vitest";

import { isPagefindSourcePath, toSearchResultUrl } from "./search";

describe("toSearchResultUrl", () => {
  it.each([
    { expected: "/docs/minutes/term-2015/20151009", path: "docs/minutes/term-2015/20151009/index.html" },
    { expected: "/docs/misc/sample", path: "docs/misc/sample.html" },
    { expected: "/docs", path: "docs/index.html" },
    { expected: "/docs/misc/%E3%83%A1%E3%83%A2", path: "docs\\misc\\メモ\\index.html" },
  ])("converts $path to $expected", ({ expected, path }) => {
    expect(toSearchResultUrl(path)).toBe(expected);
  });
});

describe("isPagefindSourcePath", () => {
  it.each(["/pagefind-source", "/pagefind-source/docs/foo"])("matches %s", (path) => {
    expect(isPagefindSourcePath(path)).toBe(true);
  });

  it.each(["/pagefind/pagefind.js", "/pagefind-sources", "/docs/pagefind-source"])("does not match %s", (path) => {
    expect(isPagefindSourcePath(path)).toBe(false);
  });
});
