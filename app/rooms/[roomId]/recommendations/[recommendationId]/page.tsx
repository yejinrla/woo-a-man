import RecommendationDetailClient from "@/components/RecommendationDetailClient";
import { getRoomResponse } from "@/lib/meeting-store";

interface RecommendationPageProps {
  params: Promise<{ roomId: string; recommendationId: string }>;
}

export default async function RecommendationPage({ params }: RecommendationPageProps) {
  const { roomId, recommendationId } = await params;
  const initialRoom = getRoomResponse(roomId);

  return <RecommendationDetailClient roomId={roomId} recommendationId={recommendationId} initialRoom={initialRoom} />;
}
