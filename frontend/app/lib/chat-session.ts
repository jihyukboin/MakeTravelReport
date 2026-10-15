import "server-only";

import { cookies } from "next/headers";
import type { Conversation } from "./chat-types";

export async function backendFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const base = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002";
  return fetch(`${base.replace(/\/$/, "")}/api/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: cookieStore.toString(), ...init.headers },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15000),
  });
}

export async function getChatSession(): Promise<{ authenticated: boolean; conversations: Conversation[] }> {
  if (!(await cookies()).has("JSESSIONID")) return { authenticated: false, conversations: [] };
  const response = await backendFetch("auth/me");
  if (!response.ok) throw new Error("세션을 조회하지 못했습니다.");
  const { authenticated } = await response.json();
  if (!authenticated) return { authenticated: false, conversations: [] };

  const history = await backendFetch("chats");
  if (!history.ok) throw new Error("대화 이력을 조회하지 못했습니다.");
  const rows: { id: string; state: string }[] = await history.json();
  const conversations = rows.map((row) => {
    const conversation: Conversation = { ...JSON.parse(row.state), id: row.id };
    conversation.messages = conversation.messages.map((message) => message.recommendationStatus === "loading"
      ? { ...message, recommendationStatus: "error", text: "추천 도중 대화가 닫혔어요. 다시 추천받기를 눌러 주세요." } : message);
    return conversation;
  });
  return { authenticated: true, conversations };
}
