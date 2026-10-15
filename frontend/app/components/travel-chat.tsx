"use client";

import { ArrowUp, MessageSquare, SquarePen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DeparturePicker } from "./departure-picker";

const suggestedPrompts = [
  "제주도 3박 4일 여행 정리해줘",
  "여행 보고서 목차 만들어줘",
  "오늘 다녀온 여행 기록하기",
  "일본 여행 일정 정리해줘",
  "여행 경비 정리 도와줘",
  "기억에 남는 순간 기록하기",
];

type ChatMessage = { role: "user" | "assistant"; text: string; type?: "departure" };
type Conversation = { id: string; departure?: string; messages: ChatMessage[] };

export function TravelChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const activeConversation = conversations.find(({ id }) => id === activeId);

  useEffect(() => {
    const composer = composerRef.current;
    if (composer) {
      composer.style.height = "auto";
      composer.style.height = `${Math.min(composer.scrollHeight, 144)}px`;
    }
  }, [input]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [conversations, activeId]);

  function submitMessage() {
    const message = input.trim();
    if (!message) return;
    if (activeId) {
      setConversations((current) => current.map((conversation) =>
        conversation.id === activeId
          ? { ...conversation, messages: [...conversation.messages, { role: "user", text: message }] }
          : conversation,
      ));
    } else {
      const id = crypto.randomUUID();
      setConversations((current) => [{
        id,
        messages: [
          { role: "user", text: message },
          { role: "assistant", text: "어디서 출발하시나요?", type: "departure" },
        ],
      }, ...current]);
      setActiveId(id);
    }
    setInput("");
    composerRef.current?.focus();
  }

  const sidebarContent = (
    <>
      <div className="p-3">
        <button
          type="button"
          aria-label="새 채팅"
          onClick={() => {
            setActiveId(null);
            setInput("");
            composerRef.current?.focus();
          }}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg bg-[#eef2ff] px-3 text-sm font-semibold text-[#315bc0] hover:bg-[#e0e7ff]"
        >
          <SquarePen size={19} className="shrink-0" aria-hidden="true" />
          <span>새 채팅</span>
        </button>
      </div>
      <nav aria-label="이전 대화" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 max-md:max-h-28">
        <p className="px-3 pt-4 pb-2 text-xs font-semibold text-[#9ca3af]">최근 대화</p>
        {conversations.length === 0 && <p className="px-3 py-2 text-sm leading-6 text-[#9ca3af]">여행 이야기를 시작하면<br />이곳에 대화가 모여요.</p>}
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            aria-current={activeId === conversation.id ? "true" : undefined}
            onClick={() => {
              setActiveId(conversation.id);
              setInput("");
              }}
            className="mb-1 flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm text-[#4b5563] hover:bg-[#f3f4f6] aria-[current=true]:bg-[#e5e7eb] aria-[current=true]:text-[#111827]"
          >
            <MessageSquare size={17} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{conversation.messages[0].text}</span>
          </button>
        ))}
      </nav>
    </>
  );

  return (
    <section aria-label="여행 보고서 채팅" className="flex h-dvh min-h-0 w-full flex-col bg-white text-[#111827] md:flex-row">
      <aside
        id="desktop-sidebar"
        aria-label="대화 목록"
        className="flex shrink-0 flex-col overflow-hidden border-b border-[#e5e7eb] bg-[#f9fafb] md:w-[260px] md:border-r md:border-b-0"
      >
        <header className="flex h-16 shrink-0 items-center border-b border-[#e5e7eb] px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">MakeTravelReport</Link>
        </header>
        {sidebarContent}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeConversation ? (
            <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 py-8 sm:px-12" aria-live="polite" aria-label="대화 내용">
              {activeConversation.messages.map((message, index) => message.role === "user" ? (
                <p key={index} className="ml-auto max-w-[85%] rounded-[22px] bg-[#f3f4f6] px-5 py-3 text-base leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {message.text}
                </p>
              ) : (
                <div key={index} className="flex items-start gap-3.5">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6]">
                    <Image src="/images/chat-avatar.webp" width={28} height={28} alt="" className="object-contain" />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-base leading-7 whitespace-pre-wrap">{message.text}</p>
                    {message.type === "departure" && !activeConversation.departure && (
                      <DeparturePicker
                        key={activeConversation.id}
                        onConfirm={(address) => {
                          const conversationId = activeConversation.id;
                          setConversations((current) => current.map((conversation) =>
                            conversation.id === conversationId && !conversation.departure
                              ? {
                                  ...conversation,
                                  departure: address,
                                  messages: [
                                    ...conversation.messages,
                                    { role: "user", text: address },
                                    { role: "assistant", text: `출발지가 설정되었어요.\n${address}` },
                                  ],
                                }
                              : conversation,
                          ));
                          composerRef.current?.focus();
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 px-5 pt-[clamp(64px,18vh,172px)] pb-8 sm:px-6">
              <h1 className="text-center text-[clamp(28px,4.4vw,44px)] leading-tight font-bold break-keep text-[#333d4b]">어떤 여행을 기록해 볼까요?</h1>
              <ul aria-label="추천 질문" className="flex w-full max-w-[640px] flex-wrap justify-center gap-2.5">
                {suggestedPrompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      onClick={() => { setInput(prompt); composerRef.current?.focus(); }}
                      className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5 text-center text-sm leading-normal font-medium break-keep text-[#4b5563] transition-colors hover:border-[#d1d5db] hover:bg-[#f3f4f6] hover:text-[#374151]"
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); submitMessage(); }}
          className="shrink-0 px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:px-5"
        >
          <div className="mx-auto w-full max-w-[784px]">
            <div className="relative">
              <textarea
                ref={composerRef}
                aria-label="여행 메시지 입력"
                placeholder="여행 이야기를 들려주세요."
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                className="block max-h-36 min-h-12 w-full resize-none overflow-y-auto rounded-[26px] border border-[rgba(82,168,236,0.8)] bg-white py-3.5 pr-[52px] pl-4 text-base leading-normal text-[#111827] shadow-[0_0_8px_rgba(82,168,236,0.6)] [scrollbar-width:none] outline-none placeholder:text-[#9ca3af] focus:shadow-[0_0_10px_rgba(82,168,236,0.7)] [&::-webkit-scrollbar]:hidden"
              />
              <button
                type="submit"
                aria-label="전송"
                disabled={!input.trim()}
                className="absolute right-2.5 bottom-2.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#111827] text-white transition-colors hover:bg-[#374151] disabled:cursor-default disabled:bg-[#e5e7eb] disabled:text-[#9ca3af]"
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 px-1 text-center text-xs leading-normal text-[#6b7280]">여행의 순간을 모아, 나만의 여행 보고서로.</p>
          </div>
        </form>
        </main>
      </div>
    </section>
  );
}
