import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { DocumentRecord } from "./mock-data";
import { PreviewView } from "./preview-view";
import { PreviewSkeleton } from "./skeleton";

function extractDocument(toolResult: {
  content: Array<{ type: string; text?: string }>;
}): DocumentRecord | null {
  const textContent = toolResult.content.find((c) => c.type === "text");
  if (!textContent?.text) {
    return null;
  }

  try {
    const parsed = JSON.parse(textContent.text) as Record<string, unknown>;
    const doc = (parsed.document ?? parsed.data ?? parsed) as DocumentRecord;
    return doc?.id ? doc : null;
  } catch {
    return null;
  }
}

function App() {
  return (
    <McpAppWrapper name="DocumentPreview" skeleton={<PreviewSkeleton />}>
      {({ toolResult }) => {
        const doc = extractDocument(toolResult);
        if (!doc) {
          return (
            <div className="p-4 text-center text-muted-foreground text-xs">
              No document data available
            </div>
          );
        }
        return <PreviewView document={doc} />;
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
