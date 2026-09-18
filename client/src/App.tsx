import { useState, useContext, useEffect } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AuthContext } from "./context/AuthContext.js";
import Navbar from "./components/Navbar.js";
import RequesterSelector from "./components/RequesterSelector.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";
import RequesterTicketDetail from "./components/RequesterTicketDetail.js";
import Login from "./components/Login.js";
import ChangePassword from "./components/ChangePassword.js";
import StaffTicketQueue from "./components/StaffTicketQueue.js";
import StaffTicketDetail from "./components/StaffTicketDetail.js";
import UserManagement from "./components/UserManagement.js";
import "./theme.css";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export type ViewType = "tickets" | "create-ticket" | "ticket-detail" | "change-password" | "queue" | "admin";

function AppContent() {
  const auth = useContext(AuthContext);
  const { selectedRequester, isSelectorOpen } = useRequester();
  const [activeView, setActiveView] = useState<ViewType>(() => {
    if (typeof window !== "undefined") {
      if (window.location.hash.includes("admin")) {
        return "admin";
      }
      if (window.location.hash.includes("queue")) {
        return "queue";
      }
    }
    return "tickets";
  });
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash.includes("admin")) {
          setActiveView("admin");
        } else if (hash.includes("queue")) {
          setActiveView("queue");
        } else if (hash.includes("create-ticket")) {
          setActiveView("create-ticket");
        } else if (hash.includes("my-tickets")) {
          setActiveView("tickets");
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!auth?.user) {
      setActiveView("tickets");
      setSelectedTicketId(null);
      return;
    }
    if (auth.user.role === "ADMINISTRATOR") {
      if (typeof window !== "undefined" && window.location.hash.includes("admin")) {
        setActiveView("admin");
      } else {
        setActiveView("queue");
      }
      setSelectedTicketId(null);
    } else if (auth.user.role === "IT_STAFF") {
      setActiveView("queue");
      setSelectedTicketId(null);
    } else {
      setActiveView("tickets");
      setSelectedTicketId(null);
    }
  }, [auth?.user?.id]);

  const handleNavigate = (view: ViewType) => {
    if (view !== "ticket-detail") {
      setSelectedTicketId(null);
    }
    setActiveView(view);
    if (typeof window !== "undefined") {
      if (view === "admin") {
        window.location.hash = "#/admin/users";
      } else if (view === "queue") {
        window.location.hash = "#/queue";
      } else if (view === "tickets") {
        window.location.hash = "#/my-tickets";
      } else if (view === "create-ticket") {
        window.location.hash = "#/create-ticket";
      }
    }
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

  // If AuthContext is active in tree (browser execution or auth test)
  if (auth) {
    if (auth.isLoading) {
      return (
        <div
          className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
          style={{ backgroundColor: "var(--color-page-bg, #f5f7f6)" }}
        >
          <div className="spinner-border text-success" role="status" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (!auth.isAuthenticated) {
      return <Login />;
    }

    if (auth.user?.mustChangePassword) {
      return <ChangePassword />;
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column pb-5 pb-md-0" style={{ backgroundColor: "var(--color-page-bg)" }}>
      <Navbar activeView={activeView} onNavigate={handleNavigate} />

      {(!selectedRequester || isSelectorOpen) && <RequesterSelector />}

      {activeView === "change-password" ? (
        <div className="container py-4 d-flex justify-content-center">
          <ChangePassword
            onSuccess={() => setActiveView(auth?.user?.role === "REQUESTER" ? "tickets" : "queue")}
            onCancel={() => setActiveView(auth?.user?.role === "REQUESTER" ? "tickets" : "queue")}
          />
        </div>
      ) : activeView === "ticket-detail" && selectedTicketId !== null ? (
        auth?.user && (auth.user.role === "IT_STAFF" || auth.user.role === "ADMINISTRATOR") ? (
          <StaffTicketDetail
            ticketId={selectedTicketId}
            onBack={() => {
              setSelectedTicketId(null);
              setActiveView("queue");
            }}
          />
        ) : (
          <RequesterTicketDetail
            ticketId={selectedTicketId}
            onBack={() => {
              setSelectedTicketId(null);
              setActiveView("tickets");
            }}
          />
        )
      ) : activeView === "create-ticket" ? (
        <CreateTicket
          onCancel={() => setActiveView(auth?.user?.role === "REQUESTER" ? "tickets" : "queue")}
          onViewDetail={handleViewDetail}
        />
      ) : activeView === "queue" ? (
        <StaffTicketQueue
          onViewDetail={handleViewDetail}
          onNavigate={handleNavigate}
        />
      ) : activeView === "admin" ? (
        <UserManagement
          onNavigate={handleNavigate}
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

