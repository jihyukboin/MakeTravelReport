"use client";

import { LogIn, X } from "lucide-react";
import { useActionState, useRef } from "react";
import { loginAction } from "../actions/auth";
import { useChat } from "./chat-provider";

export function LoginModal({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { conversations } = useChat();
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return <>
    <button type="button" onClick={() => dialogRef.current?.showModal()} className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-[#4e5968] hover:bg-[#e5e7eb]">
      <LogIn size={17} aria-hidden="true" />로그인
    </button>
    <dialog ref={dialogRef} aria-labelledby="login-title"
      onCancel={(event) => { if (pending) event.preventDefault(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !pending) dialogRef.current?.close(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_40px)] max-w-sm rounded-[24px] bg-white p-8 text-[#1d1d1f] shadow-xl backdrop:bg-black/25">
      <button type="button" aria-label="로그인 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-[#86868b] hover:bg-[#f2f4f6] disabled:cursor-wait"><X size={18} aria-hidden="true" /></button>
      <h2 id="login-title" className="text-2xl font-semibold tracking-tight">로그인</h2>
      <p className="mt-2 text-sm text-[#86868b]">나의 여행 대화를 이어가세요.</p>
      <form action={action} className="mt-7 space-y-4">
        <input type="hidden" name="guestChats" value={JSON.stringify(conversations)} />
        <fieldset disabled={pending} className="space-y-4">{children}</fieldset>
        {state.error && <p role="alert" className="text-sm leading-6 text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="mt-2 h-12 w-full cursor-pointer rounded-full bg-[#0071e3] text-sm font-medium text-white hover:bg-[#0077ed] disabled:cursor-wait disabled:opacity-60">{pending ? "로그인 중…" : "로그인"}</button>
      </form>
    </dialog>
  </>;
}
