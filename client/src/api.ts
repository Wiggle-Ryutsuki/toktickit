const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Backend service is unavailable, health check failed.");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Backend service is unavailable, category fetch failed.");
  }

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

export async function loginApi(email: string, password: string): Promise<AuthUser> {
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

export async function logoutApi(): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to log out.");
  }
}

export async function getMeApi(): Promise<AuthUser> {
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

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthUser> {
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

export interface StaffTicketDto {
  id: number;
  ticketNo: string;
  summary: string;
  description?: string;
  category: { id: number; name: string; code?: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; displayName: string; email: string };
  owner: { id: number; displayName: string } | null;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "NEW" | "ASSIGNED" | "IN_PROGRESS" | "PENDING_REQUESTER" | "RESOLVED" | "CLOSED" | "CANCELLED";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueuePagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface StaffQueueResponse {
  tickets: StaffTicketDto[];
  pagination: StaffQueuePagination;
}

export interface StaffQueueParams {
  search?: string;
  categoryId?: number | string;
  status?: string;
  requestedPriority?: string;
  itPriority?: string;
  assigned?: "all" | "unassigned" | "mine" | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function getStaffTicketsApi(params: StaffQueueParams = {}): Promise<StaffQueueResponse> {
  const q = new URLSearchParams();
  if (params.search && params.search.trim()) q.set("search", params.search.trim());
  if (params.categoryId && params.categoryId !== "ALL") q.set("categoryId", String(params.categoryId));
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.requestedPriority && params.requestedPriority !== "ALL") q.set("requestedPriority", params.requestedPriority);
  if (params.itPriority && params.itPriority !== "ALL") q.set("itPriority", params.itPriority);
  if (params.assigned && params.assigned !== "ALL" && params.assigned !== "all") q.set("assigned", params.assigned);
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const res = await fetch(`${API_URL}/api/v1/tickets?${q.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }

  return data;
}

export interface StaffAssigneeDto {
  id: number;
  displayName: string;
  email: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
}

export interface TicketCommentDto {
  id: number;
  ticketId: number;
  authorId: number;
  commentType: "PUBLIC" | "INTERNAL_NOTE";
  content: string;
  createdAt: string;
  author: {
    id: number;
    displayName: string;
    email: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  };
}

export interface TicketDetailFullDto {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  status: "NEW" | "ASSIGNED" | "IN_PROGRESS" | "PENDING_REQUESTER" | "RESOLVED" | "CLOSED" | "CANCELLED";
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  ticketOwner: string | null;
  ownerId: number | null;
  owner: { id: number; displayName: string; email: string; role: string } | null;
  resolutionSummary: string | null;
  requesterResolutionConfirmedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    displayName: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
    code?: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  attachments: any[];
  comments?: TicketCommentDto[];
  notes?: TicketCommentDto[];
}

export async function getStaffAssigneesApi(): Promise<StaffAssigneeDto[]> {
  const res = await fetch(`${API_URL}/api/v1/users/staff`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function getTicketDetailApi(id: number): Promise<TicketDetailFullDto> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function updateTicketOperationalApi(
  id: number,
  payload: {
    ownerId?: number | null;
    itPriority?: string;
    status?: string;
    resolutionSummary?: string;
    version: number;
  }
): Promise<TicketDetailFullDto> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function indicateResolutionApi(
  id: number
): Promise<{ success: boolean; requesterResolutionConfirmedAt: string; message: string }> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}/resolve-indication`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function getCommentsApi(id: number): Promise<TicketCommentDto[]> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}/comments`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function postCommentApi(id: number, content: string): Promise<TicketCommentDto> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function getNotesApi(id: number): Promise<TicketCommentDto[]> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}/notes`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function postNoteApi(id: number, content: string): Promise<TicketCommentDto> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export interface AdminUserDto {
  id: number;
  displayName: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserPayload {
  displayName: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
  initialPassword: string;
}

export interface UpdateAdminUserPayload {
  displayName?: string;
  email?: string;
  role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
}

export async function getAdminUsersApi(params?: {
  search?: string;
  role?: string;
}): Promise<AdminUserDto[]> {
  const q = new URLSearchParams();
  if (params?.search && params.search.trim()) q.set("search", params.search.trim());
  if (params?.role && params.role !== "ALL") q.set("role", params.role);

  const res = await fetch(`${API_URL}/api/v1/admin/users?${q.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function createAdminUserApi(payload: CreateAdminUserPayload): Promise<AdminUserDto> {
  const res = await fetch(`${API_URL}/api/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function getAdminUserByIdApi(id: number): Promise<AdminUserDto> {
  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function updateAdminUserApi(
  id: number,
  payload: UpdateAdminUserPayload
): Promise<AdminUserDto> {
  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function resetUserPasswordApi(
  id: number,
  payload: { initialPassword: string }
): Promise<{ message: string; userId: number; mustChangePassword: boolean }> {
  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = data?.error?.code;
    throw error;
  }
  return data;
}

