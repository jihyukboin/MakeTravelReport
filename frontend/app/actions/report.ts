"use server";

import { cookies } from "next/headers";
import { backendFetch } from "../lib/chat-session";
import type { Conversation } from "../lib/chat-types";

export async function prepareReportAction(conversation: Conversation) {
  const response = await backendFetch(`reports/${conversation.id}`, {
    method: "POST", body: JSON.stringify({ state: JSON.stringify(conversation) }),
  });
  if (!response.ok) throw new Error("계획서를 준비하지 못했어요.");
  const session = response.headers.getSetCookie().find((cookie) => cookie.startsWith("JSESSIONID="));
  if (session) {
    (await cookies()).set("JSESSIONID", session.split(";", 1)[0].slice("JSESSIONID=".length), {
      httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
    });
  }
}
