import { randomBytes } from "node:crypto";

export type TimeOfDay = "낮" | "밤";

export interface Participant {
  id: string;
  name: string;
  startTime: string;
  startPlace: string;
  transport: string;
  returnPlace: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RouteSummary {
  participantId: string;
  participantName: string;
  duration: number;
  arrivalTime: string;
  transport: string;
  from: string;
}

export interface PlaceRecommendation {
  id: string;
  name: string;
  type: string;
  tags: string[];
  x: number;
  y: number;
  voteCount: number;
  fit: number;
}

export interface Recommendation {
  id: string;
  name: string;
  x: number;
  y: number;
  score: number;
  voteCount: number;
  summary: string;
  routes: RouteSummary[];
  places: PlaceRecommendation[];
}

export interface Room {
  id: string;
  month: number;
  timeOfDay: TimeOfDay;
  tags: string[];
  participants: Participant[];
  votes: Record<string, Record<string, boolean>>;
  updatedAt: string;
}

export interface RoomResponse extends Room {
  recommendations: Recommendation[];
}

interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  vibe: string[];
  base: number;
  places: Array<{
    id: string;
    name: string;
    type: string;
    tags: string[];
    dx: number;
    dy: number;
  }>;
}

type SseController = ReadableStreamDefaultController<Uint8Array>;

const TAGS = [
  "#요즘유행하는",
  "#한적한",
  "#대화하기좋은",
  "#맛집많은",
  "#사진찍기좋은",
  "#비오는날좋은"
];

