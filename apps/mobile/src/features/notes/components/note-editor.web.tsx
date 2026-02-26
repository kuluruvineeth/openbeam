import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type EditorState,
} from "lexical";
import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useNotesStore } from "@/stores/notes-store";
import { NOTE_DEBOUNCE_SAVE_MS } from "../constants";

type NoteEditorProps = {
  noteId: string;
};

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
];

function editorTheme() {
  return {
    paragraph: "note-editor-paragraph",
    heading: {
      h1: "note-editor-h1",
      h2: "note-editor-h2",
      h3: "note-editor-h3",
    },
    list: {
      ul: "note-editor-ul",
      ol: "note-editor-ol",
      listitem: "note-editor-li",
    },
    quote: "note-editor-quote",
    code: "note-editor-code",
    codeHighlight: {
      keyword: "note-editor-code-keyword",
      string: "note-editor-code-string",
      comment: "note-editor-code-comment",
    },
    link: "note-editor-link",
    text: {
      bold: "note-editor-bold",
      italic: "note-editor-italic",
      strikethrough: "note-editor-strikethrough",
      code: "note-editor-inline-code",
    },
  };
}

function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    editor.update(() => {
      const root = $getRoot();
      if (root.getTextContent().length > 0) {
        return;
      }

      if (!content) {
        return;
      }

      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(content));
      root.append(paragraph);
    });
  }, [editor, content]);

  return null;
}

function SavePlugin({
  noteId,
  debounceMs,
}: {
  noteId: string;
  debounceMs: number;
}) {
  const updateNote = useNotesStore((s) => s.updateNote);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const handleChange = useCallback(
    (editorState: EditorState) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        editorState.read(() => {
          const text = $getRoot().getTextContent();
          updateNote(noteId, { content: text });
        });
      }, debounceMs);
    },
    [noteId, debounceMs, updateNote]
  );

  return <OnChangePlugin onChange={handleChange} />;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useNotesStore((s) => s.notes.find((n) => n.id === noteId));

  if (!note) {
    return null;
  }

  const initialConfig = {
    namespace: `note-${noteId}`,
    theme: editorTheme(),
    nodes: EDITOR_NODES,
    onError: (error: Error) => {
      console.error("[NoteEditor]", error);
    },
  };

  return (
    <View style={styles.container}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="note-editor-container">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="note-editor-editable" />
            }
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={
              <div className="note-editor-placeholder">Start writing...</div>
            }
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <InitialContentPlugin content={note.content} />
          <SavePlugin debounceMs={NOTE_DEBOUNCE_SAVE_MS} noteId={noteId} />
        </div>
      </LexicalComposer>
    </View>
  );
}

const styles = StyleSheet.create((_theme) => ({
  container: {
    flex: 1,
  },
}));
