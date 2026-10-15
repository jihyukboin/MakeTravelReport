"use client";

import { ArrowUp } from "lucide-react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "./chat-provider";
import type { ChatMessage, Conversation } from "../lib/chat-types";
import { DeparturePicker } from "./departure-picker";
import { atmosphereQuestion, getDetailQuestion, timeQuestion, vehicleQuestion, TravelQuestionCards, type TravelOption } from "./travel-questions";
import { TravelRecommendations } from "./travel-recommendations";

const suggestedPrompts = [
  "제주도 3박 4일 여행 정리해줘",
  "여행 보고서 목차 만들어줘",
  "오늘 다녀온 여행 기록하기",
  "일본 여행 일정 정리해줘",
  "여행 경비 정리 도와줘",
  "기억에 남는 순간 기록하기",
];

export function TravelChat() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated: user, conversations, setConversations, storageError, flush } = useChat();
  const activeId = pathname.startsWith("/c/") ? pathname.split("/")[2] : null;
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const recommendationRequests = useRef(new Set<string>());
  const activeConversation = conversations.find(({ id }) => id === activeId);
  const pendingQuestion = activeConversation?.messages.some((message) => (message.question && !message.selectedId) || message.recommendationStatus === "loading") ?? false;

  useEffect(() => {
    const composer = composerRef.current;
    if (composer) {
      if (!input) {
        composer.style.removeProperty("height");
        threadRef.current?.style.removeProperty("--composer-height");
        return;
      }
      composer.style.height = "auto";
      const borderHeight = composer.offsetHeight - composer.clientHeight;
      composer.style.height = `${Math.min(composer.scrollHeight + borderHeight, 144)}px`;
      threadRef.current?.style.setProperty("--composer-height", `${composer.offsetHeight}px`);
    }
  }, [input]);

  useLayoutEffect(() => {
    threadRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [conversations, activeId]);

  function submitMessage() {
    const message = input.trim();
    if (!message || pendingQuestion) return;
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
        settings: { batteryPercent: 100, date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) },
        messages: [
          { role: "user", text: message },
          { role: "assistant", text: "어디서 출발하시나요?", type: "departure" },
        ],
      }, ...current]);
      router.push(`/c/${id}`, { scroll: false });
    }
    setInput("");
    composerRef.current?.focus();
  }

  function selectOption(conversationId: string, messageIndex: number, option: TravelOption) {
    const original = conversations.find(({ id }) => id === conversationId);
    const question = original?.messages[messageIndex]?.question;
    if (!original || !question || original.messages[messageIndex].selectedId) return;
    setConversations((current) => current.map((conversation) => {
      if (conversation.id !== conversationId) return conversation;
      const message = conversation.messages[messageIndex];
      if (!message?.question || message.selectedId || !message.question.options.some(({ id }) => id === option.id)) return conversation;

      const messages = conversation.messages.map((item, index) => index === messageIndex ? { ...item, selectedId: option.id } : item);
      messages.push({ role: "user", text: option.title });
      const nextQuestion = message.question.id === "vehicle" ? atmosphereQuestion
        : message.question.id === "atmosphere" ? getDetailQuestion(option.id)
        : message.question.id === "nature" || message.question.id === "culture" ? timeQuestion : null;

      if (nextQuestion) {
        messages.push({ role: "assistant", text: nextQuestion.text, question: nextQuestion });
      } else {
        messages.push({
          role: "assistant",
          text: "여행 취향과 차량에 맞는 여행지, 가까운 충전소를 찾고 있어요…",
          recommendationStatus: "loading",
        });
      }
      return { ...conversation, messages };
    }));
    if (question.id === "time") {
      const answered = { ...original, messages: original.messages.map((message, index) => index === messageIndex ? { ...message, selectedId: option.id } : message) };
      void loadRecommendations(answered);
    }
  }

  async function loadRecommendations(conversation: Conversation) {
    if (!conversation.departure || recommendationRequests.current.has(conversation.id)) return;
    recommendationRequests.current.add(conversation.id);
    const answer = (questionIds: string[]) => conversation.messages.find((message) => message.question && questionIds.includes(message.question.id))?.selectedId;
    const update = (result: Partial<ChatMessage>) => setConversations((current) => current.map((item) => item.id === conversation.id
      ? { ...item, messages: item.messages.map((message) => message.recommendationStatus ? { ...message, ...result } : message) }
      : item));
    update({ recommendationStatus: "loading", text: "여행 취향과 차량에 맞는 여행지, 가까운 충전소를 찾고 있어요…" });
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure: conversation.departure.address,
          sido: conversation.departure.sido,
          sigungu: conversation.departure.sigungu,
          vehicle: answer(["vehicle"]),
          category: answer(["nature", "culture"]),
          moment: answer(["time"]),
          ...conversation.settings,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "추천 결과를 불러오지 못했어요.");
      update({ recommendationStatus: "done", text: data.destinations.length ? "이 여행지는 어떠세요? 취향과 이동 거리, 충전소를 함께 살펴봤어요." : "조건에 맞는 여행지를 찾지 못했어요.", recommendations: data });
    } catch (error) {
      update({ recommendationStatus: "error", text: error instanceof Error ? error.message : "추천 결과를 불러오지 못했어요." });
    } finally {
      recommendationRequests.current.delete(conversation.id);
    }
  }

  return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main id="main-content" tabIndex={-1} className="relative isolate flex min-h-0 flex-1 flex-col">
        {storageError && <div role="alert" className="flex flex-wrap items-center gap-2 bg-[#fff4ed] px-5 py-2 text-xs leading-5 text-[#9a4a12]">{storageError}{user && <button type="button" onClick={() => void flush().catch(() => {})} className="cursor-pointer underline">저장 재시도</button>}</div>}
        <div ref={threadRef} className="chat-thread flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain">
          <div className="shrink-0">
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
                        onConfirm={(departure) => {
                          const conversationId = activeConversation.id;
                          setConversations((current) => current.map((conversation) =>
                            conversation.id === conversationId && !conversation.departure
                              ? {
                                  ...conversation,
                                  departure,
                                  messages: [
                                    ...conversation.messages,
                                    { role: "user", text: departure.address },
                                    { role: "assistant", text: `출발지가 설정되었어요. 이제 여행을 준비해 볼게요.\n\n${vehicleQuestion.text}`, question: vehicleQuestion },
                                  ],
                                }
                              : conversation,
                          ));
                        }}
                      />
                    )}
                    {message.question && (
                      <TravelQuestionCards
                        question={message.question}
                        selectedId={message.selectedId}
                        disabled={Boolean(message.selectedId)}
                        onSelect={(option) => selectOption(activeConversation.id, index, option)}
                        settings={activeConversation.settings}
                        onSettingsChange={(settings) => setConversations((current) => current.map((conversation) => conversation.id === activeConversation.id ? { ...conversation, settings } : conversation))}
                      />
                    )}
                    {message.recommendationStatus === "error" && <button type="button" onClick={() => void loadRecommendations(activeConversation)} className="mt-4 min-h-11 cursor-pointer rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white hover:bg-[#0077ed]">다시 추천받기</button>}
                    {message.recommendations && <TravelRecommendations result={message.recommendations} conversationId={activeConversation.id} />}
                  </div>
                </div>
              ))}
            </div>
          ) : activeId ? (
            <div className="mx-auto max-w-lg px-6 py-20 text-center">
              <p className="text-base leading-7 text-[#4e5968]">{user ? "이 대화를 찾을 수 없어요. 최근 대화에서 선택하거나 새 채팅을 시작해 주세요." : "저장된 대화를 보려면 로그인해 주세요."}</p>
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
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); submitMessage(); }}
          className="composer-overlay pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:px-5"
        >
          <div className="pointer-events-auto relative mx-auto w-full max-w-[784px]">
            <div className="relative">
              <textarea
                ref={composerRef}
                aria-label="여행 메시지 입력"
                placeholder={pendingQuestion ? "위의 A/B 카드 중 하나를 선택해 주세요." : "여행 이야기를 들려주세요."}
                disabled={pendingQuestion || (Boolean(activeId) && !activeConversation)}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                className="block h-[54px] max-h-36 min-h-[54px] w-full resize-none overflow-y-auto rounded-[26px] border border-[rgba(82,168,236,0.8)] bg-white py-3.5 pr-[52px] pl-4 text-base leading-6 text-[#111827] shadow-[0_0_8px_rgba(82,168,236,0.6)] [scrollbar-width:none] outline-none placeholder:text-[#9ca3af] focus:shadow-[0_0_10px_rgba(82,168,236,0.7)] [&::-webkit-scrollbar]:hidden"
              />
              <button
                type="submit"
                aria-label="전송"
                disabled={!input.trim() || pendingQuestion || (Boolean(activeId) && !activeConversation)}
                className="absolute right-2.5 bottom-2.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#111827] text-white transition-colors hover:bg-[#374151] disabled:cursor-default disabled:bg-[#e5e7eb] disabled:text-[#9ca3af]"
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
        </main>
      </div>
  );
}
