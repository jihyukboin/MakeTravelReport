import { Document, Page, View, Text, Image as PdfImage, Font, StyleSheet } from "@react-pdf/renderer";
import path from "node:path";
import type { TripReport } from "../lib/trip-report";
import type { DrivingLeg } from "../lib/tmap";
import { formatDuration } from "../lib/tmap";

Font.register({ family: "Pretendard", fonts: [
  { src: path.join(process.cwd(), "app/fonts/PretendardGOV-Regular.ttf"), fontWeight: 400 },
  { src: path.join(process.cwd(), "app/fonts/PretendardGOV-Bold.ttf"), fontWeight: 700 },
] });
Font.registerHyphenationCallback((word) => /[가-힣]/.test(word) ? Array.from(word) : [word]);

const s = StyleSheet.create({
  page: { padding: 44, paddingBottom: 56, fontFamily: "Pretendard", color: "#263d2d", fontSize: 10.5, lineHeight: 1.65, backgroundColor: "#ffffff" },
  eyebrow: { fontSize: 10.5, color: "#819186", letterSpacing: 1.2, marginTop: 26, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 700, lineHeight: 1.3, letterSpacing: -1.4 },
  subtitle: { fontSize: 24, lineHeight: 1.4, color: "#7b8d7d", marginTop: 5 },
  body: { fontSize: 10.5, color: "#7b887e", lineHeight: 1.8 },
  hero: { width: "100%", height: 248, objectFit: "cover", marginTop: 26 },
  caption: { fontSize: 10.5, color: "#9aa59c", marginTop: 7 },
  row: { flexDirection: "row", gap: 20 },
  metric: { flex: 1 },
  label: { fontSize: 10.5, color: "#8a998d", marginBottom: 5 },
  value: { fontSize: 11, color: "#3c5542", fontWeight: 700 },
  sectionTitle: { fontSize: 22, fontWeight: 700, letterSpacing: -.7, marginBottom: 20 },
  car: { width: 240, height: 150, objectFit: "cover" },
  divider: { borderTop: "1 solid #e3e9e2", paddingTop: 18, marginTop: 18 },
  stop: { flexDirection: "row", gap: 16, paddingVertical: 16, borderBottom: "1 solid #e8ede6" },
  number: { color: "#8da28e", fontSize: 12, width: 24 },
  stopTitle: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  step: { flexDirection: "row", gap: 14, paddingVertical: 5, borderBottom: "1 solid #edf0ea" },
});

type PdfImages = { destination: Buffer | null; vehicle: Buffer };
function RouteDetails({ title, leg }: { title: string; leg: DrivingLeg | null }) {
  return <View>
    <Text style={s.sectionTitle}>{title}</Text>
    {leg ? <><Text style={[s.body, { marginBottom: 14 }]}>{(leg.distanceMeters / 1000).toFixed(1)} km · {formatDuration(leg.durationSeconds)} · 통행료 {leg.tollWon.toLocaleString("ko-KR")}원</Text>
      {leg.mapImage && <PdfImage src={leg.mapImage} style={{ width: 385, height: 270, objectFit: "contain", alignSelf: "center", marginBottom: 14 }} />}
      {leg.steps.map((step, index) => <View key={index} style={s.step} wrap={false}><Text style={[s.number, { fontSize: 10.5 }]}>{String(index + 1).padStart(2, "0")}</Text><Text style={[s.body, { flex: 1 }]}>{step.instruction}</Text></View>)}
    </> : <Text style={s.body}>현재 이 구간의 도로 경로를 불러오지 못했습니다.</Text>}
  </View>;
}

