"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChat } from "./chat-provider";

export function RecentConversations() {
  const { authenticated, conversations } = useChat();
  const pathname = usePathname();
  if (!authenticated) return <p className="px-3 py-2 text-sm leading-6 text-[#9ca3af]">로그인하면 이전 대화를 볼 수 있어요.</p>;
  if (conversations.length === 0) return <p className="px-3 py-2 text-sm leading-6 text-[#9ca3af]">여행 이야기를 시작하면<br />이곳에 대화가 모여요.</p>;
  return conversations.map((conversation) => <Link
    key={conversation.id} href={`/c/${conversation.id}`} scroll={false}
    aria-current={pathname === `/c/${conversation.id}` ? "true" : undefined}
    className="mb-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[#4b5563] hover:bg-[#f3f4f6] aria-[current=true]:bg-[#e5e7eb] aria-[current=true]:text-[#111827]">
    <MessageSquare size={17} className="shrink-0" aria-hidden="true" />
    <span className="truncate">{conversation.messages[0].text}</span>
  </Link>);
}
