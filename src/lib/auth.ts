import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "./db";

const SESSION_COOKIE = "iotdash_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return hash === verify;
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
  return token;
}

export function getSessionFromRequest(req: NextRequest): { userId: string; token: string } | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = db.sessions[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    delete db.sessions[token];
    return null;
  }
  return { userId: session.userId, token };
}

export function requireAuth(req: NextRequest): { userId: string; token: string } {
  const session = getSessionFromRequest(req);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function destroySession(token: string): void {
  delete db.sessions[token];
}

export { SESSION_COOKIE };
