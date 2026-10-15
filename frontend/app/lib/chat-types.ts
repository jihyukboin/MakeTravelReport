import type { Departure } from "../components/departure-picker";
import type { RecommendationResult } from "../components/travel-recommendations";
import type { TravelQuestion, TripSettings } from "../components/travel-questions";

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  type?: "departure";
  question?: TravelQuestion;
  selectedId?: string;
  recommendationStatus?: "loading" | "error" | "done";
  recommendations?: RecommendationResult;
};

export type Conversation = { id: string; departure?: Departure; settings: TripSettings; messages: ChatMessage[] };
