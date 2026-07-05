"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  async function createRoom() {
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const room = (await response.json()) as { id: string };
    router.push(`/rooms/${room.id}`);
  }

  return (
    <main>
      <section className="home-shell">
        <div className="home-copy">
          <div className="home-kicker">
            <p>모임 기준 최적 만남터</p>
          </div>

          <h1 className="home-title">
            우리 어디서
            만나?
          </h1>

          <p className="home-description">
            위치만 적으면 평균 거리·환승·영업시간까지 따져서 <strong>공평한 만남터</strong>를 찾아드려요.
            카톡방에 링크 한 줄이면 끝.
          </p>

          <button className="home-cta" type="button" onClick={createRoom}>
            <span>만날 장소 정하기</span>
            <span aria-hidden="true">→</span>
          </button>

          <div className="home-stats" aria-label="오늘 만남 수">
            <span className="stat-dot coral" />
            <span className="stat-dot yellow" />
            <span className="stat-dot blue" />
            <span className="stat-dot mint" />
            <p>
              오늘 <strong>1,284명</strong>이 만남
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
