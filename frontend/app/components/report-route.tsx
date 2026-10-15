import type { DrivingLeg } from "../lib/tmap";
import { formatDuration } from "../lib/tmap";
import Image from "next/image";

export function ReportRoute({ title, leg }: { title: string; leg: DrivingLeg | null }) {
  return <section className="mt-8 border-t border-[#e1e8e1] pt-7">
    <div className="flex flex-wrap items-baseline justify-between gap-3"><h3 className="text-base font-medium text-[#35513d]">{title}</h3>
      {leg && <p className="text-sm text-[#809084]">{(leg.distanceMeters / 1000).toFixed(1)} km · {formatDuration(leg.durationSeconds)} · 통행료 {leg.tollWon.toLocaleString("ko-KR")}원</p>}
    </div>
    {leg?.mapImage && <figure className="mt-5"><Image src={leg.mapImage} width={512} height={360} unoptimized alt={`${title} 출발·도착 지점과 자동차 이동 경로 지도`} className="w-full max-w-[640px] rounded-xl border border-[#e3e8e3]" /><figcaption className="mt-2 text-sm text-[#87928a]">TMAP · 출발 지점부터 도착 지점까지의 자동차 경로</figcaption></figure>}
    {leg ? <ol className="mt-4 divide-y divide-[#eff2ed]">{leg.steps.map((step, index) => <li key={index} className="flex gap-4 py-3 text-sm leading-6"><span className="w-5 shrink-0 text-sm text-[#a3afa4]">{String(index + 1).padStart(2, "0")}</span><p className="text-[#5a6c5e]">{step.instruction}</p></li>)}</ol>
      : <p className="mt-4 text-sm leading-7 text-[#7d8a80]">현재 이 구간의 도로 경로를 불러오지 못했습니다.</p>}
  </section>;
}
