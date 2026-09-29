import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications, unreadNotificationCount } from "@/lib/social/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [unread, items] = await Promise.all([unreadNotificationCount(user.id), listNotifications(user.id)]);
  return NextResponse.json({ unread, items });
}
