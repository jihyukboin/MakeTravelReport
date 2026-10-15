import "server-only";

import { notFound } from "next/navigation";
import { backendFetch } from "./chat-session";
import type { Conversation } from "./chat-types";
import { geocodeDeparture, getDrivingLeg } from "./tmap";

export async function getTripReport(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const response = await backendFetch(`reports/${id}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("계획서를 불러오지 못했습니다.");
  const snapshot: { state: string } = await response.json();
  const conversation: Conversation = JSON.parse(snapshot.state);
  const result = conversation.messages.findLast((message) => message.recommendations)?.recommendations;
  const destination = result?.destinations[0];
  if (!result || !destination || !conversation.departure) notFound();
  const photoResponse = await backendFetch(`attractions/${encodeURIComponent(destination.attraction.id)}/photo`);
  if (!photoResponse.ok) throw new Error("여행지 사진을 불러오지 못했습니다.");
  const photo: { imageUrl: string | null; copyrightType: string | null } = await photoResponse.json();
  const preferences = conversation.messages.flatMap((message) => {
    if (!message.question || message.question.id === "vehicle") return [];
    const option = message.question.options.find(({ id }) => id === message.selectedId);
    return option ? [option.title] : [];
  });
  const origin = await geocodeDeparture(conversation.departure.address).catch(() => null);
  const legs = await Promise.allSettled([
    getDrivingLeg(origin || result.origin.point, destination.attraction.point),
    getDrivingLeg(destination.attraction.point, destination.charger.point),
  ]);
  const toDestination = legs[0].status === "fulfilled" ? legs[0].value : null;
  const toCharger = legs[1].status === "fulfilled" ? legs[1].value : null;
  const drivingKm = toDestination && toCharger ? Math.round((toDestination.distanceMeters + toCharger.distanceMeters) / 100) / 10 : null;
  return {
    id, result, destination, preferences,
    departure: conversation.departure.address,
    dateLabel: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date(`${result.date}T00:00:00+09:00`)),
    vehicleImage: `/images/vehicles/${result.vehicle.id}.webp`,
    destinationImage: photo.imageUrl?.replace(/^http:/, "https:") || null,
    photoCopyright: photo.copyrightType,
    estimatedTotalKm: Math.round((destination.estimatedRoadKm + destination.chargerDistanceKm * 1.3) * 10) / 10,
    toDestination, toCharger, drivingKm,
    originApproximate: origin === null,
    routeFetchedAt: new Date().toISOString(),
  };
}

export type TripReport = Awaited<ReturnType<typeof getTripReport>>;
