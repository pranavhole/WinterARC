"use client";

import { useTransition } from "react";
import { disconnectLinkedInAction } from "@/lib/actions/integrations";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon, GoogleIcon } from "@/components/ui/icons";

type LinkedIn = { configured: boolean; connected: boolean; name?: string | null; expired?: boolean };

export function ConnectedAccounts({ linkedIn, notice }: { linkedIn: LinkedIn; notice: string | null }) {
  const [pending, start] = useTransition();
  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        <li className="flex min-h-14 items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2.5">
            <GoogleIcon size={15} /> Google
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <CheckIcon size={13} /> Connected
          </span>
        </li>
        <li className="flex min-h-14 items-center justify-between gap-4 text-sm">
          <span>
            LinkedIn
            {linkedIn.connected && linkedIn.name ? <span className="ml-2 text-xs text-muted">{linkedIn.name}</span> : null}
          </span>
          {!linkedIn.configured ? (
            <span className="text-xs text-muted">Not available</span>
          ) : linkedIn.connected && !linkedIn.expired ? (
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <CheckIcon size={13} /> Connected
              </span>
              <button type="button" disabled={pending} onClick={() => start(() => disconnectLinkedInAction().then(() => undefined))} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
                Disconnect
              </button>
            </span>
          ) : (
            <a href="/api/linkedin/connect?returnTo=/arc/settings" className={buttonClass("secondary", "min-h-9 px-4 text-xs")}>
              {linkedIn.expired ? "Reconnect" : "Connect"}
            </a>
          )}
        </li>
      </ul>
      {linkedIn.expired ? <p className="mt-2 text-xs">LinkedIn connection expired.</p> : null}
      {notice ? (
        <p role="status" className="mt-2 text-xs text-muted">
          {notice}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted">ARC only posts to LinkedIn when you confirm a preview. Nothing is posted automatically.</p>
    </div>
  );
}
