"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/ui/icons";
import { ShareDialog, type ShareTarget } from "@/components/share/share-dialog";

export function BadgeShareButton({ badge }: { badge: { key: string; name: string; description: string } }) {
  const [open, setOpen] = useState(false);
  const target: ShareTarget = { kind: "badge", badgeKey: badge.key, title: badge.name, description: badge.description, dayNumber: null, arcLength: null };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Share ${badge.name}`} className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-fg">
        <ShareIcon size={15} />
      </button>
      {open ? <ShareDialog open target={target} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function MilestoneShareButton({ target, label = "Share" }: { target: ShareTarget; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <ShareIcon size={13} />
        {label}
      </button>
      {open ? <ShareDialog open target={target} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
