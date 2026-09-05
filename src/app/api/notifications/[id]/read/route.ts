import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, now } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(req);
    const idx = db.notifications.findIndex(
      (n) => n.id === params.id && n.userId === auth.userId
    );
    if (idx === -1) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (db.notifications[idx].read) {
      return NextResponse.json(db.notifications[idx]);
    }

    db.notifications[idx].read = true;
    db.notifications[idx].metadata = {
      ...db.notifications[idx].metadata,
      readAt: now(),
      readBy: auth.userId,
    };

    return NextResponse.json(db.notifications[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(req);
    const idx = db.notifications.findIndex(
      (n) => n.id === params.id && n.userId === auth.userId
    );
    if (idx === -1) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    db.notifications.splice(idx, 1);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
