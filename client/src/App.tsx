import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;
  const [error, setError] = useState<string | null>(null);
  void error;

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
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {/* For Issue 2: Useful error message if backend is unavailable */}

      {/* Success */}
      {state === "success" &&
      <div className="alert alert-success mt-4" role="alert">
        <h5 className="alert-heading mb-1">
          Status: Online
        </h5>
        <p className="mb-0">
          {error ?? "Connected to TokTickIT API server"}
        </p>
      </div>}

      {/* Error */}
      {state === "error" && 
      <div className="alert alert-danger mt-4" role="alert">
        <h5 className="alert-heading mb-1">
          Status: Offline
        </h5>
        <p className="mb-0">
          {error ?? "Unable to connect to TokTickIT API server"}
        </p>
      </div>}

      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
    </div>
  );
}
