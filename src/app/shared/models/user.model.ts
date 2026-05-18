// Modelo del usuario autenticado
// ¿Por qué separado? Un usuario es una entidad diferente a la autenticación

export interface User {
  id: string;
  name: string;                          // Backend envía "name", no firstName + lastName
  email: string;
  authProvider?: 'LOCAL' | 'GOOGLE' | 'GITHUB' | 'MICROSOFT';  // Proveedor OAuth
  role?: 'USER' | 'ADMIN';               // Opcional: se obtiene de /api/user-role/my-roles
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Perfil separado del Usuario (relación 1:1 en backend)
export interface Profile {
  id: string;
  phone?: string;
  photo?: string;
  user: User;
  fechaNacimiento?: string | Date;
  birthday?: string | Date;
}

export interface UserProfile extends User {
  // Datos adicionales del perfil del usuario
  avatar?: string;
  bio?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}
