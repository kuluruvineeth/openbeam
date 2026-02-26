import { useLocalSearchParams } from "expo-router";
import { NotesScreen } from "@/screens/notes-screen";

export default function NotesRoute() {
  const params = useLocalSearchParams<{ serverId?: string }>();
  const serverId = typeof params.serverId === "string" ? params.serverId : "";

  return <NotesScreen serverId={serverId} />;
}
