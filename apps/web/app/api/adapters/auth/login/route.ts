import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "../../../core/services/auth.service";
import { AppError } from "../../../core/domain/errors";
import { PrismaUserRepository } from "../../../db/user.repository";
import { signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const service = new AuthService(new PrismaUserRepository());
    const user = await service.login(parsed.data.email, parsed.data.password);
    const [accessToken, refreshToken] = await Promise.all([signAccessToken(user.id), signRefreshToken(user.id)]);
    const response = NextResponse.json({ user });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
