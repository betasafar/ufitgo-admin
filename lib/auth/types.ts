export interface AdminProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AdminLoginResponse {
  access_token: string;
  admin: AdminProfile;
  access_token_expires_in: number;
  session: AdminSession;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AdminSession {
  id: string;
  current: boolean;
  userAgent: string;
  ipAddress: string;
  rememberMe: boolean;
  createdAt: string;
  lastUsedAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
}
