/**
 * auth.middleware unit tests
 *
 * Tests the authenticateUser middleware in isolation by mocking supabaseAdmin.auth.
 */

jest.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      refreshSession: jest.fn(),
    },
  },
}));

import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { authenticateUser } from "../../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request;
}

function buildRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

const next: NextFunction = jest.fn();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("authenticateUser middleware", () => {
  const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;
  const mockRefreshSession = supabaseAdmin.auth.refreshSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (next as jest.Mock).mockClear();
  });

  // --- Happy path: Bearer token ---

  it("attaches user to req and calls next() when Authorization header token is valid", async () => {
    // Arrange
    const fakeUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const req = buildReq({
      headers: { authorization: "Bearer valid-access-token" },
    });
    const { res } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(mockGetUser).toHaveBeenCalledWith("valid-access-token");
    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("attaches user to req and calls next() when cookie access token is valid", async () => {
    // Arrange
    const fakeUser = { id: "user-456", email: "cookie@example.com" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const req = buildReq({
      cookies: { "sb-access-token": "cookie-access-token" },
    });
    const { res } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(mockGetUser).toHaveBeenCalledWith("cookie-access-token");
    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  // --- Refresh token fallback ---

  it("uses refresh token when access token is expired, rotates cookies, and calls next()", async () => {
    // Arrange — access token fails, refresh succeeds
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });

    const refreshUser = { id: "user-789" };
    const newSession = {
      access_token: "new-access",
      refresh_token: "new-refresh",
    };
    mockRefreshSession.mockResolvedValue({
      data: { session: newSession, user: refreshUser },
      error: null,
    });

    const req = buildReq({
      cookies: {
        "sb-access-token": "expired-token",
        "sb-refresh-token": "valid-refresh-token",
      },
    });

    const cookieCallArgs: unknown[][] = [];
    const cookie = jest.fn((...args: unknown[]) => cookieCallArgs.push(args));
    const { res } = buildRes();
    (res as unknown as Record<string, unknown>).cookie = cookie;

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(mockRefreshSession).toHaveBeenCalledWith({ refresh_token: "valid-refresh-token" });
    expect(req.user).toEqual(refreshUser);
    expect(cookie).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(1);
  });

  // --- Rejection paths ---

  it("returns 401 when no token is present at all", async () => {
    // Arrange
    const req = buildReq();
    const { res, status, json } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when access token is invalid and no refresh token is provided", async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });

    const req = buildReq({
      headers: { authorization: "Bearer bad-token" },
    });
    const { res, status, json } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when both access and refresh tokens are expired/invalid", async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    mockRefreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: new Error("refresh expired"),
    });

    const req = buildReq({
      cookies: {
        "sb-access-token": "expired-access",
        "sb-refresh-token": "expired-refresh",
      },
    });
    const { res, status, json } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 when supabaseAdmin.auth.getUser throws unexpectedly", async () => {
    // Arrange
    mockGetUser.mockRejectedValue(new Error("network error"));

    const req = buildReq({
      headers: { authorization: "Bearer some-token" },
    });
    const { res, status, json } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: "Authentication failed" });
    expect(next).not.toHaveBeenCalled();
  });

  // --- Header parsing edge cases ---

  it("prefers Authorization header over cookie when both are present", async () => {
    // Arrange
    const headerUser = { id: "header-user" };
    mockGetUser.mockResolvedValue({ data: { user: headerUser }, error: null });

    const req = buildReq({
      headers: { authorization: "Bearer header-token" },
      cookies: { "sb-access-token": "cookie-token" },
    });
    const { res } = buildRes();

    // Act
    await authenticateUser(req, res, next);

    // Assert
    expect(mockGetUser).toHaveBeenCalledWith("header-token");
    expect(req.user).toEqual(headerUser);
  });
});
