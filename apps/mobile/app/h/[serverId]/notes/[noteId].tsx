import { useLocalSearchParams } from "expo-router";
import { NoteDetailScreen } from "@/screens/note-detail-screen";

export default function NoteDetailRoute() {
  const params = useLocalSearchParams<{ serverId?: string; noteId?: string }>();
  const serverId = typeof params.serverId === "string" ? params.serverId : "";
  const noteId = typeof params.noteId === "string" ? params.noteId : "";

  return <NoteDetailScreen noteId={noteId} serverId={serverId} />;
}
