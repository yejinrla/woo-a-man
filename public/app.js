const app = document.querySelector("#app");
const templates = {
  home: document.querySelector("#home-template"),
  room: document.querySelector("#room-template")
};

const state = {
  room: null,
  selectedRecommendationId: null,
  eventSource: null,
  pendingSaves: new Map(),
  voterId: getOrCreateVoterId(),
  homeDraft: {
    month: new Date().getMonth() + 1,
    timeOfDay: "낮",
    tags: ["#요즘유행하는", "#대화하기좋은"]
  }
};

const TAGS = [
  "#요즘유행하는",
  "#한적한",
  "#대화하기좋은",
  "#맛집많은",
  "#사진찍기좋은",
  "#비오는날좋은"
];

const TRANSPORTS = ["대중교통", "도보", "차량", "택시"];

init();

function init() {
  const roomId = getRoomIdFromPath();
  if (!roomId) {
    renderHome();
    return;
  }

  renderRoomShell();
  connectRoom(roomId);
}

function renderHome() {
  state.eventSource?.close();
  app.replaceChildren(templates.home.content.cloneNode(true));
  setupHomeControls();
  app.querySelector('[data-action="create-room"]').addEventListener("click", createRoom);
}

async function createRoom() {
  const draft = getHomeDraftFromControls();
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  const room = await response.json();
  history.pushState({}, "", `/rooms/${room.id}`);
  renderRoomShell();
  connectRoom(room.id);
}

function setupHomeControls() {
  const monthSelect = app.querySelector('[data-home-field="month"]');
  monthSelect.replaceChildren(...createMonthOptions(state.homeDraft.month));
  monthSelect.addEventListener("change", () => {
    state.homeDraft.month = Number(monthSelect.value);
  });

  app.querySelectorAll("[data-home-time]").forEach((button) => {
    button.addEventListener("click", () => {
      state.homeDraft.timeOfDay = button.dataset.homeTime;
      renderHomeControlState();
    });
  });

  const tagRow = app.querySelector(".home-tags");
  TAGS.forEach((tag) => {
    const button = document.createElement("button");
    button.className = "tag-button";
    button.textContent = tag;
    button.type = "button";
    button.addEventListener("click", () => {
      const current = new Set(state.homeDraft.tags);
      if (current.has(tag)) current.delete(tag);
      else current.add(tag);
      state.homeDraft.tags = [...current];
      renderHomeControlState();
    });
    tagRow.append(button);
  });

  renderHomeControlState();
}

