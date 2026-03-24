import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { AuthService } from "../../../app/api/core/services/auth.service";
import { AppError } from "../../../app/api/core/domain/errors";
import type { IUserRepository } from "../../../app/api/core/ports/user.repository";

vi.mock("bcryptjs");

const mockUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  password: "hashed-password",
  createdAt: new Date(),
};

const mockUserRepo: IUserRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(mockUserRepo);
  });

  describe("login", () => {
    it("throws INVALID_CREDENTIALS when user is not found", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      await expect(service.login("alice@example.com", "pass")).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        statusCode: 401,
      });
    });

    it("throws INVALID_CREDENTIALS when password is wrong", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(service.login("alice@example.com", "wrong")).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        statusCode: 401,
      });
    });

    it("returns PublicUser on successful login", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const result = await service.login("alice@example.com", "correct");
      expect(result).toEqual({ id: "user-1", name: "Alice", email: "alice@example.com" });
    });

    it("throws AppError instance on failure", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      await expect(service.login("x@x.com", "p")).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("register", () => {
    it("throws EMAIL_IN_USE when email is already registered", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser);
      await expect(service.register("Bob", "alice@example.com", "pass")).rejects.toMatchObject({
        code: "EMAIL_IN_USE",
        statusCode: 409,
      });
    });

    it("hashes password and creates user", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new" as never);
      vi.mocked(mockUserRepo.create).mockResolvedValue({
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        password: "hashed-new",
        createdAt: new Date(),
      });

      const result = await service.register("Bob", "bob@example.com", "pass");

      expect(bcrypt.hash).toHaveBeenCalledWith("pass", 10);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        name: "Bob",
        email: "bob@example.com",
        password: "hashed-new",
      });
      expect(result).toEqual({ id: "user-2", name: "Bob", email: "bob@example.com" });
    });
  });

  describe("getUserById", () => {
    it("throws USER_NOT_FOUND when user does not exist", async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);
      await expect(service.getUserById("missing")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
        statusCode: 401,
      });
    });

    it("returns PublicUser when found", async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);
      const result = await service.getUserById("user-1");
      expect(result).toEqual({ id: "user-1", name: "Alice", email: "alice@example.com" });
    });
  });
});
