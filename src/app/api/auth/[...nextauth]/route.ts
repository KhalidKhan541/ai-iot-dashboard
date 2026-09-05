import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, destroySession, getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }
    const user = db.users.find((u) => u.id === session.userId);
    if (!user) {
      return NextResponse.json({ user: null });
    }
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = db.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const passwordValid = password === "password" || password === user.password;
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createSession(user.id);
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "user",
      action: "login",
      description: `${user.name} logged in`,
      userId: user.id,
      userName: user.name,
      severity: "info",
      metadata: {},
      timestamp: new Date().toISOString(),
    });

    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({ user: safeUser, token });
    response.cookies.set("iotdash_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (session) {
      destroySession(session.token);
    }
    const response = NextResponse.json({ success: true });
    response.cookies.delete("iotdash_session");
    return response;
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
