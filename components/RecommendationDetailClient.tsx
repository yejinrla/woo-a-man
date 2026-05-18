"use client";

import { type CSSProperties, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Recommendation, RoomResponse } from "@/lib/meeting-store";

interface RecommendationDetailClientProps {
  roomId: string;
  recommendationId: string;
  initialRoom: RoomResponse;
}

export default function RecommendationDetailClient({ roomId, recommendationId, initialRoom }: RecommendationDetailClientProps) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomResponse>(initialRoom);
  const [voterId, setVoterId] = useState("");
  const [toast, setToast] = useState("");

  const applyRoom = useCallback((nextRoom: RoomResponse) => {
    setRoom(nextRoom);
  }, []);

  useEffect(() => {
    setVoterId(getOrCreateVoterId());
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`/api/rooms/${roomId}/events`);
    eventSource.addEventListener("room", (event) => {
      applyRoom(JSON.parse(event.data) as RoomResponse);
    });

    return () => eventSource.close();
  }, [applyRoom, roomId]);

  const recommendation = room.recommendations.find((item) => item.id === recommendationId) || room.recommendations[0];

  async function vote(targetType: "station" | "place", targetId: string) {
    if (!voterId) return;

    const nextRoom = await fetchJson<RoomResponse>(`/api/rooms/${roomId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, voterId })
    });
    applyRoom(nextRoom);
  }

  if (!recommendation) {
    return (
      <main>
        <section className="app-shell detail-shell">
          <button className="detail-back-button" type="button" onClick={() => router.push(`/rooms/${roomId}?view=results`)}>
            ‹
          </button>
        </section>
      </main>
    );
  }

  const stationVoted = hasVoted(room, voterId, "station", recommendation.id);
  const averageDuration = getAverageDuration(recommendation);
  const firstArrival = recommendation.routes[0]?.arrivalTime || "--:--";

  return (
    <main>
      <section className="app-shell detail-shell">
        <header className="detail-topbar">
          <button className="detail-back-button" type="button" onClick={() => router.push(`/rooms/${roomId}?view=results`)} aria-label="추천 결과로 돌아가기">
            ‹
          </button>
          <Link className="detail-brand" href="/">
            <span className="pixel-marker" aria-hidden="true">
              <span />
            </span>
            우리.어디서.만나
          </Link>
          <button className={`detail-station-vote ${stationVoted ? "is-on" : ""}`} type="button" onClick={() => vote("station", recommendation.id)}>
            ▪ 후보 역 투표됨
          </button>
        </header>

        <section className="detail-hero">
          <div className="detail-title-row">
            <span className="detail-rank">{getRecommendationRank(room.recommendations, recommendation.id)}</span>
            <div>
              <h1>{recommendation.name}</h1>
              <p>2호선·공항·경의중앙 · #카페</p>
            </div>
          </div>
          <p className="detail-summary-text">{recommendation.summary}</p>
          <div className="detail-metrics">
            <div>
              <span>소요</span>
              <strong>{averageDuration}분</strong>
            </div>
            <div>
              <span>도착</span>
              <strong>{firstArrival}</strong>
            </div>
            <div>
              <span>득표</span>
              <strong>
                {recommendation.voteCount}/{Math.max(room.participants.length, 1)}
              </strong>
            </div>
          </div>
          <div className="detail-route-strip">
            {recommendation.routes.map((route, index) => (
              <span key={route.participantId}>
                <i className={index % 4 === 3 ? "is-yellow" : ""} /> {route.participantName} · {route.duration}분
              </span>
            ))}
          </div>
        </section>

        <RecommendationMap recommendation={recommendation} />

        <section className="detail-places-section">
          <div className="places-heading">
            <h2>이어가기 좋은 곳 <span>· {recommendation.places.length}곳</span></h2>
            <button type="button">전체 →</button>
          </div>
          <div className="detail-place-list">
            {recommendation.places.map((place, index) => {
              const placeVoted = hasVoted(room, voterId, "place", place.id);
              return (
                <article className="detail-place-card" key={place.id}>
                  <div className="place-thumb" aria-hidden="true">
                    <span />
                  </div>
                  <div className="place-content">
                    <div className="place-card-head">
                      <div>
                        <p>{place.type} · {recommendation.name} 도보 {3 + index}분</p>
                        <h3>{place.name}</h3>
                      </div>
                      <span>#{index + 1}</span>
                    </div>
                    <p>{recommendation.name}에서 바로 이어가기 좋은 {place.type} 후보예요. 대화하기 좋은 좌석과 근처 동선까지 함께 봤어요.</p>
                    <div className="detail-chip-row">
                      {place.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="place-card-foot">
                      <span>●○ {place.voteCount}표</span>
                      <button className={placeVoted ? "is-on" : ""} type="button" onClick={() => vote("place", place.id)}>
                        {placeVoted ? "✓ 투표됨" : "투표하기"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function RecommendationMap({ recommendation }: { recommendation: Recommendation }) {
  return (
    <section className="detail-map-card">
      <div className="detail-map-head">
        <div>
          <p><span /> 지도</p>
          <h2>{recommendation.name} 주변</h2>
        </div>
        <span>핀 {recommendation.places.length + recommendation.routes.length + 1}개</span>
      </div>
      <div className="map-filter-tabs" aria-label="지도 필터">
        {["전체", "카페", "음식점", "놀거리", "술집"].map((item, index) => (
          <button className={index === 0 ? "is-active" : ""} type="button" key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="detail-pixel-map" aria-label="추천 지도">
        <div className="map-water" />
        <Pin type="station" label={recommendation.name} x={recommendation.x} y={recommendation.y} />
        {recommendation.routes.map((route, index) => {
          const point = pseudoPoint(route.from, index);
          return <Pin key={route.participantId} type="person" label={route.participantName} x={point.x} y={point.y} />;
        })}
        {recommendation.places.map((place) => (
          <Pin key={place.id} type="place" label={place.type} x={place.x} y={place.y} />
        ))}
        <div className="map-scale">200m</div>
        <div className="map-north">N ↑</div>
      </div>
    </section>
  );
}

function Pin({ type, label, x, y }: { type: "station" | "person" | "place"; label: string; x: number; y: number }) {
  return (
    <div
      className={`detail-pin ${type}`}
      style={
        {
          "--x": x,
          "--y": y
        } as CSSProperties
      }
    >
      {type === "station" ? "▣ " : type === "place" ? "▰ " : "▥ "}
      {label}
    </div>
  );
}

function hasVoted(room: RoomResponse, voterId: string, targetType: "station" | "place", targetId: string) {
  if (!voterId) return false;
  const bucket = room.votes[`${targetType}:${targetId}`] || {};
  return Boolean(bucket[voterId]);
}

function getRecommendationRank(recommendations: Recommendation[], recommendationId: string) {
  const index = recommendations.findIndex((item) => item.id === recommendationId);
  return index >= 0 ? index + 1 : 1;
}

function getAverageDuration(recommendation: Recommendation) {
  const durations = recommendation.routes.map((route) => route.duration);
  if (!durations.length) return 0;
  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

function pseudoPoint(label: string, index: number) {
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
