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
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}
