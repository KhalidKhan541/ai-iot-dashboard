import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = hashPassword(password);
    const timestamp = now();

    const newUser = {
      id: genId(),
      email,
      name,
      password: hashedPassword,
      role: "viewer" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
      twoFactorEnabled: false,
      preferences: {
        theme: "dark" as const,
        notifications: true,
        emailDigest: "weekly" as const,
        timezone: "UTC",
        language: "en",
      },
    };

    db.users.push(newUser);
    const token = createSession(newUser.id);

    db.activityLogs.unshift({
      id: genId(),
      type: "user",
      action: "registered",
      description: `${name} created a new account`,
      userId: newUser.id,
      userName: name,
      severity: "success",
      metadata: {},
      timestamp,
    });

    const { password: _, ...safeUser } = newUser;

    const response = NextResponse.json({ user: safeUser, token }, { status: 201 });
    response.cookies.set("iotdash_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
