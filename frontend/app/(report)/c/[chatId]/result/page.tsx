import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, BatteryCharging, Sun, Sunrise } from "lucide-react";
import { getTripReport } from "../../../../lib/trip-report";
import { formatDuration } from "../../../../lib/tmap";
import { ReportRoute } from "../../../../components/report-route";
import "./report.css";

export const metadata: Metadata = { title: "나의 여행 계획서 · MakeTravelReport", robots: { index: false, follow: false } };

export default async function ResultPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const report = await getTripReport(chatId);
  const { result, destination } = report;
  const { attraction, charger, sun } = destination;
  const stops = [
    { label: "출발", title: "여행의 시작", address: report.departure, detail: `출발 배터리 ${result.batteryPercent}%` },
    { label: "여행", title: attraction.title, address: attraction.address, detail: report.toDestination ? `TMAP ${(report.toDestination.distanceMeters / 1000).toFixed(1)} km · ${formatDuration(report.toDestination.durationSeconds)}` : `예상 이동 ${destination.estimatedRoadKm} km · 직선 ${destination.distanceKm} km` },
    { label: "충전", title: charger.name, address: charger.address, detail: report.toCharger ? `TMAP ${(report.toCharger.distanceMeters / 1000).toFixed(1)} km · ${formatDuration(report.toCharger.durationSeconds)} · ${result.vehicle.connector}` : `여행지에서 직선 ${destination.chargerDistanceKm} km · ${result.vehicle.connector}` },
  ];
  return <main id="main-content" className="trip-report h-dvh overflow-y-auto bg-white text-[#202523]">
    <nav aria-label="계획서 메뉴" className="report-toolbar sticky top-0 z-10 h-[50px] shrink-0 border-b border-[#e9ece8] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-10">
        <a href={`/c/${chatId}`} className="inline-flex items-center gap-2 text-sm text-[#727b75] hover:text-[#202523]"><ArrowLeft size={16} aria-hidden="true" />대화로 돌아가기</a>
        <a href={`/c/${chatId}/result/pdf`} download className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-medium text-white hover:bg-[#0077ed] active:bg-[#006edb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"><ArrowDownToLine size={15} aria-hidden="true" />PDF 다운로드</a>
      </div>
    </nav>
    <article className="mx-auto max-w-[1040px] px-6 pt-12 pb-16 sm:px-10 sm:pt-16">
      <header>
        <p className="text-sm font-medium text-[#7a877f]">{result.date.replaceAll("-", ".")}</p>
        <h1 className="mt-4 text-[clamp(38px,6.5vw,68px)] leading-[1.1] font-semibold tracking-[-0.055em] break-keep">{attraction.title},<br /><span className="font-normal text-[#6f8277]">당신의 취향으로 떠나는 하루.</span></h1>
        <p className="mt-6 max-w-xl text-[15px] leading-7 break-keep text-[#738078]">{report.preferences.slice(0, 2).join(". ")}.<br />마음이 향한 풍경과 함께할 자동차, 충전의 여유까지 담았습니다.</p>
        <div className="mt-9 flex flex-wrap gap-2">{report.preferences.map((preference) => <span key={preference} className="rounded-full border border-[#dce4dd] px-3.5 py-2 text-sm text-[#5e7465]">{preference}</span>)}</div>
      </header>

      <figure className="mt-10">
        {report.destinationImage ? <Image src={report.destinationImage} alt={attraction.title} width={1600} height={900} unoptimized priority className="aspect-[16/9] w-full rounded-[3px] object-cover sm:aspect-[2/1]" />
          : <div className="flex aspect-[2/1] items-center justify-center bg-[#eef2ec] text-3xl font-light text-[#718471]">{attraction.title}</div>}
        <figcaption className="mt-2 flex flex-wrap justify-between gap-2 text-sm leading-5 text-[#909b93]"><span>{attraction.address}</span><span>사진 · 한국관광공사{report.photoCopyright ? ` / 공공누리 ${report.photoCopyright}` : ""}</span></figcaption>
      </figure>

      <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-7 border-y border-[#dce3dd] py-7 sm:grid-cols-4">
        {[['여행 날짜', report.dateLabel], ['여행 방식', '전기차 자유 여행'], [report.drivingKm !== null ? 'TMAP 이동 거리' : '추정 이동 거리', `${report.drivingKm ?? report.estimatedTotalKm} km`], ['배터리 계획', `${result.batteryPercent}% 출발 · ${result.reservePercent}% 여유`]].map(([label, value]) => <div key={label}><dt className="text-sm text-[#87928a]">{label}</dt><dd className="mt-2 text-sm font-medium leading-6 text-[#34483c]">{value}</dd></div>)}
      </dl>

      <section className="report-section">
        <div className="report-section-heading"><h2>오늘의 여행 파트너</h2></div>
        <div className="mt-7 grid items-center gap-8 sm:grid-cols-[1.1fr_1fr]">
          <Image src={report.vehicleImage} alt={result.vehicle.name} width={1200} height={750} className="aspect-[8/5] w-full rounded-[3px] object-cover" />
          <div><h3 className="mt-3 text-2xl leading-snug font-medium tracking-tight">{result.vehicle.name.split(" · ")[0]}</h3>
            <dl className="mt-6 divide-y divide-[#e8ede8]">{[['모델', result.vehicle.name], ['인증 주행거리', `${result.vehicle.rangeKm} km`], ['충전 규격', result.vehicle.connector], ['출발 / 확보 잔량', `${result.batteryPercent}% / ${result.reservePercent}%`]].map(([label, value]) => <div key={label} className="flex justify-between gap-5 py-3 text-sm"><dt className="shrink-0 text-[#8a968e]">{label}</dt><dd className="text-right text-[#415347]">{value}</dd></div>)}</dl>
          </div>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-heading"><h2>하루를 잇는 세 번의 도착</h2></div>
        <p className="mt-3 text-sm leading-7 text-[#7d8a80]">출발지에서 여행지로, 여행을 마친 뒤 가까운 충전소로 이어지는 동선입니다.</p>
        <ol className="mt-8">
          {stops.map((stop, index) => <li key={stop.label} className="relative flex gap-5 pb-9 last:pb-0 sm:gap-7">
            {index < stops.length - 1 && <div aria-hidden="true" className="absolute top-10 bottom-0 left-[19px] w-px bg-[#dce4dd]" />}
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-[#cdd9ce] bg-white text-sm font-medium text-[#50705b]">0{index + 1}</span>
            <div className="flex-1 border-b border-[#edf0ec] pb-8"><p className="text-sm font-medium tracking-widest text-[#8b9b8e]">{stop.label}</p><h3 className="mt-2 text-xl font-medium tracking-tight">{stop.title}</h3><p className="mt-2 text-sm leading-6 text-[#7d8a80]">{stop.address}</p><p className="mt-3 text-sm leading-6 text-[#52725c]">{stop.detail}</p></div>
          </li>)}
        </ol>
        <p className="mt-5 text-sm leading-6 text-[#919c94]">TMAP 교통최적 추천 경로 · {report.originApproximate ? `${result.origin.label} 좌표에서 출발하는 경로입니다.` : "입력한 출발지 주소의 진입 좌표를 기준으로 탐색했습니다."} 소요 시간과 통행료는 조회 시점 기준으로 실제 출발 시 달라질 수 있습니다.</p>
        <ReportRoute title="출발지 → 여행지" leg={report.toDestination} />
        <ReportRoute title="여행지 → 충전소" leg={report.toCharger} />
        {report.drivingKm !== null && report.drivingKm > result.estimatedReachKm && <p className="mt-5 text-sm leading-7 text-[#a3733c]">실제 도로 이동 거리가 현재 배터리 이동 예산을 초과합니다. 출발 전 추가 충전이나 중간 충전 계획이 필요합니다.</p>}
      </section>

      <section className="report-section grid gap-10 sm:grid-cols-2">
        <div><div className="report-section-heading"><h2>다음 여정을 위한 여유</h2></div>
          <BatteryCharging size={26} strokeWidth={1.3} className="mt-7 text-[#5d7d64]" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-medium leading-snug">{charger.name}</h3><p className="mt-3 text-sm leading-7 text-[#7d8a80]">{charger.address}<br />{charger.hours || "운영 시간 정보 없음"}</p>
          <p className="mt-4 text-sm leading-7 text-[#45674d]">{result.vehicle.connector} · {charger.outputKw > 0 ? `최대 ${charger.outputKw} kW` : "출력 미제공"}<br />저장 시점 충전 가능 {charger.available}대 / 충전 중 {charger.charging}대</p>
          <a href={`https://map.kakao.com/link/map/${encodeURIComponent(charger.name)},${charger.point.latitude},${charger.point.longitude}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 border-b border-[#7f9583] pb-1 text-sm text-[#50705b]">충전소 위치 확인<ArrowUpRight size={13} aria-hidden="true" /></a>
        </div>
        <div><div className="report-section-heading"><h2>기억하고 싶은 하늘</h2></div>
          {sun ? <>{sun.moment === "sunrise" ? <Sunrise size={26} strokeWidth={1.3} className="mt-7 text-[#a48a58]" aria-hidden="true" /> : <Sun size={26} strokeWidth={1.3} className="mt-7 text-[#a48a58]" aria-hidden="true" />}<p className="mt-4 text-5xl font-light tracking-tight text-[#796c4e]">{sun.time.slice(0, 5)}</p><p className="mt-3 text-sm leading-7 text-[#7d8a80]">{sun.moment === "sunrise" ? "하루가 시작되는 일출" : "하루를 마무리하는 일몰"}<br />{sun.location} 관측 기준 · 여행지에서 {sun.distanceKm} km</p><p className="mt-4 text-sm leading-6 text-[#919c94]">전망과 현장 접근 가능 여부는 방문 전 확인해 주세요.</p></> : <p className="mt-7 text-sm leading-7 text-[#7d8a80]">선택한 날짜의 인근 일출·일몰 시각이 제공되지 않습니다. 느긋한 여유를 두고 여행을 즐겨보세요.</p>}
        </div>
      </section>

      <footer className="mt-14 border-t border-[#dce3dd] pt-7">
        <p className="max-w-3xl text-sm leading-6 text-[#919c94]">관광지·충전소·출몰 시각은 공공데이터 수집 기록을 바탕으로 구성했습니다. 충전 상태 기록: {charger.statusUpdatedAt || "시각 미제공"}. 배터리 사용량은 인증 주행거리 기준의 계획값으로 날씨와 주행 조건에 따라 달라집니다. 이 계획은 여행지와 인근 충전소까지의 편도 동선이며 중간 충전·귀환 경로는 포함하지 않습니다.</p>
      </footer>
    </article>
  </main>;
}
