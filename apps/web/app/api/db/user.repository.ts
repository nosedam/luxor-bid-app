import { prisma } from "@workspace/db";
import type { IUserRepository } from "../core/ports/user.repository";
import type { User } from "../core/domain/user";

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: { name: string; email: string; password: string }): Promise<User> {
    return prisma.user.create({ data });
  }
}
