import { ArrowLeft, Copy, MoreHorizontal, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useNotesStore } from "@/stores/notes-store";
import { formatTimeAgo } from "@/utils/time";
import { formatWordCount, wordCount } from "../lib/formatters";
import { NoteEditor } from "./note-editor";
import { NoteRenameInput } from "./note-rename-input";

type NoteDetailProps = {
  noteId: string;
  onBack: () => void;
};

export function NoteDetail({ noteId, onBack }: NoteDetailProps) {
  const { theme } = useUnistyles();
  const note = useNotesStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    Alert.alert("Delete note", `Delete "${note?.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteNote(noteId);
          onBack();
        },
      },
    ]);
  }, [noteId, note?.title, deleteNote, onBack]);

  const handleCopyMarkdown = useCallback(async () => {
    setMenuOpen(false);
    if (!note) {
      return;
    }
    try {
      const { Clipboard } = await import("react-native");
      (Clipboard as { setString?: (s: string) => void })?.setString?.(
        note.content
      );
    } catch {
      // Clipboard not available on all platforms
    }
  }, [note]);

  const handleRename = useCallback(
    (title: string) => {
      setRenaming(false);
      if (title.trim()) {
        updateNote(noteId, { title: title.trim() });
      }
    },
    [noteId, updateNote]
  );

  if (!note) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={onBack} style={styles.backButton}>
            <ArrowLeft color={theme.colors.foreground} size={18} />
          </Pressable>
          <Text muted>Note not found</Text>
        </View>
      </View>
    );
  }

  const createdDate = formatTimeAgo(new Date(note.createdAt));
  const words = wordCount(note.content);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.foreground} size={18} />
        </Pressable>

        <View style={styles.titleContainer}>
          {renaming ? (
            <NoteRenameInput
              initialValue={note.title}
              onCancel={() => setRenaming(false)}
              onSubmit={handleRename}
            />
          ) : (
            <Pressable onPress={() => setRenaming(true)}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {note.emoji ? `${note.emoji} ` : ""}
                {note.title}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityLabel="Note actions"
          hitSlop={8}
          onPress={() => setMenuOpen((o) => !o)}
          style={styles.menuButton}
        >
          <MoreHorizontal color={theme.colors.foreground} size={18} />
        </Pressable>
      </View>

      {menuOpen && (
        <View style={styles.menu}>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemText}>Rename</Text>
          </Pressable>
          <Pressable onPress={handleCopyMarkdown} style={styles.menuItem}>
            <Copy color={theme.colors.foreground} size={14} />
            <Text style={styles.menuItemText}>Copy as text</Text>
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.menuItemDestructive}>
            <Trash2 color={theme.colors.destructive} size={14} />
            <Text
              style={[styles.menuItemText, { color: theme.colors.destructive }]}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      )}

      <NoteEditor noteId={noteId} />

      <View style={styles.footer}>
        <Text muted style={styles.footerText}>
          Created {createdDate}
        </Text>
        <Text muted style={styles.footerText}>
          {formatWordCount(words)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    top: 52,
    right: 12,
    zIndex: 50,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    minWidth: 160,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItemDestructive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  menuItemText: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: 12,
  },
}));
