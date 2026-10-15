"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Conversation } from "../lib/chat-types";

type ChatState = {
  authenticated: boolean;
  conversations: Conversation[];
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  flush: () => Promise<void>;
  storageError: string;
};
const ChatContext = createContext<ChatState | null>(null);

export function ChatProvider({ authenticated, initialConversations, children }: {
  authenticated: boolean;
  initialConversations: Conversation[];
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [storageError, setStorageError] = useState("");
  const queuedSnapshots = useRef(new Map(initialConversations.map((conversation) => [conversation.id, JSON.stringify(conversation)])));
  const saveQueue = useRef(Promise.resolve());

  const flush = useCallback(() => {
    if (!authenticated) return Promise.resolve();
    for (const conversation of conversations) {
      const state = JSON.stringify(conversation);
      if (queuedSnapshots.current.get(conversation.id) === state) continue;
      queuedSnapshots.current.set(conversation.id, state);
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        try {
          const response = await fetch(`/api/chats/${conversation.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: conversation.messages[0].text.slice(0, 200), state }),
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error("대화를 저장하지 못했어요.");
          setStorageError("");
        } catch (error) {
          if (queuedSnapshots.current.get(conversation.id) === state) queuedSnapshots.current.delete(conversation.id);
          setStorageError("대화를 저장하지 못했어요. 연결을 확인한 후 다시 시도해 주세요.");
          throw error;
        }
      });
    }
    return saveQueue.current;
  }, [authenticated, conversations]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = setTimeout(() => { void flush().catch((error) => setStorageError(error.message)); }, 300);
    return () => clearTimeout(timer);
  }, [authenticated, flush]);

  return <ChatContext.Provider value={{ authenticated, conversations, setConversations, flush, storageError }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const state = useContext(ChatContext);
  if (!state) throw new Error("ChatProvider가 필요합니다.");
  return state;
}
