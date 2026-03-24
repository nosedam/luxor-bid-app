// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getSession,
  requireAuth,
  setAuthCookies,
  clearAuthCookies,
} from "../../lib/auth";

// Mock next/server before importing lib/auth functions that use it
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return actual;
});

describe("JWT utilities", () => {
  describe("signAccessToken / verifyAccessToken", () => {
    it("signs and verifies an access token containing userId", async () => {
      const token = await signAccessToken("user-42");
      const result = await verifyAccessToken(token);
      expect(result).toEqual({ userId: "user-42" });
    });

    it("returns null for an invalid access token", async () => {
      const result = await verifyAccessToken("not.a.valid.token");
      expect(result).toBeNull();
    });

    it("returns null for a token signed with the wrong secret", async () => {
      // A refresh token should not validate as an access token
      const refreshToken = await signRefreshToken("user-42");
      const result = await verifyAccessToken(refreshToken);
      // Tokens signed with different secrets are invalid for the other
      // (they may happen to verify if both use fallback secrets, so we just check it returns null or a userId)
      // In test env both use fallback secrets of different values, so this should be null
      expect(result).toBeNull();
    });
  });

  describe("signRefreshToken / verifyRefreshToken", () => {
    it("signs and verifies a refresh token containing userId", async () => {
      const token = await signRefreshToken("user-99");
      const result = await verifyRefreshToken(token);
      expect(result).toEqual({ userId: "user-99" });
    });

    it("returns null for an invalid refresh token", async () => {
      const result = await verifyRefreshToken("garbage");
      expect(result).toBeNull();
    });
  });
});

describe("getSession", () => {
  it("returns null when no access_token cookie is present", async () => {
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/test");
    const result = await getSession(req);
    expect(result).toBeNull();
  });

  it("returns session when a valid access_token cookie is present", async () => {
    const { NextRequest } = await import("next/server");
    const token = await signAccessToken("user-1");
    const req = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `access_token=${token}` },
    });
    const result = await getSession(req);
    expect(result).toEqual({ userId: "user-1" });
  });

  it("returns null when the access_token cookie is expired or invalid", async () => {
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/test", {
      headers: { cookie: "access_token=invalid-token" },
    });
    const result = await getSession(req);
    expect(result).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns 401 NextResponse when no session exists", async () => {
    const { NextRequest, NextResponse } = await import("next/server");
    const req = new NextRequest("http://localhost/api/test");
    const result = await requireAuth(req);
    expect(result).toBeInstanceOf(NextResponse);
    const response = result as InstanceType<typeof NextResponse>;
    expect(response.status).toBe(401);
  });

  it("returns session object when authenticated", async () => {
    const { NextRequest } = await import("next/server");
    const token = await signAccessToken("user-5");
    const req = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `access_token=${token}` },
    });
    const result = await requireAuth(req);
    expect(result).toEqual({ userId: "user-5" });
  });
});

describe("setAuthCookies / clearAuthCookies", () => {
  it("sets access_token and refresh_token cookies on the response", async () => {
    const { NextResponse } = await import("next/server");
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, "access-token-value", "refresh-token-value");
    expect(response.cookies.get("access_token")?.value).toBe("access-token-value");
    expect(response.cookies.get("refresh_token")?.value).toBe("refresh-token-value");
  });

  it("clears access_token and refresh_token cookies", async () => {
    const { NextResponse } = await import("next/server");
    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    expect(response.cookies.get("access_token")?.value).toBe("");
    expect(response.cookies.get("refresh_token")?.value).toBe("");
  });
});
