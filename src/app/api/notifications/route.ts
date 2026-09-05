import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Notification, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const type = url.searchParams.get("type") || "";
    const read = url.searchParams.get("read");

    let filtered = db.notifications.filter((n) => n.userId === auth.userId);

    if (type) filtered = filtered.filter((n) => n.type === type);
    if (read !== null && read !== undefined) {
      filtered = filtered.filter((n) => n.read === (read === "true"));
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const unreadCount = db.notifications.filter((n) => n.userId === auth.userId && !n.read).length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const response: PaginatedResponse<Notification> & { unreadCount: number } = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      unreadCount,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const { type, title, message, actionUrl, metadata, targetUserId } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }

    const validTypes = ["alert", "system", "device", "rule", "ai", "info"];
    const notifType = validTypes.includes(type) ? type : "info";

    const notification: Notification = {
      id: genId(),
      userId: targetUserId || auth.userId,
      type: notifType as Notification["type"],
      title,
      message,
      read: false,
      actionUrl: actionUrl || undefined,
      metadata: metadata || {},
      createdAt: now(),
    };

    db.notifications.push(notification);

    return NextResponse.json(notification, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();

    if (body.markAllRead) {
      let count = 0;
      for (const notif of db.notifications) {
        if (notif.userId === auth.userId && !notif.read) {
          notif.read = true;
          count++;
        }
      }
      return NextResponse.json({ marked: count });
    }

    return NextResponse.json({ error: "Use markAllRead: true or the /read endpoint for individual notifications" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