function renderHomeControlState() {
  app.querySelectorAll("[data-home-time]").forEach((button) => {
    const isActive = button.dataset.homeTime === state.homeDraft.timeOfDay;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  app.querySelectorAll(".home-tags .tag-button").forEach((button) => {
    const isActive = state.homeDraft.tags.includes(button.textContent);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getHomeDraftFromControls() {
  const month = Number(app.querySelector('[data-home-field="month"]')?.value || state.homeDraft.month);
  const timeOfDay = app.querySelector("[data-home-time].is-active")?.dataset.homeTime || state.homeDraft.timeOfDay;
  const tags = [...app.querySelectorAll(".home-tags .tag-button.is-active")].map((button) => button.textContent);
  state.homeDraft = { month, timeOfDay, tags };
  return state.homeDraft;
}

function renderRoomShell() {
  app.replaceChildren(templates.room.content.cloneNode(true));
  setupStaticControls();
}

function setupStaticControls() {
  const monthSelect = app.querySelector('[data-field="month"]');
  monthSelect.replaceChildren(...createMonthOptions());

  monthSelect.addEventListener("change", () => patchRoom({ month: Number(monthSelect.value) }));

  app.querySelectorAll("[data-time]").forEach((button) => {
    button.addEventListener("click", () => patchRoom({ timeOfDay: button.dataset.time }));
  });

  const tagRow = app.querySelector(".tag-row");
  TAGS.forEach((tag) => {
    const button = document.createElement("button");
    button.className = "tag-button";
    button.textContent = tag;
    button.type = "button";
    button.addEventListener("click", () => {
      const current = new Set(state.room.tags);
      if (current.has(tag)) current.delete(tag);
      else current.add(tag);
      patchRoom({ tags: [...current] });
    });
    tagRow.append(button);
  });

  app.querySelector('[data-action="add-participant"]').addEventListener("click", addParticipant);
  app.querySelector('[data-action="copy-link"]').addEventListener("click", copyShareLink);
}

async function connectRoom(roomId) {
  state.eventSource?.close();
  const initial = await fetchJson(`/api/rooms/${roomId}`);
  applyRoom(initial);

  state.eventSource = new EventSource(`/api/rooms/${roomId}/events`);
  state.eventSource.addEventListener("room", (event) => {
    applyRoom(JSON.parse(event.data));
  });
  state.eventSource.onerror = () => {
    app.querySelector(".status-text").textContent = "재연결 중";
  };
}

function applyRoom(room) {
  state.room = room;
  if (!state.selectedRecommendationId || !room.recommendations.some((item) => item.id === state.selectedRecommendationId)) {
    state.selectedRecommendationId = room.recommendations[0]?.id || null;
  }
  renderRoom();
}

function renderRoom() {
  if (!state.room) return;

  app.querySelector('[data-field="month"]').value = String(state.room.month);
  app.querySelectorAll("[data-time]").forEach((button) => {
    const isActive = button.dataset.time === state.room.timeOfDay;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  app.querySelectorAll(".tag-button").forEach((button) => {
    const isActive = state.room.tags.includes(button.textContent);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  app.querySelector(".status-text").textContent = `업데이트 ${formatUpdatedAt(state.room.updatedAt)}`;

  renderParticipants();
  renderRecommendations();
  renderMap();
}

function renderParticipants() {
  const list = app.querySelector(".participants-list");
  list.replaceChildren();

  state.room.participants.forEach((participant) => {
    const card = document.createElement("article");
    card.className = "participant-card";
    card.innerHTML = `
      <header>
        <div>
          <p class="eyebrow">${participant.updatedBy || "공유방"} 수정</p>
          <h3>${escapeHtml(participant.name)}</h3>
        </div>
        <button class="delete-button" title="참가자 삭제" aria-label="${escapeHtml(participant.name)} 삭제">×</button>
      </header>
      <div class="participant-grid">
        <label>출발시각 <input type="time" data-input="startTime" value="${escapeHtml(participant.startTime)}" /></label>
        <label>출발장소 <input type="text" data-input="startPlace" value="${escapeHtml(participant.startPlace)}" placeholder="예: 강남역" /></label>
        <label>교통수단 <select data-input="transport"></select></label>
        <label>귀가장소 <input type="text" data-input="returnPlace" value="${escapeHtml(participant.returnPlace)}" placeholder="예: 신촌역" /></label>
      </div>
    `;

    const transportSelect = card.querySelector('[data-input="transport"]');
    TRANSPORTS.forEach((transport) => {
      const option = document.createElement("option");
      option.value = transport;
      option.textContent = transport;
      option.selected = participant.transport === transport;
      transportSelect.append(option);
    });

    card.querySelector(".delete-button").addEventListener("click", () => deleteParticipant(participant.id));
    card.querySelectorAll("[data-input]").forEach((input) => {
      input.addEventListener("input", () => queueParticipantSave(participant.id, card));
      input.addEventListener("change", () => queueParticipantSave(participant.id, card, 0));
    });

    list.append(card);
  });
}

function createMonthOptions(selectedMonth) {
  return Array.from({ length: 12 }, (_, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = `${index + 1}월`;
    option.selected = Number(selectedMonth) === index + 1;
    return option;
  });
}

function renderRecommendations() {
  const list = app.querySelector(".recommendation-list");
  list.replaceChildren();

  state.room.recommendations.forEach((recommendation, index) => {
    const card = document.createElement("article");
    card.className = `recommendation-card ${recommendation.id === state.selectedRecommendationId ? "is-selected" : ""}`;
    card.innerHTML = `
      <button class="card-main" type="button">
        <header>
          <div>
            <span class="rank">${index + 1}</span>
            <h3>${escapeHtml(recommendation.name)}</h3>
          </div>
          <span class="vote-count">${recommendation.voteCount}표</span>
        </header>
        <p class="summary">${escapeHtml(recommendation.summary)}</p>
        <div class="route-list">
          ${recommendation.routes.map((route) => `
            <div class="route-item">
              <span><strong>${escapeHtml(route.participantName)}</strong> ${escapeHtml(route.from)}</span>
              <span>소요 ${route.duration}분 · ${route.arrivalTime} 도착</span>
            </div>
          `).join("")}
        </div>
      </button>
      <div class="card-actions">
        <span class="vote-count">후보 역 투표</span>
        <button class="vote-button ${hasVoted("station", recommendation.id) ? "is-on" : ""}" type="button">${hasVoted("station", recommendation.id) ? "투표됨" : "투표"}</button>
      </div>
    `;

    card.querySelector(".card-main").addEventListener("click", () => {
      state.selectedRecommendationId = recommendation.id;
      renderRoom();
    });
    card.querySelector(".vote-button").addEventListener("click", () => vote("station", recommendation.id));
    list.append(card);
  });
}

function renderMap() {
  const recommendation = getSelectedRecommendation();
  const map = app.querySelector(".map-stage");
  const places = app.querySelector(".place-list");
  map.replaceChildren();
  places.replaceChildren();

  if (!recommendation) {
    app.querySelector(".selected-title").textContent = "추천 장소";
    return;
  }

  app.querySelector(".selected-title").textContent = recommendation.name;
  const river = document.createElement("div");
  river.className = "river";
  map.append(river);

  map.append(createPin("station", recommendation.name, recommendation.x, recommendation.y));
  recommendation.routes.forEach((route, index) => {
    const point = pseudoPoint(route.from, index);
    map.append(createPin("person", route.participantName.replace("참가자 ", ""), point.x, point.y));
  });
  recommendation.places.forEach((place) => {
    map.append(createPin("place", place.type, place.x, place.y));
  });

  recommendation.places.forEach((place) => {
    const card = document.createElement("article");
    card.className = "place-card";
    card.innerHTML = `
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(place.type)}</p>
          <h3>${escapeHtml(place.name)}</h3>
        </div>
        <button class="vote-button ${hasVoted("place", place.id) ? "is-on" : ""}" type="button">${hasVoted("place", place.id) ? "투표됨" : "투표"}</button>
      </header>
      <p>${escapeHtml(recommendation.name)}에서 바로 이어가기 좋은 ${place.type} 후보예요.</p>
      <div class="chip-row">
        ${place.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
        <span class="chip">${place.voteCount}표</span>
      </div>
    `;
    card.querySelector(".vote-button").addEventListener("click", () => vote("place", place.id));
    places.append(card);
  });
}

function createPin(type, label, x, y) {
  const pin = document.createElement("div");
  pin.className = `pin ${type}`;
  pin.style.setProperty("--x", x);
  pin.style.setProperty("--y", y);
  pin.textContent = label;
  return pin;
}

function pseudoPoint(label, index) {
  let hash = 2166136261;
  for (const char of String(label || index)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return {
    x: 12 + (hash % 76),
    y: 14 + ((hash >> 8) % 72)
  };
}

function getSelectedRecommendation() {
  return state.room?.recommendations.find((item) => item.id === state.selectedRecommendationId) || state.room?.recommendations[0];
}

async function patchRoom(patch) {
  const roomId = state.room.id;
  const room = await fetchJson(`/api/rooms/${roomId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  applyRoom(room);
}

async function addParticipant() {
  const room = await fetchJson(`/api/rooms/${state.room.id}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updatedBy: "공유방" })
  });
  applyRoom(room);
}

async function deleteParticipant(participantId) {
  const room = await fetchJson(`/api/rooms/${state.room.id}/participants/${participantId}`, {
    method: "DELETE"
  });
  applyRoom(room);
}

function queueParticipantSave(participantId, card, delay = 450) {
  clearTimeout(state.pendingSaves.get(participantId));
  const timeout = setTimeout(() => saveParticipant(participantId, card), delay);
  state.pendingSaves.set(participantId, timeout);
}

async function saveParticipant(participantId, card) {
  const patch = {};
  card.querySelectorAll("[data-input]").forEach((input) => {
    patch[input.dataset.input] = input.value;
  });
  patch.updatedBy = "공유방";

  const room = await fetchJson(`/api/rooms/${state.room.id}/participants/${participantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  applyRoom(room);
}

async function vote(targetType, targetId) {
  const room = await fetchJson(`/api/rooms/${state.room.id}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetType, targetId, voterId: state.voterId })
  });
  applyRoom(room);
}

function hasVoted(targetType, targetId) {
  const bucket = state.room?.votes?.[`${targetType}:${targetId}`] || {};
  return Boolean(bucket[state.voterId]);
}

async function copyShareLink() {
  await navigator.clipboard.writeText(window.location.href);
  showToast("공유 링크를 복사했어요");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 1800);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "요청을 처리하지 못했어요");
  }
  return response.json();
}

function getRoomIdFromPath() {
  const match = window.location.pathname.match(/^\/rooms\/([^/]+)$/);
  return match?.[1] || null;
}

function getOrCreateVoterId() {
  const key = "woori-meet-voter-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, created);
  return created;
}

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("popstate", init);
