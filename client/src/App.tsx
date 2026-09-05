import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import Navbar from "./components/Navbar.js";
import RequesterSelector from "./components/RequesterSelector.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";
import RequesterTicketDetail from "./components/RequesterTicketDetail.js";
import "./theme.css";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

function AppContent() {
  const { selectedRequester, isSelectorOpen } = useRequester();
  const [activeView, setActiveView] = useState<"tickets" | "create-ticket" | "ticket-detail">("tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = (view: "tickets" | "create-ticket" | "ticket-detail") => {
    if (view !== "ticket-detail") {
      setSelectedTicketId(null);
    }
    setActiveView(view);
  };

  const handleViewDetail = (id: number) => {
    setSelectedTicketId(id);
    setActiveView("ticket-detail");
  };

  async function handleCheck() {
    setState("loading");
    setError(null);
    try {
      const res = await checkSystem();
      setCategories(res.categories);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backend service is unavailable");
      setState("error");
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column pb-5 pb-md-0" style={{ backgroundColor: "var(--color-page-bg)" }}>
      <Navbar activeView={activeView} onNavigate={handleNavigate} />

      {(!selectedRequester || isSelectorOpen) && <RequesterSelector />}

      {activeView === "ticket-detail" && selectedTicketId !== null ? (
        <RequesterTicketDetail
          ticketId={selectedTicketId}
          onBack={() => {
            setSelectedTicketId(null);
            setActiveView("tickets");
          }}
        />
      ) : activeView === "create-ticket" ? (
        <CreateTicket
          onCancel={() => setActiveView("tickets")}
          onViewDetail={handleViewDetail}
        />
      ) : (
        <>
          <MyTickets
            onNavigateCreate={() => setActiveView("create-ticket")}
            onViewDetail={handleViewDetail}
          />

          {/* Lab 1 Baseline: System Status Check (Preserved for Non-Regression) */}
          <div className="container py-3 px-lg-5" style={{ maxWidth: 1280 }}>
            <div className="card border-0 bg-transparent mb-4">
              <div className="card-body p-0">
                <details className="text-muted small">
                  <summary className="cursor-pointer fw-semibold mb-2">
                    Lab 1 Service Connectivity Diagnostics
                  </summary>
                  <div className="zen-card p-3 mt-2" style={{ maxWidth: 600 }}>
                    <h6 className="fw-bold mb-2">System Status Check</h6>
                    <button
                      className="btn btn-sm btn-zen-secondary mb-2"
                      onClick={handleCheck}
                      disabled={state === "loading"}
                    >
                      {state === "loading" ? "Loading…" : "Check System"}
                    </button>

                    {state === "error" && (
                      <div className="alert alert-danger py-2 px-3 mt-2" role="alert">
                        <h6 className="alert-heading mb-1 small">Status: Offline</h6>
                        <p className="mb-0 small">{error ?? "Unable to connect to TokTickIT API server"}</p>
                      </div>
                    )}

                    {state === "loading" && (
                      <div className="alert alert-info py-2 px-3 mt-2" role="alert">
                        <h6 className="alert-heading mb-1 small">Status: Loading...</h6>
                        <p className="mb-0 small">Loading categories...</p>
                      </div>
                    )}

                    {state === "success" && (
                      <div className="alert alert-success py-2 px-3 mt-2" role="alert">
                        <h6 className="alert-heading mb-1 small">Status: Online</h6>
                        <p className="mb-0 small">{error ?? "Connected to TokTickIT API server"}</p>
                        <ul className="list-group list-group-flush mt-2 small">
                          {categories.map((cat) => (
                            <li key={cat.id} className="list-group-item bg-transparent py-1 px-0">
                              {cat.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}

