import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../core/services/auth.service";
import { AppError } from "../../../core/domain/errors";
import { PrismaUserRepository } from "../../../db/user.repository";
import { verifyRefreshToken, signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("refresh_token")?.value;
  if (!token) return NextResponse.json({ error: "No refresh token" }, { status: 401 });

  const payload = await verifyRefreshToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });

  try {
    const service = new AuthService(new PrismaUserRepository());
    const user = await service.getUserById(payload.userId);
    const [accessToken, refreshToken] = await Promise.all([signAccessToken(user.id), signRefreshToken(user.id)]);
    const response = NextResponse.json({ user });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
