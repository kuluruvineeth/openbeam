import { useRouter } from "expo-router";
import { useCallback } from "react";
import { NoteDetail } from "@/features/notes/components/note-detail";

type NoteDetailScreenProps = {
  serverId: string;
  noteId: string;
};

export function NoteDetailScreen({ serverId, noteId }: NoteDetailScreenProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/h/${serverId}/notes` as never);
    }
  }, [router, serverId]);

  return <NoteDetail noteId={noteId} onBack={handleBack} />;
}
