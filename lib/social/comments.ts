import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { visiblePost } from "@/lib/social/posts";
import { notify } from "@/lib/social/notifications";
import { getBlockedUserIds } from "@/lib/social/blocking";

export const COMMENT_MAX = 300;

export const commentSchema = z.object({
  postId: z.string().min(1).max(64),
  content: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, "Write something first.")
    .refine((s) => s.length <= COMMENT_MAX, `Comments must be under ${COMMENT_MAX} characters.`),
});

export type CommentView = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  isMine: boolean;
  canDelete: boolean;
  author: {
    name: string | null;
    username: string | null;
    image: string | null;
  };
};

export async function addComment(userId: string, raw: unknown): Promise<{ ok: true; comment: CommentView } | { ok: false; error: string }> {
  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  const { postId, content } = parsed.data;
  const post = await visiblePost(postId, userId);
  if (!post) {
    return { ok: false, error: "This post is no longer available." };
  }

  const blocked = await getBlockedUserIds(userId);
  if (blocked.includes(post.authorId)) {
    return { ok: false, error: "You cannot comment on this post." };
  }

  const comment = await prisma.postComment.create({
    data: {
      postId,
      authorId: userId,
      content,
    },
    include: {
      author: {
        select: { name: true, username: true, image: true },
      },
    },
  });

  if (post.authorId !== userId) {
    await notify({
      userId: post.authorId,
      actorId: userId,
      type: "COMMENT",
      referenceId: postId,
    });
  }

  return {
    ok: true,
    comment: {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt,
      isMine: true,
      canDelete: true,
      author: comment.author,
    },
  };
}

export async function deleteComment(userId: string, commentId: string): Promise<boolean> {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      post: { select: { authorId: true } },
    },
  });

  if (!comment) return false;
  // Comment author OR post owner can delete
  if (comment.authorId !== userId && comment.post.authorId !== userId) {
    return false;
  }

  await prisma.postComment.delete({ where: { id: commentId } });
  return true;
}

export async function listComments(postId: string, viewerId: string | null): Promise<CommentView[]> {
  const post = await visiblePost(postId, viewerId);
  if (!post) return [];

  const blocked = viewerId ? await getBlockedUserIds(viewerId) : [];

  const comments = await prisma.postComment.findMany({
    where: {
      postId,
      authorId: { notIn: blocked },
    },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true, username: true, image: true } },
    },
  });

  return comments.map((c) => ({
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    content: c.content,
    createdAt: c.createdAt,
    isMine: viewerId === c.authorId,
    canDelete: viewerId === c.authorId || viewerId === post.authorId,
    author: c.author,
  }));
}
