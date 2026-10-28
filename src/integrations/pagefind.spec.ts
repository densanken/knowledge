import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildSearchIndex } from "./pagefind";

const tempDirs: string[] = [];

const createClientDir = async (pages: Record<string, string>) => {
  const clientDir = await mkdtemp(join(tmpdir(), "knowledge-pagefind-"));
  tempDirs.push(clientDir);

  for (const [path, html] of Object.entries(pages)) {
    const file = join(clientDir, "pagefind-source", path);
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, html);
  }

  return clientDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("buildSearchIndex", () => {
  it("indexes the source pages with their SSR URLs and removes the source pages", async () => {
    const clientDir = await createClientDir({
      "docs/minutes/foo/index.html":
        '<html lang="ja"><body><main data-pagefind-body><h1 data-pagefind-meta="title">総会</h1><p>ランチャー作成</p></main></body></html>',
    });

    await buildSearchIndex(clientDir);

    expect(existsSync(join(clientDir, "pagefind-source"))).toBe(false);
    expect(existsSync(join(clientDir, "pagefind", "pagefind.js"))).toBe(true);

    const entry = JSON.parse(await readFile(join(clientDir, "pagefind", "pagefind-entry.json"), "utf-8")) as {
      languages: unknown;
    };
    expect(entry.languages).toMatchObject({ ja: { page_count: 1 } });
  }, 30_000);

  it("writes an empty index when there is nothing to index", async () => {
    const clientDir = await createClientDir({});

    await buildSearchIndex(clientDir);

    expect(existsSync(join(clientDir, "pagefind", "pagefind.js"))).toBe(true);
  }, 30_000);
});
