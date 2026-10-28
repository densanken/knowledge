import { beforeEach, describe, expect, it, vi } from "vitest";

import type { APIContext } from "astro";

const { fetchAsset } = vi.hoisted(() => ({ fetchAsset: vi.fn() }));

vi.mock("cloudflare:workers", () => ({ env: { ASSETS: { fetch: fetchAsset } } }));

const { GET } = await import("./[...path]");

const get = (path: string | undefined) =>
  GET({ params: { path }, url: new URL(`https://example.com/pagefind/${path ?? ""}`) } as unknown as APIContext);

beforeEach(() => {
  fetchAsset.mockReset();
  fetchAsset.mockResolvedValue(new Response("asset", { headers: { "content-type": "text/javascript" } }));
});

describe("pagefind asset route", () => {
  it("serves the requested file from the ASSETS binding", async () => {
    const response = await get("pagefind.js");

    expect(fetchAsset).toHaveBeenCalledWith(new URL("https://example.com/pagefind/pagefind.js"));
    expect(await response.text()).toBe("asset");
    expect(response.headers.get("content-type")).toBe("text/javascript");
  });

  it("returns a copy so that the middleware can modify the immutable asset headers", async () => {
    const asset = new Response("asset");
    fetchAsset.mockResolvedValue(asset);

    const response = await get("pagefind.js");

    expect(response).not.toBe(asset);
  });

  it("does not serve files outside of the pagefind bundle", async () => {
    const response = await get("../pagefind-source/docs/foo/index.html");

    expect(response.status).toBe(404);
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
