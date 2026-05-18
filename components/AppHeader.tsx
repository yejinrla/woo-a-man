"use client";

import Link from "next/link";

interface AppHeaderProps {
  onShare?: () => void;
}

export default function AppHeader({ onShare }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link className="brand-lockup" href="/" aria-label="홈으로 이동">
        <span className="pixel-marker" aria-hidden="true">
          <span />
        </span>
        <span className="brand-wordmark">우리.어디서.만나</span>
      </Link>
      <div className="header-actions">
        <span className="beta-badge">BETA</span>
        <button className="avatar-button" type="button" onClick={onShare} title="공유 링크 복사" aria-label="공유 링크 복사">
          <span className="avatar-face" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