const STATIONS: Station[] = [
  {
    id: "hongdae",
    name: "홍대입구역",
    x: 43,
    y: 43,
    vibe: ["#요즘유행하는", "#맛집많은", "#사진찍기좋은"],
    base: 0,
    places: [
      { id: "hongdae-cafe", name: "무신사 테라스 카페", type: "카페", tags: ["#요즘유행하는", "#사진찍기좋은"], dx: -7, dy: 7 },
      { id: "hongdae-food", name: "연남동 파스타 골목", type: "음식점", tags: ["#맛집많은", "#대화하기좋은"], dx: 8, dy: -4 },
      { id: "hongdae-play", name: "경의선숲길 산책", type: "놀거리", tags: ["#한적한", "#대화하기좋은"], dx: 2, dy: 11 }
    ]
  },
  {
    id: "hapjeong",
    name: "합정역",
    x: 39,
    y: 49,
    vibe: ["#대화하기좋은", "#맛집많은", "#요즘유행하는"],
    base: 2,
    places: [
      { id: "hapjeong-bistro", name: "합정 비스트로 거리", type: "음식점", tags: ["#맛집많은", "#대화하기좋은"], dx: 6, dy: 4 },
      { id: "hapjeong-lounge", name: "조용한 라운지 카페", type: "카페", tags: ["#한적한", "#대화하기좋은"], dx: -8, dy: -3 },
      { id: "hapjeong-view", name: "한강 방향 산책길", type: "놀거리", tags: ["#한적한", "#사진찍기좋은"], dx: 3, dy: 12 }
    ]
  },
  {
    id: "mangwon",
    name: "망원역",
    x: 35,
    y: 43,
    vibe: ["#한적한", "#맛집많은", "#비오는날좋은"],
    base: 5,
    places: [
      { id: "mangwon-market", name: "망원시장 먹거리", type: "음식점", tags: ["#맛집많은", "#요즘유행하는"], dx: -4, dy: 6 },
      { id: "mangwon-book", name: "작은 서점 카페", type: "카페", tags: ["#한적한", "#비오는날좋은"], dx: 7, dy: -7 },
      { id: "mangwon-park", name: "망원한강공원", type: "놀거리", tags: ["#한적한", "#사진찍기좋은"], dx: 10, dy: 10 }
    ]
  },
  {
    id: "sinchon",
    name: "신촌역",
    x: 50,
    y: 43,
    vibe: ["#맛집많은", "#요즘유행하는", "#대화하기좋은"],
    base: 4,
    places: [
      { id: "sinchon-food", name: "신촌 먹자골목", type: "음식점", tags: ["#맛집많은", "#요즘유행하는"], dx: -5, dy: -4 },
      { id: "sinchon-dessert", name: "디저트 카페 거리", type: "카페", tags: ["#대화하기좋은", "#사진찍기좋은"], dx: 8, dy: 5 },
      { id: "sinchon-arcade", name: "보드게임 라운지", type: "놀거리", tags: ["#비오는날좋은", "#대화하기좋은"], dx: 2, dy: 10 }
    ]
  },
  {
    id: "ewha",
    name: "이대역",
    x: 55,
    y: 40,
    vibe: ["#한적한", "#대화하기좋은", "#사진찍기좋은"],
    base: 6,
    places: [
      { id: "ewha-cafe", name: "이대 골목 카페", type: "카페", tags: ["#한적한", "#대화하기좋은"], dx: -5, dy: 5 },
      { id: "ewha-shop", name: "소품샵 거리", type: "놀거리", tags: ["#사진찍기좋은", "#요즘유행하는"], dx: 9, dy: -4 },
      { id: "ewha-dining", name: "가정식 식당 골목", type: "음식점", tags: ["#맛집많은", "#비오는날좋은"], dx: 3, dy: 9 }
    ]
  },
  {
    id: "seongsu",
    name: "성수역",
    x: 73,
    y: 56,
    vibe: ["#요즘유행하는", "#사진찍기좋은", "#맛집많은"],
    base: 7,
    places: [
      { id: "seongsu-cafe", name: "성수 창고형 카페", type: "카페", tags: ["#요즘유행하는", "#사진찍기좋은"], dx: -6, dy: 6 },
      { id: "seongsu-pop", name: "팝업스토어 거리", type: "놀거리", tags: ["#요즘유행하는", "#사진찍기좋은"], dx: 8, dy: -5 },
      { id: "seongsu-dining", name: "성수 퓨전 다이닝", type: "음식점", tags: ["#맛집많은", "#대화하기좋은"], dx: 4, dy: 12 }
    ]
  },
  {
    id: "gangnam",
    name: "강남역",
    x: 65,
    y: 76,
    vibe: ["#맛집많은", "#요즘유행하는", "#비오는날좋은"],
    base: 8,
    places: [
      { id: "gangnam-food", name: "강남역 맛집 거리", type: "음식점", tags: ["#맛집많은", "#요즘유행하는"], dx: 5, dy: -7 },
      { id: "gangnam-room", name: "프라이빗 룸카페", type: "카페", tags: ["#비오는날좋은", "#대화하기좋은"], dx: -8, dy: 5 },
      { id: "gangnam-play", name: "실내 액티비티존", type: "놀거리", tags: ["#비오는날좋은", "#요즘유행하는"], dx: 3, dy: 11 }
    ]
  },
  {
    id: "jamsil",
    name: "잠실역",
    x: 81,
    y: 69,
    vibe: ["#사진찍기좋은", "#맛집많은", "#비오는날좋은"],
    base: 9,
    places: [
      { id: "jamsil-mall", name: "월드몰 맛집층", type: "음식점", tags: ["#맛집많은", "#비오는날좋은"], dx: -6, dy: 3 },
      { id: "jamsil-lake", name: "석촌호수 산책", type: "놀거리", tags: ["#사진찍기좋은", "#한적한"], dx: 8, dy: 9 },
      { id: "jamsil-cafe", name: "호수뷰 카페", type: "카페", tags: ["#사진찍기좋은", "#대화하기좋은"], dx: 6, dy: -7 }
    ]
  }
];

const LANDMARKS: Record<string, { x: number; y: number }> = {
  홍대입구역: { x: 43, y: 43 },
  합정역: { x: 39, y: 49 },
  망원역: { x: 35, y: 43 },
  신촌역: { x: 50, y: 43 },
  이대역: { x: 55, y: 40 },
  성수역: { x: 73, y: 56 },
  강남역: { x: 65, y: 76 },
  잠실역: { x: 81, y: 69 },
  서울역: { x: 55, y: 52 },
  사당역: { x: 56, y: 82 },
  건대입구역: { x: 77, y: 61 },
  왕십리역: { x: 70, y: 52 },
  여의도역: { x: 41, y: 62 },
  종각역: { x: 58, y: 44 },
  혜화역: { x: 61, y: 35 },
  신림역: { x: 46, y: 82 },
  노원역: { x: 78, y: 21 },
  수유역: { x: 65, y: 24 },
  교대역: { x: 62, y: 78 },
  마포구청역: { x: 34, y: 39 }
};

