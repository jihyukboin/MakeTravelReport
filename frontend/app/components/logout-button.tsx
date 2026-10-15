"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { logoutAction } from "../actions/auth";
import { useChat } from "./chat-provider";

export function LogoutButton() {
  const { flush } = useChat();
  const [pending, startTransition] = useTransition();
  return <button type="button" aria-label="로그아웃" disabled={pending}
    onClick={() => startTransition(async () => { await flush(); await logoutAction(); })}
    className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#e5e7eb] disabled:cursor-wait">
    <LogOut size={17} aria-hidden="true" />
  </button>;
}
