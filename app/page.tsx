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
          <img className="home-illustration" src="/images/home-illustration.png" alt="" />

          <h1 className="home-title">우리 어디서 만나?</h1>

          <p className="home-description">
            위치만 적으면 평균 거리·환승·영업시간까지 따져서 <strong>공평한 만남터</strong>를 찾아드려요.
            카톡방에 링크 한 줄이면 끝.
          </p>

          <button className="home-cta" type="button" onClick={createRoom}>
            <span>만날 장소 정하기</span>
          </button>

        </div>
      </section>
    </main>
  );
}
