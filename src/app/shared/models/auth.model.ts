//Modelos para la autenticacion, de esta forma typescript nos asegura tipos, IDEs dan autocompletado
//ej:loginRequest el frontend sabe que enviar al backend
//ej:loginResponse el frontend sabe que esperar del backend


export interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken: string;
}

export interface LoginResponse {
  token: string | null;
  requires2FA: boolean;
  email: string;
  message?: string;
}

export interface Verify2faRequest {
  email: string;
  code: string;
}

export interface Verify2faResponse {
  token: string;
  email: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
  recaptchaToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}
