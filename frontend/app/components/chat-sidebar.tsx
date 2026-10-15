import { SquarePen } from "lucide-react";
import Link from "next/link";
import { LoginModal } from "./login-modal";
import { LogoutButton } from "./logout-button";
import { RecentConversations } from "./recent-conversations";

export function ChatSidebar({ authenticated }: { authenticated: boolean }) {
  return <aside id="desktop-sidebar" aria-label="대화 목록"
    className="flex shrink-0 flex-col overflow-hidden border-b border-[#e5e7eb] bg-[#f9fafb] md:w-[260px] md:border-r md:border-b-0">
    <header className="flex h-16 shrink-0 items-center border-b border-[#e5e7eb] px-6">
      <Link href="/" className="text-lg font-bold tracking-tight">MakeTravelReport</Link>
    </header>
    <div className="p-3">
      <Link href="/" scroll={false} aria-label="새 채팅" className="flex h-11 w-full items-center gap-3 rounded-lg bg-[#eef2ff] px-3 text-sm font-semibold text-[#315bc0] hover:bg-[#e0e7ff]">
        <SquarePen size={19} className="shrink-0" aria-hidden="true" />새 채팅
      </Link>
    </div>
    <nav aria-label="이전 대화" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 max-md:max-h-28">
      <p className="px-3 pt-4 pb-2 text-xs font-semibold text-[#9ca3af]">최근 대화</p>
      <RecentConversations />
    </nav>
    <footer className="flex h-[50px] min-h-[50px] shrink-0 items-center border-t border-[#e5e7eb] px-4">
      {authenticated ? <div className="flex w-full items-center justify-between"><span className="text-sm font-medium text-[#4e5968]">test</span><LogoutButton /></div>
        : <LoginModal>
          <div><label htmlFor="login-id" className="mb-2 block text-sm text-[#4e5968]">ID</label>
            <input id="login-id" name="username" autoComplete="username" required className="h-12 w-full rounded-xl border border-[#d2d2d7] px-4 outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/15" /></div>
          <div><label htmlFor="login-password" className="mb-2 block text-sm text-[#4e5968]">PW</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required className="h-12 w-full rounded-xl border border-[#d2d2d7] px-4 outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/15" /></div>
        </LoginModal>}
    </footer>
  </aside>;
}
