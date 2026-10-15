"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendFetch } from "../lib/chat-session";
import type { Conversation } from "../lib/chat-types";

export async function loginAction(_previous: { error: string }, formData: FormData) {
  const response = await backendFetch("auth/login", {
    method: "POST",
    body: JSON.stringify({ id: formData.get("username"), password: formData.get("password") }),
  });
  if (!response.ok) {
    const data = await response.json();
    return { error: data.message || "로그인하지 못했어요." };
  }
  const sessionCookie = response.headers.getSetCookie().find((cookie) => cookie.startsWith("JSESSIONID="));
  if (!sessionCookie) return { error: "로그인 세션을 생성하지 못했어요." };
  const sessionId = sessionCookie.split(";", 1)[0].slice("JSESSIONID=".length);
  (await cookies()).set("JSESSIONID", sessionId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });

  // Keep conversations started before logging in, using the newly authenticated session.
  const guestChats: Conversation[] = JSON.parse(String(formData.get("guestChats") || "[]"));
  for (const conversation of guestChats) {
    const saved = await backendFetch(`chats/${conversation.id}`, {
      method: "PUT",
      body: JSON.stringify({ title: conversation.messages[0].text.slice(0, 200), state: JSON.stringify(conversation) }),
    });
    if (!saved.ok) throw new Error("대화를 저장하지 못했습니다.");
  }
  revalidatePath("/", "layout");
  return { error: "" };
}

export async function logoutAction() {
  const response = await backendFetch("auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("로그아웃하지 못했습니다.");
  (await cookies()).delete("JSESSIONID");
  revalidatePath("/", "layout");
  redirect("/");
}
