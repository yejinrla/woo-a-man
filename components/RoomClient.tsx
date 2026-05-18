"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";

type RoomView = "edit" | "results";
type ParticipantField = "startTime" | "startPlace" | "transport" | "returnPlace";

interface Participant {
  id: string;
  name: string;
  startTime: string;
  startPlace: string;
  transport: string;
  returnPlace: string;
  updatedBy: string;
  updatedAt: string;
}

interface RouteSummary {
  participantId: string;
  participantName: string;
  duration: number;
  arrivalTime: string;
  transport: string;
  from: string;
}

interface PlaceRecommendation {
  id: string;
  name: string;
  type: string;
  tags: string[];
  x: number;
  y: number;
  voteCount: number;
}

interface Recommendation {
  id: string;
  name: string;
  x: number;
  y: number;
  voteCount: number;
  summary: string;
  routes: RouteSummary[];
  places: PlaceRecommendation[];
}

interface Room {
  id: string;
  month: number;
  timeOfDay: "낮" | "밤";
  tags: string[];
  participants: Participant[];
  votes: Record<string, Record<string, boolean>>;
  updatedAt: string;
  recommendations: Recommendation[];
}

interface RoomClientProps {
  roomId: string;
  initialRoom: Room;
}

const TAGS = ["#요즘유행하는", "#한적한", "#대화하기좋은", "#맛집많은", "#사진찍기좋은", "#비오는날좋은"];
const TRANSPORTS = ["대중교통", "도보", "차량", "택시"];
const tagLimit = 3;

