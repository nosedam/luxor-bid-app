export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export type PublicUser = Pick<User, "id" | "name" | "email">;
