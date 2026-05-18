import RoomClient from "@/components/RoomClient";
import { getRoomResponse } from "@/lib/meeting-store";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  const initialRoom = getRoomResponse(roomId);

  return <RoomClient roomId={roomId} initialRoom={initialRoom} />;
}
