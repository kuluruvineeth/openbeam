import "../globals.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../shared/app-shell";
import { DashboardView } from "../views/connector-dashboard/dashboard-view";
import { MOCK_CONNECTOR_DATA } from "../views/connector-dashboard/mock-data";
import { MOCK_DOCUMENT_DATA } from "../views/document-preview/mock-data";
import { PreviewView } from "../views/document-preview/preview-view";
import { MOCK_SEARCH_DATA } from "../views/search/mock-data";
import { SearchView } from "../views/search/search-view";

type ViewId = "search" | "connector-dashboard" | "document-preview";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "search", label: "Search Results" },
  { id: "connector-dashboard", label: "Connector Dashboard" },
  { id: "document-preview", label: "Document Preview" },
];

function DevApp() {
  const [activeView, setActiveView] = useState<ViewId>("search");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <h1 style={{ fontSize: "0.875rem", fontWeight: 600 }}>
          MCP Apps — Dev Preview
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.75rem",
                borderRadius: "0.25rem",
                border: "1px solid hsl(var(--border))",
                background:
                  activeView === view.id
                    ? "hsl(var(--primary))"
                    : "transparent",
                color:
                  activeView === view.id
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--foreground))",
                cursor: "pointer",
              }}
              type="button"
            >
              {view.label}
            </button>
          ))}
          <button
            onClick={toggleTheme}
            style={{
              padding: "0.25rem 0.75rem",
              fontSize: "0.75rem",
              borderRadius: "0.25rem",
              border: "1px solid hsl(var(--border))",
              cursor: "pointer",
            }}
            type="button"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      <AppShell>
        {activeView === "search" && (
          <SearchView
            query={MOCK_SEARCH_DATA.query}
            results={MOCK_SEARCH_DATA.results}
            total={MOCK_SEARCH_DATA.total}
          />
        )}
        {activeView === "connector-dashboard" && (
          <DashboardView connectors={MOCK_CONNECTOR_DATA.data} />
        )}
        {activeView === "document-preview" && (
          <PreviewView document={MOCK_DOCUMENT_DATA.document} />
        )}
      </AppShell>
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <DevApp />
  </StrictMode>
);
