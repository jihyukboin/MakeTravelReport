export default function LoadingReport() {
  return <main id="main-content" className="flex h-dvh flex-col items-center justify-center gap-4 bg-white text-[#738078]" role="status">
    <span className="size-8 animate-spin rounded-full border-2 border-[#e2e8e3] border-t-[#50705b]" aria-hidden="true" />
    <p className="text-sm">여행 계획서와 경로를 준비하고 있어요…</p>
  </main>;
}
