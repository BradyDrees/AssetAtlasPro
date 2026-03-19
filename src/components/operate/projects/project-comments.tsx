"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getProjectComments,
  addProjectComment,
} from "@/app/actions/operate-projects";
import type { ProjectComment } from "@/app/actions/operate-projects";

interface ProjectCommentsProps {
  projectId: string;
  initialComments: ProjectComment[];
  t: (key: string) => string;
}

export function ProjectComments({
  projectId,
  initialComments,
  t,
}: ProjectCommentsProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await addProjectComment(projectId, body);
      if (result.success) {
        setBody("");
        const { data } = await getProjectComments(projectId);
        setComments(data);
      }
    });
  };

  // Separate top-level and replies
  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  const getReplies = (parentId: string) =>
    replies.filter((r) => r.parent_id === parentId);

  return (
    <div className="space-y-4">
      <h3 className="text-content-primary font-semibold">
        {t("comments.title")}
      </h3>

      {/* Comment list */}
      {topLevel.length === 0 ? (
        <p className="text-content-quaternary text-sm">{t("comments.noComments")}</p>
      ) : (
        <div className="space-y-3">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentBubble comment={comment} />
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className="ml-8 mt-2">
                  <CommentBubble comment={reply} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={t("comments.placeholder")}
          className="flex-1 px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-primary placeholder:text-content-quaternary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
        />
        <button
          onClick={handleSubmit}
          disabled={isPending || !body.trim()}
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {t("comments.send")}
        </button>
      </div>
    </div>
  );
}

function CommentBubble({ comment }: { comment: ProjectComment }) {
  return (
    <div className="bg-surface-tertiary rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-content-secondary text-sm font-medium">
          {comment.author_name}
        </span>
        <span className="text-content-quaternary text-xs">
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="text-content-primary text-sm">{comment.body}</p>
    </div>
  );
}
