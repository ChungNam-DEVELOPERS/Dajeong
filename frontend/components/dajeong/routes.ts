export const ROUTES = {
  onboarding: "/onboarding",
  home: "/",
  createTrip: "/trips/new",
  invite: "/trips/new/invite",
  preferences: "/trips/new/preferences",
  recommendations: "/trips/jeju-friendship/recommendations",
  vote: "/trips/jeju-friendship/vote",
  confirmed: "/trips/jeju-friendship/confirmed",
  detail: "/trips/jeju-friendship/itinerary",
} as const;

export type ScreenId =
  | "onboarding"
  | "home"
  | "create"
  | "invite"
  | "preferences"
  | "recommend"
  | "vote"
  | "confirmed"
  | "detail";
