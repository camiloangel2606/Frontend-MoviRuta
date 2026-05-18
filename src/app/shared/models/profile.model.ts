export interface Role {
  _id: string;
  name: string;
  description: string;
}

export interface User {
  id: string; // Este es el ID de MS Security que irá a parar a tu BD de negocio
  _id?: string;
  name: string;
  email: string;
  role: Role;
}

export interface Profile {
  id: string;
  phone?: string;
  photo?: string;
  user: User; // Aquí viene embebido el usuario con su ID y su Rol
}

// Modelos para las secciones de Negocio si los necesitas en las vistas
export interface MetodoPago {
  id?: number;
  nombre: string;
  tipo: string;
  personaId: number; // Relación con tu tabla Persona local
}

export interface Direccion {
  id?: number;
  linea1: string;
  linea2?: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  personaId: number; // Relación con tu tabla Persona local
}