const globalStore = globalThis as typeof globalThis & {
  __wooRooms?: Map<string, Room>;
  __wooSseClients?: Map<string, Set<SseController>>;
};

const rooms = globalStore.__wooRooms ?? new Map<string, Room>();
const sseClients = globalStore.__wooSseClients ?? new Map<string, Set<SseController>>();

globalStore.__wooRooms = rooms;
globalStore.__wooSseClients = sseClients;

export function createRoom(body: unknown = {}): RoomResponse {
  const room: Room = {
    id: randomBytes(4).toString("hex"),
    month: new Date().getMonth() + 1,
    timeOfDay: "낮",
    tags: ["#요즘유행하는", "#대화하기좋은"],
    participants: [
      createParticipant(1, {
        startTime: "18:30",
        startPlace: "강남역",
        transport: "대중교통",
        returnPlace: "강남역"
      }),
      createParticipant(2, {
        startTime: "18:40",
        startPlace: "신촌역",
        transport: "대중교통",
        returnPlace: "신촌역"
      })
    ],
    votes: {},
    updatedAt: new Date().toISOString()
  };

  Object.assign(room, sanitizeRoomPatch(body));
  rooms.set(room.id, room);
  return withRecommendations(room);
}

export function getOrCreateRoom(id: string): Room {
  if (rooms.has(id)) return rooms.get(id)!;

  const response = createRoom();
  const room = rooms.get(response.id)!;
  rooms.delete(room.id);
  room.id = id;
  markUpdated(room);
  rooms.set(id, room);
  return room;
}

export function getRoomResponse(id: string): RoomResponse {
  return withRecommendations(getOrCreateRoom(id));
}

export function patchRoom(id: string, body: unknown): RoomResponse {
  const room = getOrCreateRoom(id);
  Object.assign(room, sanitizeRoomPatch(body));
  markUpdated(room);
  broadcastRoom(id);
  return withRecommendations(room);
}

export function addParticipant(roomId: string, body: unknown): RoomResponse {
  const room = getOrCreateRoom(roomId);
  const participant = createParticipant(room.participants.length + 1, sanitizeParticipantPatch(body));
  room.participants.push(participant);
  markUpdated(room);
  broadcastRoom(room.id);
  return withRecommendations(room);
}

export function patchParticipant(roomId: string, participantId: string, body: unknown): RoomResponse | null {
  const room = getOrCreateRoom(roomId);
  const participant = room.participants.find((item) => item.id === participantId);
  if (!participant) return null;

  Object.assign(participant, sanitizeParticipantPatch(body));
  markUpdated(room);
  broadcastRoom(room.id);
  return withRecommendations(room);
}

export function deleteParticipant(roomId: string, participantId: string): RoomResponse {
  const room = getOrCreateRoom(roomId);
  room.participants = room.participants.filter((item) => item.id !== participantId);
  room.participants.forEach((participant, index) => {
    participant.name = `참가자 ${index + 1}`;
  });
  markUpdated(room);
  broadcastRoom(room.id);
  return withRecommendations(room);
}

export function toggleVote(roomId: string, body: unknown): { room?: RoomResponse; error?: string } {
  const room = getOrCreateRoom(roomId);
  const data = asObject(body);
  const targetType = data.targetType === "place" ? "place" : "station";
  const targetId = String(data.targetId || "").replace(/[^a-z0-9-]/gi, "");
  const voterId = String(data.voterId || "").replace(/[^a-z0-9-]/gi, "");

  if (!targetId || !voterId) return { error: "targetId and voterId are required" };

  const key = `${targetType}:${targetId}`;
  if (!room.votes[key]) room.votes[key] = {};
  room.votes[key][voterId] = !room.votes[key][voterId];
  markUpdated(room);
  broadcastRoom(room.id);
  return { room: withRecommendations(room) };
}

