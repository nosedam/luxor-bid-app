import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after stubbing so the module captures the mocked global
const { fetchWithAuth } = await import("../../lib/fetchWithAuth");

describe("fetchWithAuth", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns the response when status is not 401", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const result = await fetchWithAuth("/api/test");

    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/test", undefined);
  });

  it("refreshes token and retries when the initial request returns 401", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("", { status: 401 })) // initial
      .mockResolvedValueOnce(new Response("", { status: 200 })) // refresh
      .mockResolvedValueOnce(new Response("ok", { status: 200 })); // retry

    const result = await fetchWithAuth("/api/test", { method: "GET" });

    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/adapters/auth/refresh", { method: "POST" });
    expect(mockFetch).toHaveBeenNthCalledWith(3, "/api/test", { method: "GET" });
  });

  it("returns the original 401 response when token refresh fails", async () => {
    const originalResponse = new Response("", { status: 401 });
    mockFetch
      .mockResolvedValueOnce(originalResponse) // initial
      .mockResolvedValueOnce(new Response("", { status: 401 })); // refresh also fails

    const result = await fetchWithAuth("/api/test");

    expect(result.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("passes request init options to both initial and retry requests", async () => {
    const init = { method: "POST", body: JSON.stringify({ data: 1 }) };
    mockFetch
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response("created", { status: 201 }));

    const result = await fetchWithAuth("/api/resource", init);

    expect(result.status).toBe(201);
    expect(mockFetch).toHaveBeenNthCalledWith(1, "/api/resource", init);
    expect(mockFetch).toHaveBeenNthCalledWith(3, "/api/resource", init);
  });
});
