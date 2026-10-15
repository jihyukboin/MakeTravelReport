import "server-only";

export type Point = { latitude: number; longitude: number };
export type DrivingLeg = {
  distanceMeters: number;
  durationSeconds: number;
  tollWon: number;
  steps: { instruction: string; road: string; turnType: number }[];
  coordinates: [number, number][];
  mapImage: string | null;
};
type Feature = {
  geometry: { type: string; coordinates: number[] | [number, number][] };
  properties: { totalDistance?: number; totalTime?: number; totalFare?: number; description?: string; nextRoadName?: string; turnType?: number };
};

async function tmapFetch(path: string, init: RequestInit = {}) {
  if (!process.env.TMAP_APP_KEY) throw new Error("TMAP 키가 설정되지 않았습니다.");
  const response = await fetch(`https://apis.openapi.sk.com/tmap/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", appKey: process.env.TMAP_APP_KEY || "", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`TMAP 경로 조회 실패 (${response.status})`);
  return response.json();
}

export async function geocodeDeparture(address: string): Promise<Point | null> {
  const params = new URLSearchParams({ version: "1", fullAddr: address, addressFlag: "F00", coordType: "WGS84GEO", format: "json", count: "1" });
  const data = await tmapFetch(`geo/fullAddrGeo?${params}`);
  const coordinate = data.coordinateInfo?.coordinate?.[0];
  const latitude = Number(coordinate?.newLatEntr || coordinate?.latEntr || coordinate?.newLat || coordinate?.lat);
  const longitude = Number(coordinate?.newLonEntr || coordinate?.lonEntr || coordinate?.newLon || coordinate?.lon);
  return latitude >= 33 && latitude <= 39 && longitude >= 124 && longitude <= 132 ? { latitude, longitude } : null;
}

export async function getDrivingLeg(start: Point, end: Point): Promise<DrivingLeg> {
  if (!process.env.TMAP_APP_KEY) throw new Error("TMAP 키가 설정되지 않았습니다.");
  const routeRequest = tmapFetch("routes?version=1", {
    method: "POST",
    body: JSON.stringify({ startX: start.longitude, startY: start.latitude, endX: end.longitude, endY: end.latitude,
      reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO", searchOption: "0", trafficInfo: "Y", totalValue: 1, carType: 1 }),
  });
  const mapParams = new URLSearchParams({ version: "1", appKey: process.env.TMAP_APP_KEY || "",
    startX: String(start.longitude), startY: String(start.latitude), endX: String(end.longitude), endY: String(end.latitude),
    reqCoordType: "WGS84GEO", searchOption: "0", lineColor: "blue", width: "512", height: "360", format: "PNG" });
  const mapRequest = fetch(`https://apis.openapi.sk.com/tmap/routeStaticMap?${mapParams}`, { cache: "no-store", signal: AbortSignal.timeout(20000) })
    .then(async (response) => {
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return null;
      return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    }).catch(() => null);
  const [data, mapImage]: [{ features: Feature[] }, string | null] = await Promise.all([routeRequest, mapRequest]);
  const summary = data.features[0]?.properties;
  if (summary?.totalDistance == null || summary.totalTime == null) throw new Error("TMAP 경로 응답이 없습니다.");
  return {
    distanceMeters: summary.totalDistance,
    durationSeconds: summary.totalTime,
    tollWon: summary.totalFare || 0,
    steps: data.features.filter((feature) => feature.geometry.type === "Point" && feature.properties.description)
      .map(({ properties }) => ({ instruction: properties.description!, road: properties.nextRoadName || "", turnType: properties.turnType || 0 })),
    coordinates: data.features.filter((feature) => feature.geometry.type === "LineString")
      .flatMap((feature) => feature.geometry.coordinates as [number, number][]),
    mapImage,
  };
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}
