import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, setAccessToken, assetUrl, API_BASE } from "./api";

describe("API boundary", () => {
  beforeEach(() => {
    setAccessToken("");
    vi.restoreAllMocks();
  });
  it("uses the configured API and sends credentials only when authenticated", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
      );
    expect(await api("/")).toEqual({ status: "ok" });
    const headers = fetch.mock.calls[0][1]?.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
    setAccessToken("test-token");
    await api("/api/v1/auth/me");
    expect(
      (fetch.mock.calls[1][1]?.headers as Headers).get("Authorization"),
    ).toBe("Bearer test-token");
  });
  it("returns actionable validation errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [{ loc: ["body", "name"], msg: "Required" }],
        }),
        { status: 422 },
      ),
    );
    await expect(api("/")).rejects.toThrow("name: Required");
  });
  it("does not set multipart content type manually", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    await api("/api/v1/uploads", { method: "POST", body: new FormData() });
    expect(
      (fetch.mock.calls[0][1]?.headers as Headers).has("Content-Type"),
    ).toBe(false);
  });
  it("resolves uploaded images without changing external URLs", () => {
    expect(assetUrl("/uploads/a.jpg")).toBe(API_BASE + "/uploads/a.jpg");
    expect(assetUrl("https://example.com/a.jpg")).toBe(
      "https://example.com/a.jpg",
    );
  });
});
