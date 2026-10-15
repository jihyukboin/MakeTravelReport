"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { prepareReportAction } from "../actions/report";
import { useChat } from "./chat-provider";

export function ReportLink({ conversationId }: { conversationId: string }) {
  const { conversations, flush } = useChat();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const href = `/c/${conversationId}/result`;

  return <div className="mt-6 border-t border-[#dce0e5] pt-6">
    <a href={href} target="_blank" rel="noopener noreferrer" aria-disabled={pending}
      onClick={async (event) => {
        event.preventDefault();
        if (pending) return;
        const conversation = conversations.find(({ id }) => id === conversationId);
        if (!conversation) return;
        const tab = window.open("about:blank", "_blank");
        if (tab) tab.opener = null;
        setPending(true);
        setError("");
        try {
          await flush();
          await prepareReportAction(conversation);
          if (tab) tab.location.replace(href);
          else window.open(href, "_blank", "noopener,noreferrer");
        } catch {
          tab?.close();
          setError("계획서를 열지 못했어요. 다시 눌러 주세요.");
        } finally { setPending(false); }
      }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white hover:bg-[#0077ed] ${pending ? "pointer-events-none opacity-60" : ""}`}>
      {pending ? "계획서 준비 중…" : "계획서 보러가기"}<ArrowUpRight size={17} aria-hidden="true" />
    </a>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </div>;
}