export function TripPdf({ report, images }: { report: TripReport; images: PdfImages }) {
  const { result, destination } = report;
  const { attraction, charger, sun } = destination;
  return <Document title={`${attraction.title} 여행 계획서`} author="MakeTravelReport" language="ko-KR">
    <Page size="A4" style={s.page}>
      <Text style={s.eyebrow}>{result.date.replaceAll("-", ".")}</Text>
      <Text style={s.title}>{attraction.title},</Text><Text style={s.subtitle}>당신의 취향으로 떠나는 하루.</Text>
      <Text style={[s.body, { marginTop: 16 }]}>{report.preferences.join(" / ")}</Text>
      {images.destination ? <PdfImage src={{ data: images.destination, format: "jpg" }} style={s.hero} /> : <View style={[s.hero, { backgroundColor: "#eef2ec", justifyContent: "center", alignItems: "center" }]}><Text style={s.title}>{attraction.title}</Text></View>}
      <Text style={s.caption}>{attraction.address} · 사진: 한국관광공사 {report.photoCopyright || ""}</Text>
      <View style={[s.row, s.divider]}>
        <View style={s.metric}><Text style={s.label}>여행 날짜</Text><Text style={s.value}>{report.dateLabel}</Text></View>
        <View style={s.metric}><Text style={s.label}>{report.drivingKm !== null ? "TMAP 이동 거리" : "추정 이동 거리"}</Text><Text style={s.value}>{report.drivingKm ?? report.estimatedTotalKm} km</Text></View>
        <View style={s.metric}><Text style={s.label}>배터리 계획</Text><Text style={s.value}>{result.batteryPercent}% 출발 / {result.reservePercent}% 여유</Text></View>
      </View>
      <Text style={[s.body, { marginTop: 24 }]}>선택한 취향을 바탕으로 여행지와 주변 충전소를 함께 살펴본 당신만의 계획서입니다. 마음이 향한 풍경을 만나고, 다음 여정을 위한 여유도 챙겨보세요.</Text>
    </Page>
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>오늘의 여행 파트너</Text>
      <View style={s.row}><PdfImage src={{ data: images.vehicle, format: "jpg" }} style={s.car} /><View style={{ flex: 1 }}><Text style={s.stopTitle}>{result.vehicle.name}</Text><Text style={s.body}>인증 주행거리 {result.vehicle.rangeKm} km{`\n`}{result.vehicle.connector}{`\n`}출발 배터리 {result.batteryPercent}%{`\n`}잔량 {result.reservePercent}% 확보 기준</Text></View></View>
      <Text style={s.sectionTitle}>하루를 잇는 세 번의 도착</Text>
      {[
        ["출발", report.departure, `배터리 ${result.batteryPercent}%로 시작`],
        [attraction.title, attraction.address, report.toDestination ? `${(report.toDestination.distanceMeters / 1000).toFixed(1)} km / ${formatDuration(report.toDestination.durationSeconds)}` : `추정 ${destination.estimatedRoadKm} km`],
        [charger.name, charger.address, report.toCharger ? `${(report.toCharger.distanceMeters / 1000).toFixed(1)} km / ${formatDuration(report.toCharger.durationSeconds)}` : `직선 ${destination.chargerDistanceKm} km`],
      ].map(([title, address, detail], index) => <View key={index} style={s.stop} wrap={false}><Text style={s.number}>0{index + 1}</Text><View style={{ flex: 1 }}><Text style={s.stopTitle}>{title}</Text><Text style={s.body}>{address}</Text><Text style={[s.caption, { color: "#52725c" }]}>{detail}</Text></View></View>)}
      <Text style={[s.body, { marginTop: 18 }]}>{report.originApproximate ? `${result.origin.label} 좌표에서 출발하는 경로입니다.` : "입력한 출발지의 진입 좌표를 기준으로 경로를 탐색했습니다."} 소요 시간과 통행료는 조회 시점 기준이며 출발 시 달라질 수 있습니다.</Text>
    </Page>
    <Page size="A4" style={s.page}>

      <RouteDetails title="출발지 → 여행지" leg={report.toDestination} />
    </Page>
    <Page size="A4" style={s.page}>
      <RouteDetails title="여행지 → 충전소" leg={report.toCharger} />
    </Page>
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>다음 여정을 위한 여유</Text>
      <Text style={s.stopTitle}>{charger.name}</Text><Text style={s.body}>{charger.address}{`\n`}{charger.hours || "운영 시간 정보 없음"}{`\n`}{result.vehicle.connector} · {charger.outputKw > 0 ? `최대 ${charger.outputKw} kW` : "출력 미제공"}{`\n`}저장 시점 충전 가능 {charger.available}대 / 충전 중 {charger.charging}대</Text>
      <Text style={s.caption}>충전 상태 기록: {charger.statusUpdatedAt || "시각 미제공"}</Text>
      <View style={[s.divider, { marginTop: 34 }]}><Text style={s.sectionTitle}>기억하고 싶은 하늘</Text>
        {sun ? <><Text style={{ fontSize: 46, color: "#9c875d", marginBottom: 8 }}>{sun.time.slice(0, 5)}</Text><Text style={s.body}>{sun.moment === "sunrise" ? "하루가 시작되는 일출" : "하루를 마무리하는 일몰"}{`\n`}{sun.location} 관측 기준 · 여행지에서 {sun.distanceKm} km</Text></> : <Text style={s.body}>선택한 날짜의 인근 일출·일몰 시각이 제공되지 않습니다.</Text>}
      </View>
      {report.drivingKm !== null && report.drivingKm > result.estimatedReachKm && <Text style={[s.body, { marginTop: 25, color: "#a3733c" }]}>실제 도로 이동 거리가 현재 배터리 이동 예산을 초과합니다. 출발 전 추가 충전이나 중간 충전 계획이 필요합니다.</Text>}
      <View style={[s.divider, { marginTop: 35 }]}><Text style={[s.body, { fontSize: 10.5 }]}>관광지·충전소·출몰 시각은 공공데이터 수집 기록입니다. 충전소 운영 시간과 상태, 일출·일몰의 조망 가능 여부는 방문 전 확인해 주세요. 배터리 계획은 인증 주행거리 기준으로 주행 조건에 따라 달라집니다. 여행지와 주변 충전소까지의 편도 계획으로 중간 충전과 귀환 경로는 포함하지 않습니다.</Text><Text style={[s.caption, { marginTop: 14 }]}>경로 정보: TMAP / 여행지 사진: 한국관광공사 / 차량 이미지: Genesis, Hyundai</Text></View>
    </Page>
  </Document>;
}
