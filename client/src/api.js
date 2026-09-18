const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export async function checkSystem() {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) {
        throw new Error("Backend service is unavailable, health check failed.");
    }
    const categoriesRes = await fetch(`${API_URL}/api/categories`);
    if (!categoriesRes.ok) {
        throw new Error("Backend service is unavailable, category fetch failed.");
    }
    const categories = await categoriesRes.json();
    return { online: true, categories };
}
export async function loginApi(email, password) {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to log in.");
    }
    return data.user;
}
export async function logoutApi() {
    const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
    });
    if (!res.ok) {
        throw new Error("Failed to log out.");
    }
}
export async function getMeApi() {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error?.message || "Not authenticated.");
    }
    return data.user;
}
export async function changePasswordApi(currentPassword, newPassword, confirmPassword) {
    const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to change password.");
    }
    return data.user;
}
export async function getStaffTicketsApi(params = {}) {
    const q = new URLSearchParams();
    if (params.search && params.search.trim())
        q.set("search", params.search.trim());
    if (params.categoryId && params.categoryId !== "ALL")
        q.set("categoryId", String(params.categoryId));
    if (params.status && params.status !== "ALL")
        q.set("status", params.status);
    if (params.requestedPriority && params.requestedPriority !== "ALL")
        q.set("requestedPriority", params.requestedPriority);
    if (params.itPriority && params.itPriority !== "ALL")
        q.set("itPriority", params.itPriority);
    if (params.assigned && params.assigned !== "ALL" && params.assigned !== "all")
        q.set("assigned", params.assigned);
    if (params.sortBy)
        q.set("sortBy", params.sortBy);
    if (params.sortOrder)
        q.set("sortOrder", params.sortOrder);
    if (params.page)
        q.set("page", String(params.page));
    if (params.limit)
        q.set("limit", String(params.limit));
    const res = await fetch(`${API_URL}/api/v1/tickets?${q.toString()}`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function getStaffAssigneesApi() {
    const res = await fetch(`${API_URL}/api/v1/users/staff`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function getTicketDetailApi(id) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function updateTicketOperationalApi(id, payload) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function indicateResolutionApi(id) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}/resolve-indication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function getCommentsApi(id) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}/comments`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function postCommentApi(id, content) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function getNotesApi(id) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}/notes`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function postNoteApi(id, content) {
    const res = await fetch(`${API_URL}/api/v1/tickets/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function getAdminUsersApi(params) {
    const q = new URLSearchParams();
    if (params?.search && params.search.trim())
        q.set("search", params.search.trim());
    if (params?.role && params.role !== "ALL")
        q.set("role", params.role);
    const res = await fetch(`${API_URL}/api/v1/admin/users?${q.toString()}`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function createAdminUserApi(payload) {
    const res = await fetch(`${API_URL}/api/v1/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function getAdminUserByIdApi(id) {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
        method: "GET",
        credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function updateAdminUserApi(id, payload) {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
export async function resetUserPasswordApi(id, payload) {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data?.error?.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.code = data?.error?.code;
        throw error;
    }
    return data;
}