export default function RoomClient({ roomId, initialRoom }: RoomClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [roomView, setRoomView] = useState<RoomView>(searchParams.get("view") === "results" ? "results" : "edit");
  const [voterId, setVoterId] = useState("");
  const [toast, setToast] = useState("");
  const pendingSaves = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const selectedTagCount = room.tags.length;

  const applyRoom = useCallback((nextRoom: Room) => {
    setRoom(nextRoom);
  }, []);

  useEffect(() => {
    setVoterId(getOrCreateVoterId());
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`/api/rooms/${roomId}/events`);
    eventSource.addEventListener("room", (event) => {
      applyRoom(JSON.parse(event.data) as Room);
    });

    return () => {
      eventSource.close();
      pendingSaves.current.forEach((timeout) => clearTimeout(timeout));
      pendingSaves.current.clear();
    };
  }, [applyRoom, roomId]);

  async function patchRoom(patch: Partial<Pick<Room, "month" | "timeOfDay" | "tags">>) {
    const nextRoom = await fetchJson<Room>(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    applyRoom(nextRoom);
  }

  async function addParticipant() {
    const nextRoom = await fetchJson<Room>(`/api/rooms/${roomId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedBy: "공유방" })
    });
    applyRoom(nextRoom);
  }

  async function deleteParticipant(participantId: string) {
    const nextRoom = await fetchJson<Room>(`/api/rooms/${roomId}/participants/${participantId}`, {
      method: "DELETE"
    });
    applyRoom(nextRoom);
  }

  function changeParticipant(participant: Participant, field: ParticipantField, value: string) {
    const nextParticipant = {
      ...participant,
      [field]: value,
      updatedBy: "공유방",
      updatedAt: new Date().toISOString()
    };

    setRoom((current) => ({
      ...current,
      participants: current.participants.map((item) => (item.id === participant.id ? nextParticipant : item))
    }));

    queueParticipantSave(nextParticipant);
  }

  function queueParticipantSave(participant: Participant, delay = 450) {
    clearTimeout(pendingSaves.current.get(participant.id));
    const timeout = setTimeout(() => saveParticipant(participant), delay);
    pendingSaves.current.set(participant.id, timeout);
  }

  async function saveParticipant(participant: Participant) {
    const nextRoom = await fetchJson<Room>(`/api/rooms/${roomId}/participants/${participant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: participant.startTime,
        startPlace: participant.startPlace,
        transport: participant.transport,
        returnPlace: participant.returnPlace,
        updatedBy: "공유방"
      })
    });
    applyRoom(nextRoom);
  }

  async function vote(targetType: "station" | "place", targetId: string) {
    if (!voterId) return;

    const nextRoom = await fetchJson<Room>(`/api/rooms/${roomId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, voterId })
    });
    applyRoom(nextRoom);
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    setToast("공유 링크를 복사했어요");
    window.setTimeout(() => setToast(""), 1800);
  }

  function toggleTag(tag: string) {
    const current = new Set(room.tags);
    if (current.has(tag)) current.delete(tag);
    else if (current.size < tagLimit) current.add(tag);
    patchRoom({ tags: [...current] });
  }

  return (
    <main>
      <section className="app-shell room-shell" data-view={roomView}>
        <AppHeader onShare={copyShareLink} />

        <header className="room-page-head">
          <div>
            <div className="room-kicker">
              <span>STEP 01</span>
              <p>누가·어디서·언제</p>
            </div>
            <h1>만남터 찾기</h1>
            <button className="share-status" type="button" onClick={copyShareLink}>
              <span aria-hidden="true" />
              공유방 ON · meetme.kr/{roomId}
            </button>
          </div>
        </header>

        {roomView === "edit" ? (
          <>
            <section className="meeting-card condition-card">
              <div className="field-label">월</div>
              <div className="condition-grid">
                <label className="month-select">
                  <select value={room.month} onChange={(event) => patchRoom({ month: Number(event.target.value) })}>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}월
                      </option>
                    ))}
                  </select>
                </label>
                <div className="time-toggle" role="group" aria-label="시간대">
                  {(["낮", "밤"] as const).map((timeOfDay) => (
                    <button
                      key={timeOfDay}
                      className={room.timeOfDay === timeOfDay ? "is-active" : ""}
                      type="button"
                      aria-pressed={room.timeOfDay === timeOfDay}
                      onClick={() => patchRoom({ timeOfDay })}
                    >
                      <span aria-hidden="true">{timeOfDay === "낮" ? "☷" : "◉"}</span>
                      {timeOfDay}
                    </button>
                  ))}
                </div>
              </div>
              <p className="condition-meta">2026 · {String(room.month).padStart(2, "0")} · 16 토 · ⟳ · {room.timeOfDay} 모임 시간대로 검색 중</p>

              <div className="tag-section">
                <strong>오늘 어떤 분위기?</strong>
                <div className="room-tag-grid" aria-label="취향 태그">
                  {TAGS.map((tag) => {
                    const isActive = room.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        className={`room-tag ${isActive ? "is-active" : ""}`}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <p className="tag-help">· {selectedTagCount}개 선택됨 · 최대 {tagLimit}개</p>
              </div>
            </section>

            <section className="meeting-card participants-panel">
              <div className="room-section-head">
                <div>
                  <p className="room-eyebrow"><span /> 함께 수정</p>
                  <h2>참가자 위치 <small>{room.participants.length} / 8명</small></h2>
                </div>
                <button className="room-add-button" type="button" onClick={addParticipant}>
                  + 친구 추가
                </button>
              </div>

              <div className="participants-list">
                {room.participants.map((participant, index) => (
                  <article className="participant-card" key={participant.id}>
                    <div className="participant-card-head">
                      <span className="participant-index">{index + 1}</span>
                      <div>
                        <h3>{participant.name}</h3>
                        <p><span /> P-{String(index + 1).padStart(2, "0")} · ACTIVE</p>
                      </div>
                      <button className="delete-button" type="button" onClick={() => deleteParticipant(participant.id)} aria-label={`${participant.name} 삭제`}>
                        ×
                      </button>
                    </div>

                    <div className="participant-form-grid">
                      <label className="participant-field time-field">
                        <span>출발시각</span>
                        <input type="time" value={participant.startTime} onChange={(event) => changeParticipant(participant, "startTime", event.target.value)} />
                      </label>
                      <label className="participant-field transport-field">
                        <span>교통수단</span>
                        <select value={participant.transport} onChange={(event) => changeParticipant(participant, "transport", event.target.value)}>
                          {TRANSPORTS.map((transport) => (
                            <option key={transport} value={transport}>
                              {transport}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="participant-field place-field">
                        <span>출발장소</span>
                        <input type="text" value={participant.startPlace} placeholder="예: 강남역" onChange={(event) => changeParticipant(participant, "startPlace", event.target.value)} />
                      </label>
                      <label className="participant-field place-field">
                        <span>귀가장소</span>
                        <input type="text" value={participant.returnPlace} placeholder="예: 강남역" onChange={(event) => changeParticipant(participant, "returnPlace", event.target.value)} />
                      </label>
                    </div>
                  </article>
                ))}
              </div>

              <button className="show-results-button" type="button" onClick={() => setRoomView("results")}>
                결과보기
              </button>
            </section>
          </>
        ) : (
          <>
            <header className="results-page-head">
              <div className="step-tabs" aria-label="진행 단계">
                <span>STEP 01</span>
                <strong>STEP 02 추천 결과</strong>
                <span>03</span>
              </div>
              <button className="edit-participants-button" type="button" onClick={() => setRoomView("edit")}>
                ▫ 참가자 수정
              </button>
            </header>

            <section className="results-panel room-results-panel">
              <div className="results-title-block">
                <div>
                  <p className="room-eyebrow"><span /> 추천 결과</p>
                  <h2>모이기 좋은 곳 <strong>5개</strong></h2>
                  <p>{room.participants.length}명의 평균 거리와 {room.tags.slice(0, 2).join(" / ")} 분위기로 추렸어요.</p>
                </div>
              </div>

              <div className="result-metrics" aria-label="추천 요약">
                <div>
                  <span>참여</span>
                  <strong>{room.participants.length}/{room.participants.length}</strong>
                </div>
                <div>
                  <span>평균</span>
                  <strong>{getOverallAverage(room.recommendations)}분</strong>
                </div>
                <div>
                  <span>마감</span>
                  <strong>02:14</strong>
                </div>
              </div>

              <div className="recommendation-list">
                {room.recommendations.map((recommendation, index) => {
                  const stationVoted = hasVoted(room, voterId, "station", recommendation.id);
                  const averageDuration = getAverageDuration(recommendation);
                  const firstArrival = recommendation.routes[0]?.arrivalTime || "--:--";
                  return (
                    <article className={`recommendation-card result-card ${index === 0 ? "is-best" : ""}`} key={recommendation.id}>
                      {index === 0 ? <div className="best-ribbon">★ 최다 득표</div> : null}
                      <button className="card-main" type="button" onClick={() => router.push(`/rooms/${roomId}/recommendations/${recommendation.id}`)}>
                        <header>
                          <div>
                            <span className="rank">{index + 1}</span>
                            <div className="result-name-block">
                              <h3>{recommendation.name}</h3>
                              <p>· {index === 0 ? "2·6호선" : "2호선"} · #{room.tags[index % Math.max(room.tags.length, 1)]?.replace("#", "") || "모임"}</p>
                            </div>
                          </div>
                        </header>
                        <p className="summary">{recommendation.summary}</p>
                        <div className="route-list result-route-box">
                          {recommendation.routes.map((route) => (
                            <div className="route-item" key={route.participantId}>
                              <span>
                                <strong>{route.participantName}</strong>
                              </span>
                              <span>
                                {route.duration}분
                              </span>
                            </div>
                          ))}
                          <p>평균 {averageDuration}분 · 도착 {firstArrival}</p>
                        </div>
                      </button>
                      <div className="card-actions">
                        <span className="vote-count">
                          {renderVoteBlocks(recommendation.voteCount, room.participants.length)} {recommendation.voteCount} / {room.participants.length}표
                        </span>
                        <button className={`vote-button ${stationVoted ? "is-on" : ""}`} type="button" onClick={() => vote("station", recommendation.id)}>
                          {stationVoted ? "★ 1번 후보 →" : "투표하기 →"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function hasVoted(room: Room, voterId: string, targetType: "station" | "place", targetId: string) {
  if (!voterId) return false;
  const bucket = room.votes[`${targetType}:${targetId}`] || {};
  return Boolean(bucket[voterId]);
}

function getAverageDuration(recommendation: Recommendation) {
  const durations = recommendation.routes.map((route) => route.duration);
  if (!durations.length) return 0;
  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

function getOverallAverage(recommendations: Recommendation[]) {
  if (!recommendations.length) return 0;
  const total = recommendations.reduce((sum, recommendation) => sum + getAverageDuration(recommendation), 0);
  return Math.round(total / recommendations.length);
}

function renderVoteBlocks(voteCount: number, participantCount: number) {
  const total = Math.max(participantCount, 1);
  return Array.from({ length: total }, (_, index) => (
    <i className={index < voteCount ? "is-filled" : ""} key={index} aria-hidden="true" />
  ));
}

function getOrCreateVoterId() {
  const key = "woori-meet-voter-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "요청을 처리하지 못했어요");
  }
  return response.json() as Promise<T>;
}