export function withRecommendations(room: Room): RoomResponse {
  return {
    ...room,
    tags: room.tags.filter((tag) => TAGS.includes(tag)),
    recommendations: buildRecommendations(room)
  };
}

export function addSseClient(roomId: string, controller: SseController): void {
  if (!sseClients.has(roomId)) sseClients.set(roomId, new Set<SseController>());
  sseClients.get(roomId)!.add(controller);
}

export function removeSseClient(roomId: string, controller: SseController): void {
  const clients = sseClients.get(roomId);
  if (!clients) return;
  clients.delete(controller);
  if (!clients.size) sseClients.delete(roomId);
}

export function serializeSseRoom(roomId: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: room\ndata: ${JSON.stringify(getRoomResponse(roomId))}\n\n`);
}

function createParticipant(index: number, overrides: Partial<Participant> = {}): Participant {
  const now = new Date().toISOString();
  return {
    id: randomBytes(4).toString("hex"),
    name: `참가자 ${index}`,
    startTime: overrides.startTime || "18:30",
    startPlace: overrides.startPlace || "",
    transport: overrides.transport || "대중교통",
    returnPlace: overrides.returnPlace || "",
    updatedBy: overrides.updatedBy || "공유방",
    updatedAt: overrides.updatedAt || now
  };
}

function buildRecommendations(room: Room): Recommendation[] {
  const activeParticipants = room.participants.filter((participant) => participant.startPlace.trim());
  const participants = activeParticipants.length ? activeParticipants : room.participants;
  const selectedTags = room.tags.length ? room.tags : ["#요즘유행하는"];

  return STATIONS.map((station) => {
    const routeSummaries = participants.map((participant) => {
      const duration = estimateDuration(participant, station, room);
      return {
        participantId: participant.id,
        participantName: participant.name,
        duration,
        arrivalTime: addMinutes(participant.startTime, duration),
        transport: participant.transport,
        from: participant.startPlace || "출발지 미입력"
      };
    });

    const durations = routeSummaries.map((route) => route.duration);
    const average = durations.reduce((sum, duration) => sum + duration, 0) / Math.max(durations.length, 1);
    const spread = Math.max(...durations, 0) - Math.min(...durations, 0);
    const tagFit = station.vibe.filter((tag) => selectedTags.includes(tag)).length;
    const monthFit = seasonalFit(room.month, station.id);
    const timeFit = room.timeOfDay === "밤" && ["hongdae", "hapjeong", "gangnam", "seongsu"].includes(station.id) ? 1 : 0;
    const score = average + spread * 1.25 + station.base - tagFit * 5 - monthFit * 2 - timeFit * 2;
    const places = station.places
      .map((place) => ({
        ...place,
        x: clamp(station.x + place.dx, 8, 92),
        y: clamp(station.y + place.dy, 8, 92),
        voteCount: countVotes(room, `place:${place.id}`),
        fit: place.tags.filter((tag) => selectedTags.includes(tag)).length
      }))
      .sort((a, b) => b.fit - a.fit || b.voteCount - a.voteCount)
      .slice(0, 3);

    return {
      id: station.id,
      name: station.name,
      x: station.x,
      y: station.y,
      score: Math.round(score * 10) / 10,
      voteCount: countVotes(room, `station:${station.id}`),
      summary: buildSummary(station, room, routeSummaries, places),
      routes: routeSummaries,
      places
    };
  })
    .sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.score - b.score;
    })
    .slice(0, 5);
}

function buildSummary(station: Station, room: Room, routes: RouteSummary[], places: PlaceRecommendation[]): string {
  const durations = routes.map((route) => route.duration);
  const average = Math.round(durations.reduce((sum, duration) => sum + duration, 0) / Math.max(durations.length, 1));
  const placeType = places[0]?.type || "장소";
  const tagText = room.tags[0] || "#요즘유행하는";
  const tone = room.timeOfDay === "밤" ? "밤 약속으로도 부담 없고" : "낮에 가볍게 만나기 좋고";
  return `${tone}, 평균 ${average}분대로 모이면서 ${tagText} ${placeType}까지 이어가기 딱 좋아요.`;
}

function seasonalFit(month: number, stationId: string): number {
  const springFall = [3, 4, 5, 9, 10, 11];
  const hotCold = [1, 2, 7, 8, 12];
  if (springFall.includes(Number(month)) && ["mangwon", "jamsil", "hongdae"].includes(stationId)) return 1;
  if (hotCold.includes(Number(month)) && ["gangnam", "jamsil", "sinchon"].includes(stationId)) return 1;
  return 0;
}

function estimateDuration(participant: Participant, station: Station, room: Room): number {
  const origin = geocode(participant.startPlace || participant.returnPlace || participant.name);
  const dx = origin.x - station.x;
  const dy = origin.y - station.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const modeFactor = participant.transport === "도보" ? 2.6 : participant.transport === "차량" ? 0.85 : participant.transport === "택시" ? 0.75 : 1;
  const timePenalty = room.timeOfDay === "밤" ? 4 : 2;
  const monthPenalty = [7, 8, 12, 1].includes(Number(room.month)) ? 3 : 0;
  const hashPenalty = stableHash(`${participant.startPlace}:${station.id}:${participant.transport}`) % 8;
  return clamp(Math.round(distance * 1.05 * modeFactor + 15 + timePenalty + monthPenalty + hashPenalty), 12, 95);
}

function geocode(label: string): { x: number; y: number } {
  const cleanLabel = String(label || "").trim();
  if (LANDMARKS[cleanLabel]) return LANDMARKS[cleanLabel];

  const matchedKey = Object.keys(LANDMARKS).find((key) => cleanLabel.includes(key.replace("역", "")) || key.includes(cleanLabel));
  if (matchedKey) return LANDMARKS[matchedKey];

  const hash = stableHash(cleanLabel || "unknown");
  return {
    x: 18 + (hash % 68),
    y: 18 + ((hash >> 8) % 64)
  };
}

function addMinutes(time: string, minutes: number): string {
  const [hour = "18", minute = "00"] = String(time || "18:00").split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function countVotes(room: Room, key: string): number {
  const bucket = room.votes[key] || {};
  return Object.values(bucket).filter(Boolean).length;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function markUpdated(room: Room): Room {
  room.updatedAt = new Date().toISOString();
  return room;
}

function sanitizeRoomPatch(body: unknown): Partial<Room> {
  const data = asObject(body);
  const patch: Partial<Room> = {};
  if (data.month) patch.month = clamp(Number(data.month), 1, 12);
  if (data.timeOfDay === "낮" || data.timeOfDay === "밤") patch.timeOfDay = data.timeOfDay;
  if (Array.isArray(data.tags)) patch.tags = data.tags.filter((tag): tag is string => typeof tag === "string" && TAGS.includes(tag)).slice(0, 6);
  return patch;
}

function sanitizeParticipantPatch(body: unknown): Partial<Participant> {
  const data = asObject(body);
  const patch: Partial<Participant> = {};
  if (typeof data.startTime === "string") patch.startTime = data.startTime.slice(0, 5) || "18:30";
  if (typeof data.startPlace === "string") patch.startPlace = data.startPlace.trim().slice(0, 40);
  if (typeof data.transport === "string") patch.transport = data.transport.slice(0, 12);
  if (typeof data.returnPlace === "string") patch.returnPlace = data.returnPlace.trim().slice(0, 40);
  if (typeof data.updatedBy === "string") patch.updatedBy = data.updatedBy.trim().slice(0, 20) || "공유방";
  patch.updatedAt = new Date().toISOString();
  return patch;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function broadcastRoom(roomId: string): void {
  const clients = sseClients.get(roomId);
  if (!clients || !clients.size) return;

  const payload = serializeSseRoom(roomId);
  for (const controller of clients) {
    try {
      controller.enqueue(payload);
    } catch {
      clients.delete(controller);
    }
  }
}
