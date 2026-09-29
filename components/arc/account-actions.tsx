"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccount, endArc } from "@/lib/actions/account";
import { signOutAction } from "@/lib/auth-actions";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MountainIcon, SignOutIcon, TrashIcon } from "@/components/ui/icons";

const rowClass = "flex min-h-11 w-full items-center gap-3 text-left text-sm";

export function AccountActions({ hasActiveArc }: { hasActiveArc: boolean }) {
  const [dialog, setDialog] = useState<"end" | "delete" | null>(null);
  const [confirmText, setConfirmText] = useState("");

  function close() {
    setDialog(null);
    setConfirmText("");
  }

  return (
    <>
      <div className="space-y-1">
        <form action={signOutAction}>
          <button type="submit" className={`${rowClass} hover:text-muted`}>
            <SignOutIcon size={16} /> Sign out
          </button>
        </form>
        {hasActiveArc ? (
          <button type="button" onClick={() => setDialog("end")} className={`${rowClass} text-muted hover:text-fg`}>
            <MountainIcon size={16} /> End this Arc early
          </button>
        ) : null}
        <button type="button" onClick={() => setDialog("delete")} className={`${rowClass} text-muted hover:text-fg`}>
          <TrashIcon size={16} /> Delete account
        </button>
      </div>

      <Dialog open={dialog === "end"} onClose={close} title="End this Arc?">
        <p className="text-sm leading-relaxed text-muted">
          Your Arc will stop here. Its history is kept, and you can build a new one right away.
        </p>
        <form action={endArc} className="mt-6 flex gap-2">
          <button type="button" onClick={close} className={buttonClass("secondary", "flex-1")}>
            Keep going
          </button>
          <Submit label="End Arc" pendingLabel="Ending…" />
        </form>
      </Dialog>

      <Dialog open={dialog === "delete"} onClose={close} title="Delete your account?">
        <p className="text-sm leading-relaxed text-muted">
          This permanently deletes your account, your Arc and all of your progress. It can&apos;t be undone.
        </p>
        <form action={deleteAccount} className="mt-5">
          <label htmlFor="confirm-delete" className="text-xs text-muted">
            Type <span className="font-medium text-fg">delete</span> to confirm
          </label>
          <input
            id="confirm-delete"
            name="confirm"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-fg focus:outline-none"
          />
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={close} className={buttonClass("secondary", "flex-1")}>
              Cancel
            </button>
            <Submit label="Delete forever" pendingLabel="Deleting…" disabled={confirmText.trim() !== "delete"} />
          </div>
        </form>
      </Dialog>
    </>
  );
}

function Submit({ label, pendingLabel, disabled = false }: { label: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={buttonClass("primary", "flex-1")}>
      {pending ? pendingLabel : label}
    </button>
  );
}
