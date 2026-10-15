import { TravelChat } from "../components/travel-chat";
import { ChatSidebar } from "../components/chat-sidebar";
import { ChatProvider } from "../components/chat-provider";
import { getChatSession } from "../lib/chat-session";
import { Suspense } from "react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main id="main-content" className="flex h-dvh items-center justify-center text-sm text-[#738078]" role="status">여행 대화를 불러오고 있어요…</main>}>
    <SessionChat>{children}</SessionChat>
  </Suspense>;
}

async function SessionChat({ children }: { children: React.ReactNode }) {
  const { authenticated, conversations } = await getChatSession();
  return <ChatProvider key={authenticated ? "test" : "guest"} authenticated={authenticated} initialConversations={conversations}>
    <section aria-label="여행 보고서 채팅" className="flex h-dvh min-h-0 w-full flex-col bg-white text-[#111827] md:flex-row">
      <ChatSidebar authenticated={authenticated} />
      <TravelChat />
    </section>
    {children}
  </ChatProvider>;
}
