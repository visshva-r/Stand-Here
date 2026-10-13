export const DEMO_USERS = [
  { uid: "alex", name: "Alex", color: "#3b82f6" },
  { uid: "riley", name: "Riley", color: "#22c55e" },
];

export const ROOMS = [
  {
    id: "stage",
    guid: "standhere-stage",
    name: "Stage",
    blurb: "Open mic — everyone hears you",
    x: 50,
    y: 18,
    w: 42,
    h: 22,
    accent: "#f59e0b",
  },
  {
    id: "help",
    guid: "standhere-help",
    name: "Help Desk",
    blurb: "Ask anything",
    x: 8,
    y: 42,
    w: 28,
    h: 28,
    accent: "#6366f1",
  },
  {
    id: "judges",
    guid: "standhere-judges",
    name: "Judges",
    blurb: "Pitch corner",
    x: 64,
    y: 42,
    w: 28,
    h: 28,
    accent: "#ec4899",
  },
  {
    id: "quiet",
    guid: "standhere-quiet",
    name: "Quiet Room",
    blurb: "Low noise zone",
    x: 36,
    y: 72,
    w: 28,
    h: 22,
    accent: "#14b8a6",
  },
];

export function roomByGuid(guid) {
  return ROOMS.find((r) => r.guid === guid);
}
