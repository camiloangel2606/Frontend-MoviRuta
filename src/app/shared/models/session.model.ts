/**
 * Modelo de sesión del usuario
 * 
 * Representa una sesión activa en el sistema.
 * Un usuario puede tener múltiples sesiones (múltiples dispositivos).
 */

import { User } from './user.model';

export interface Session {
  id: string;
  token: string;
  expiration: string;        // Fecha ISO de expiración
  user: User;
  // Campos futuros para mejorar UX:
  // userAgent?: string;      // Navegador/dispositivo
  // ipAddress?: string;      // IP de conexión
  // lastActivity?: string;   // Última actividad
  // location?: string;       // Ubicación aproximada
}

/**
 * Respuesta del endpoint logout
 */
export interface LogoutResponse {
  message: string;
}
