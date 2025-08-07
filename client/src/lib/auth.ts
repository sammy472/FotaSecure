import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  role?: string;
}

export async function loginUser(credentials: LoginCredentials) {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  return await response.json();
}

export async function registerUser(data: RegisterData) {
  const response = await apiRequest("POST", "/api/auth/register", data);
  return await response.json();
}

export function getAuthHeaders(token: string) {
  return {
    "Authorization": `Bearer ${token}`,
  };
}
