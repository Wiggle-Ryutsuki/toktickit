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
