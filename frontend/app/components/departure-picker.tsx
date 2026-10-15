"use client";

import { Search, X } from "lucide-react";
import Script from "next/script";
import { useRef, useState } from "react";

type PostcodeAddress = {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
  zonecode: string;
  buildingName: string;
  sido: string;
  sigungu: string;
};

type PostcodeApi = {
  Postcode: new (options: {
    oncomplete: (data: PostcodeAddress) => void;
    width: string;
    height: string;
  }) => { embed: (element: HTMLElement, options: { q: string }) => void };
};

export type Departure = { address: string; sido: string; sigungu: string };

export function DeparturePicker({ onConfirm }: { onConfirm: (departure: Departure) => void }) {
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<PostcodeAddress | null>(null);
  const [detail, setDetail] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const selectedAddress = selected
    ? (selected.userSelectedType === "R" ? selected.roadAddress : selected.jibunAddress) || selected.address
    : "";

  function searchAddress() {
    const api = (window as Window & { kakao?: PostcodeApi }).kakao;
    if (!api || !searchContainerRef.current) {
      setError("주소 검색을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }
    setError("");
    setIsSearching(true);
    try {
      new api.Postcode({
        width: "100%",
        height: "100%",
        oncomplete(data) {
          setSelected(data);
          setDetail("");
          setIsSearching(false);
          requestAnimationFrame(() => detailRef.current?.focus());
        },
      }).embed(searchContainerRef.current, { q: "" });
    } catch {
      setIsSearching(false);
      setError("주소 검색을 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="mt-3 w-full max-w-[520px] max-sm:-ml-[50px] max-sm:w-[calc(100%+50px)]">
      <Script
        src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onReady={() => setScriptReady(true)}
        onError={() => setError("주소 검색을 불러오지 못했습니다. 인터넷 연결을 확인한 후 새로고침해 주세요.")}
      />
      <button
        ref={searchButtonRef}
        type="button"
        aria-label="출발지 주소 검색"
        aria-expanded={isSearching}
        disabled={!scriptReady}
        onClick={searchAddress}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-[#d1d5db] px-3.5 text-left text-base text-[#9ca3af] hover:border-[#52a8ec] focus-visible:border-[#52a8ec] focus-visible:ring-2 focus-visible:ring-[#52a8ec]/15 focus-visible:outline-none disabled:cursor-wait"
      >
        {scriptReady ? "도로명, 건물명 또는 지번" : error ? "연결 실패" : "로딩 중"}
        <Search size={19} className="shrink-0 text-[#6b7280]" aria-hidden="true" />
      </button>
      <p className="mt-2 text-xs leading-5 text-[#9ca3af]">예: 판교역로 166, 서울시청</p>

      {error && <p role="alert" className="mt-3 text-sm leading-6 text-red-600">{error}</p>}

      <div hidden={!isSearching} className="mt-5 overflow-hidden rounded-2xl border border-[#e5e7eb]">
        <div className="flex items-center justify-between bg-[#f9fafb] py-2 pr-2 pl-4">
          <h2 className="text-sm font-semibold text-[#333d4b]">주소 검색 결과</h2>
          <button
            type="button"
            aria-label="주소 검색 닫기"
            onClick={() => { setIsSearching(false); searchButtonRef.current?.focus(); }}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#e5e7eb]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div ref={searchContainerRef} className="h-[min(450px,65dvh)] min-h-[300px] w-full" />
      </div>

      {selected && <form onSubmit={(event) => {
        event.preventDefault();
        if (selectedAddress) onConfirm({ address: [selectedAddress, detail.trim()].filter(Boolean).join(" "), sido: selected.sido, sigungu: selected.sigungu });
      }} className="mt-4 rounded-[16px] bg-[#f2f4f6] p-6 sm:p-8">
          <p className="text-xl leading-[1.35] font-bold tracking-[-0.04em] break-keep text-[#1d1d1f]">{selectedAddress}</p>
          {selected.buildingName && <p className="mt-2 text-[15px] leading-6 text-[#4e5968]">{selected.buildingName}</p>}
          <label htmlFor="departure-detail" className="mt-6 mb-2 block text-sm text-[#4e5968]">상세주소 (선택)</label>
          <input
            ref={detailRef}
            id="departure-detail"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="동·호수, 출발할 장소 등"
            className="min-h-12 w-full rounded-xl border border-[#d2d2d7] bg-white px-3.5 text-base text-[#1d1d1f] outline-none placeholder:text-[#86868b] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#0071e3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] active:bg-[#006edb] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3] disabled:cursor-default disabled:bg-[#d2d2d7] disabled:text-[#86868b]"
          >
            출발지로 설정
          </button>
      </form>}
    </div>
  );
}
