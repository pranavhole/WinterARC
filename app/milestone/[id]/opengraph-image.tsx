import { ImageResponse } from "next/og";
import { visiblePost } from "@/lib/social/posts";
import { describeCard } from "@/lib/social/milestone-card";

export const alt = "ARC milestone";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The milestone card LinkedIn shows for a shared link. Rendered for signed-out
 * crawlers, so only PUBLIC posts render; everything else gets the plain card.
 * Only the milestone: no health data or private metrics.
 */
export default async function MilestoneImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = id.length <= 64 ? await visiblePost(id, null) : null;
  const card = post ? describeCard(post) : { title: "Build your Arc", line: "90 days of showing up." };
  const day = post?.dayNumber && !card.title.startsWith("Day") ? `Day ${post.dayNumber}${post.arcLength ? ` / ${post.arcLength}` : ""}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#F7F5F0",
          color: "#111111",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 12 }}>ARC</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: 2, textTransform: "uppercase" }}>{card.title}</div>
          <div style={{ fontSize: 34, color: "#77756F", marginTop: 28 }}>{card.line}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#77756F" }}>
          <div>{day ?? "Build your Arc. Keep your promises."}</div>
          <div>Winter Arc</div>
        </div>
      </div>
    ),
    size,
  );
}
