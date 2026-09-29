"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "@/components/ui/icons";

/** Native <dialog>: focus trapping, Escape and top-layer come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-bg p-0 text-fg shadow-sm"
    >
      {open ? (
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-base font-medium">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:text-fg"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
