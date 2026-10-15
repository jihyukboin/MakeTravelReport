import { MapPin, Zap } from "lucide-react";
import { ReportLink } from "./report-link";

type Point = { latitude: number; longitude: number };
type Charger = { id: string; name: string; address: string; hours: string | null; point: Point; available: number; charging: number; outputKw: number; statusUpdatedAt: string | null };
export type RecommendationResult = {
  origin: { label: string; point: Point; approximate: boolean };
  vehicle: { id: string; name: string; rangeKm: number; connector: string };
  date: string;
  batteryPercent: number;
  reservePercent: number;
  estimatedReachKm: number;
  matchedCount: number;
  destinations: {
    attraction: { id: string; title: string; address: string; category: string; point: Point };
    distanceKm: number;
    estimatedRoadKm: number;
    charger: Charger;
    chargerDistanceKm: number;
    sun: { location: string; date: string; moment: string; time: string; distanceKm: number } | null;
  }[];
};

function mapUrl(title: string, point: Point) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(title)},${point.latitude},${point.longitude}`;
}

export function TravelRecommendations({ result, conversationId }: { result: RecommendationResult; conversationId: string }) {
  return <div className="mt-4 space-y-4 max-sm:-ml-[50px] max-sm:w-[calc(100%+50px)]">
    <p className="text-sm leading-6 text-[#4e5968]">{result.vehicle.name}<br />출발 {result.batteryPercent}% · 잔량 {result.reservePercent}% 확보 · 계산상 이동 예산 {result.estimatedReachKm} km</p>
    {result.destinations.length === 0 ? <div className="rounded-2xl bg-[#f2f4f6] p-6 text-sm leading-7 text-[#4e5968]">현재 취향과 배터리 조건에서 5 km 이내에 호환 충전소가 있는 여행지를 찾지 못했어요. 새 채팅에서 배터리나 여행 취향을 바꿔 주세요.</div> : result.destinations.map((destination) => <article key={destination.attraction.id} className="rounded-2xl bg-[#f2f4f6] p-6 sm:p-8">
      <p className="mb-3 text-xs font-semibold text-[#0071e3]">추천 여행지 · 취향에 맞는 {result.matchedCount.toLocaleString()}곳 중</p>
      <h2 className="text-2xl leading-snug font-bold tracking-tight break-keep text-[#1d1d1f]">{destination.attraction.title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#4e5968]">{destination.attraction.address}</p>
      <p className="mt-4 text-sm leading-6 text-[#4e5968]">출발 지역에서 직선 {destination.distanceKm} km · 예상 이동 {destination.estimatedRoadKm} km</p>
      {destination.sun ? <p className="mt-2 text-sm leading-6 text-[#4e5968]">{destination.sun.date} {destination.sun.moment === "sunrise" ? "일출" : "일몰"} {destination.sun.time.slice(0, 5)}<br /><span className="text-xs text-[#8b95a1]">{destination.sun.location} 관측 기준 · 여행지에서 {destination.sun.distanceKm} km</span></p> : <p className="mt-2 text-xs leading-5 text-[#8b95a1]">선택한 날짜의 인근 일출·일몰 데이터가 없어요.</p>}
      <div className="mt-5 border-t border-[#dce0e5] pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]"><Zap size={16} aria-hidden="true" />가까운 {result.vehicle.connector} 충전소</h3>
        <p className="mt-2 text-base font-semibold text-[#1d1d1f]">{destination.charger.name}</p>
        <p className="mt-1 text-sm leading-6 text-[#4e5968]">{destination.charger.address}<br />여행지에서 직선 {destination.chargerDistanceKm} km · {destination.charger.outputKw > 0 ? `최대 ${destination.charger.outputKw} kW` : "출력 정보 없음"}<br />저장 시점 충전 가능 {destination.charger.available}대 · 충전 중 {destination.charger.charging}대</p>
        <p className="mt-2 text-xs leading-5 text-[#8b95a1]">이용 시간 · {destination.charger.hours || "미제공"}<br />상태 기록 · {destination.charger.statusUpdatedAt || "시각 미제공"}</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={mapUrl(destination.attraction.title, destination.attraction.point)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#0071e3] px-5 text-sm font-medium text-white hover:bg-[#0077ed]"><MapPin size={15} aria-hidden="true" />여행지 지도</a>
        <a href={mapUrl(destination.charger.name, destination.charger.point)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-medium text-[#0071e3] hover:bg-[#e9ecef]">충전소 지도</a>
      </div>
      <ReportLink conversationId={conversationId} />
    </article>)}
    <p className="text-xs leading-5 text-[#8b95a1]">거리 기준: {result.origin.label}. 정확한 주소 좌표 대신 해당 지역 관광지의 평균 좌표를 사용해요. 이동 거리는 직선거리 × 1.3의 추정치이며 도로 경로·중간 충전·귀환 가능성을 보장하지 않아요. 충전소 상태는 수집된 기록으로 실시간 상태가 아니에요. 방문 전 운영 시간과 상태를 확인해 주세요. 일출·일몰 시각은 인근 관측지 기준이며 조망 가능 여부는 별도 확인이 필요해요.</p>
  </div>;
}
