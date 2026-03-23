import bcrypt from "bcryptjs";
import type { IUserRepository } from "../ports/user.repository";
import type { PublicUser } from "../domain/user";
import { AppError } from "../domain/errors";

export class AuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  async login(email: string, password: string): Promise<PublicUser> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");

    return { id: user.id, name: user.name, email: user.email };
  }

  async register(name: string, email: string, password: string): Promise<PublicUser> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new AppError("EMAIL_IN_USE", 409, "Email already in use");

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userRepo.create({ name, email, password: hashed });

    return { id: user.id, name: user.name, email: user.email };
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new AppError("USER_NOT_FOUND", 401, "User not found");
    return { id: user.id, name: user.name, email: user.email };
  }
}
