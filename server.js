const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");

const rooms = new Map();
const sseClients = new Map();

const TAGS = [
  "#요즘유행하는",
  "#한적한",
  "#대화하기좋은",
  "#맛집많은",
  "#사진찍기좋은",
  "#비오는날좋은"
];

const STATIONS = [
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

const LANDMARKS = {
  "홍대입구역": { x: 43, y: 43 },
  "합정역": { x: 39, y: 49 },
  "망원역": { x: 35, y: 43 },
  "신촌역": { x: 50, y: 43 },
  "이대역": { x: 55, y: 40 },
  "성수역": { x: 73, y: 56 },
  "강남역": { x: 65, y: 76 },
  "잠실역": { x: 81, y: 69 },
  "서울역": { x: 55, y: 52 },
  "사당역": { x: 56, y: 82 },
  "건대입구역": { x: 77, y: 61 },
  "왕십리역": { x: 70, y: 52 },
  "여의도역": { x: 41, y: 62 },
  "종각역": { x: 58, y: 44 },
  "혜화역": { x: 61, y: 35 },
  "신림역": { x: 46, y: 82 },
  "노원역": { x: 78, y: 21 },
  "수유역": { x: 65, y: 24 },
  "교대역": { x: 62, y: 78 },
  "마포구청역": { x: 34, y: 39 }
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function createRoom(overrides = {}) {
  const room = {
    id: crypto.randomBytes(4).toString("hex"),
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

  Object.assign(room, sanitizeRoomPatch(overrides));
  rooms.set(room.id, room);
  return withRecommendations(room);
}

function createParticipant(index, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomBytes(4).toString("hex"),
    name: `참가자 ${index}`,
    startTime: overrides.startTime || "18:30",
    startPlace: overrides.startPlace || "",
    transport: overrides.transport || "대중교통",
    returnPlace: overrides.returnPlace || "",
    updatedBy: overrides.updatedBy || "공유방",
    updatedAt: now
  };
}

function getOrCreateRoom(id) {
  if (rooms.has(id)) {
    return rooms.get(id);
  }

  const room = createRoom();
  rooms.delete(room.id);
  room.id = id;
  room.updatedAt = new Date().toISOString();
  rooms.set(id, room);
  return room;
}

function withRecommendations(room) {
  return {
    ...room,
    tags: room.tags.filter((tag) => TAGS.includes(tag)),
    recommendations: buildRecommendations(room)
  };
}

function buildRecommendations(room) {
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

function buildSummary(station, room, routes, places) {
  const durations = routes.map((route) => route.duration);
  const average = Math.round(durations.reduce((sum, duration) => sum + duration, 0) / Math.max(durations.length, 1));
  const placeType = places[0]?.type || "장소";
  const tagText = room.tags[0] || "#요즘유행하는";
  const tone = room.timeOfDay === "밤" ? "밤 약속으로도 부담 없고" : "낮에 가볍게 만나기 좋고";
  return `${tone}, 평균 ${average}분대로 모이면서 ${tagText} ${placeType}까지 이어가기 딱 좋아요.`;
}

function seasonalFit(month, stationId) {
  const springFall = [3, 4, 5, 9, 10, 11];
  const hotCold = [1, 2, 7, 8, 12];
  if (springFall.includes(Number(month)) && ["mangwon", "jamsil", "hongdae"].includes(stationId)) return 1;
  if (hotCold.includes(Number(month)) && ["gangnam", "jamsil", "sinchon"].includes(stationId)) return 1;
  return 0;
}

function estimateDuration(participant, station, room) {
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

function geocode(label) {
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

function addMinutes(time, minutes) {
  const [hour = "18", minute = "00"] = String(time || "18:00").split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function countVotes(room, key) {
  const bucket = room.votes[key] || {};
  return Object.values(bucket).filter(Boolean).length;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function markUpdated(room) {
  room.updatedAt = new Date().toISOString();
  return room;
}

function sanitizeRoomPatch(body) {
  const patch = {};
  if (body.month) patch.month = clamp(Number(body.month), 1, 12);
  if (body.timeOfDay === "낮" || body.timeOfDay === "밤") patch.timeOfDay = body.timeOfDay;
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter((tag) => TAGS.includes(tag)).slice(0, 6);
  return patch;
}

function sanitizeParticipantPatch(body) {
  const patch = {};
  if (typeof body.startTime === "string") patch.startTime = body.startTime.slice(0, 5) || "18:30";
  if (typeof body.startPlace === "string") patch.startPlace = body.startPlace.trim().slice(0, 40);
  if (typeof body.transport === "string") patch.transport = body.transport.slice(0, 12);
  if (typeof body.returnPlace === "string") patch.returnPlace = body.returnPlace.trim().slice(0, 40);
  if (typeof body.updatedBy === "string") patch.updatedBy = body.updatedBy.trim().slice(0, 20) || "공유방";
  patch.updatedAt = new Date().toISOString();
  return patch;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function broadcastRoom(roomId) {
  const clients = sseClients.get(roomId);
  if (!clients || !clients.size) return;

  const payload = JSON.stringify(withRecommendations(rooms.get(roomId)));
  for (const response of clients) {
    response.write(`event: room\n`);
    response.write(`data: ${payload}\n\n`);
  }
}

function handleSse(request, response, roomId) {
  const room = getOrCreateRoom(roomId);
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  response.write(`event: room\n`);
  response.write(`data: ${JSON.stringify(withRecommendations(room))}\n\n`);

  if (!sseClients.has(roomId)) sseClients.set(roomId, new Set());
  sseClients.get(roomId).add(response);

  request.on("close", () => {
    const clients = sseClients.get(roomId);
    if (!clients) return;
    clients.delete(response);
    if (!clients.size) sseClients.delete(roomId);
  });
}

async function handleApi(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/rooms") {
    const body = await readJson(request);
    return sendJson(response, 201, createRoom(body));
  }

  const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
  if (roomMatch && request.method === "GET") {
    const room = getOrCreateRoom(roomMatch[1]);
    return sendJson(response, 200, withRecommendations(room));
  }

  if (roomMatch && request.method === "PATCH") {
    const room = getOrCreateRoom(roomMatch[1]);
    const body = await readJson(request);
    Object.assign(room, sanitizeRoomPatch(body));
    markUpdated(room);
    broadcastRoom(room.id);
    return sendJson(response, 200, withRecommendations(room));
  }

  const eventsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/events$/);
  if (eventsMatch && request.method === "GET") {
    return handleSse(request, response, eventsMatch[1]);
  }

  const participantsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/participants$/);
  if (participantsMatch && request.method === "POST") {
    const room = getOrCreateRoom(participantsMatch[1]);
    const body = await readJson(request);
    const participant = createParticipant(room.participants.length + 1, sanitizeParticipantPatch(body));
    room.participants.push(participant);
    markUpdated(room);
    broadcastRoom(room.id);
    return sendJson(response, 201, withRecommendations(room));
  }

  const participantMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/participants\/([^/]+)$/);
  if (participantMatch && request.method === "PATCH") {
    const room = getOrCreateRoom(participantMatch[1]);
    const participant = room.participants.find((item) => item.id === participantMatch[2]);
    if (!participant) return sendJson(response, 404, { error: "Participant not found" });

    Object.assign(participant, sanitizeParticipantPatch(await readJson(request)));
    markUpdated(room);
    broadcastRoom(room.id);
    return sendJson(response, 200, withRecommendations(room));
  }

  if (participantMatch && request.method === "DELETE") {
    const room = getOrCreateRoom(participantMatch[1]);
    room.participants = room.participants.filter((item) => item.id !== participantMatch[2]);
    room.participants.forEach((participant, index) => {
      participant.name = `참가자 ${index + 1}`;
    });
    markUpdated(room);
    broadcastRoom(room.id);
    return sendJson(response, 200, withRecommendations(room));
  }

  const votesMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/votes$/);
  if (votesMatch && request.method === "POST") {
    const room = getOrCreateRoom(votesMatch[1]);
    const body = await readJson(request);
    const targetType = body.targetType === "place" ? "place" : "station";
    const targetId = String(body.targetId || "").replace(/[^a-z0-9-]/gi, "");
    const voterId = String(body.voterId || "").replace(/[^a-z0-9-]/gi, "");
    if (!targetId || !voterId) return sendJson(response, 400, { error: "targetId and voterId are required" });

    const key = `${targetType}:${targetId}`;
    if (!room.votes[key]) room.votes[key] = {};
    room.votes[key][voterId] = !room.votes[key][voterId];
    markUpdated(room);
    broadcastRoom(room.id);
    return sendJson(response, 200, withRecommendations(room));
  }

  return sendJson(response, 404, { error: "API route not found" });
}

function serveStatic(response, filePath) {
  const extension = path.extname(filePath);
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    const requestedPath = decodeURIComponent(url.pathname);
    const staticPath = path.normalize(path.join(PUBLIC_DIR, requestedPath));
    if (staticPath.startsWith(PUBLIC_DIR) && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      serveStatic(response, staticPath);
      return;
    }

    serveStatic(response, path.join(PUBLIC_DIR, "index.html"));
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`우리 어디서 만나지 is running at http://localhost:${PORT}`);
});
