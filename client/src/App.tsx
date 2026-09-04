import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import Navbar from "./components/Navbar.js";
import RequesterSelector from "./components/RequesterSelector.js";
import "./theme.css";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

function AppContent() {
  const { selectedRequester, isSelectorOpen } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
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
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-page-bg)" }}>
      <Navbar />

      {(!selectedRequester || isSelectorOpen) && <RequesterSelector />}

      <main className="container py-4 flex-grow-1" style={{ maxWidth: 800 }}>
        {selectedRequester && (
          <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-4" role="status">
            <div>
              <span className="fw-semibold">Active Requester Context:</span> {selectedRequester.displayName} ({selectedRequester.email})
            </div>
            <span className="badge bg-success">Role: {selectedRequester.role}</span>
          </div>
        )}

        <div className="zen-card p-4 mb-4">
          <h2 className="h4 mb-3 fw-bold" style={{ color: "var(--color-primary-green)" }}>
            System Status Check
          </h2>
          <p className="text-muted small mb-3">
            Verify backend database and API connectivity from Lab 1 baseline.
          </p>

          <button
            className="btn btn-zen-primary"
            onClick={handleCheck}
            disabled={state === "loading"}
          >
            {state === "loading" ? "Loading…" : "Check System"}
          </button>

          {/* Error */}
          {state === "error" && (
            <div className="alert alert-danger mt-4" role="alert">
              <h5 className="alert-heading mb-1">Status: Offline</h5>
              <p className="mb-0">{error ?? "Unable to connect to TokTickIT API server"}</p>
            </div>
          )}

          {/* Loading */}
          {state === "loading" && (
            <div className="alert alert-info mt-4" role="alert">
              <h5 className="alert-heading mb-1">Status: Loading...</h5>
              <p className="mb-0">Loading categories...</p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <>
              <div className="alert alert-success mt-4" role="alert">
                <h5 className="alert-heading mb-1">Status: Online</h5>
                <p className="mb-0">{error ?? "Connected to TokTickIT API server"}</p>
              </div>
              <h6 className="mt-3">Categories ({categories.length})</h6>
              <ul className="list-group mt-3">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item">
                    {cat.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
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

