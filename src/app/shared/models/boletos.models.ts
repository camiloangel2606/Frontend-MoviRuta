export interface Persona {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
}

export interface Ciudadano {
  id: number;
  persona?: Persona;
  fechaNacimiento: string | null;
}

export interface Bus {
  id: number;
  placa: string;
  modelo: string;
  capacidadMaxima: number;
  estado: string;
}

export interface Ruta {
  id: number;
  nombre: string;
  tarifa: string;
}

export interface Paradero {
  id: number;
  nombre: string;
  latitud: string;
  longitud: string;
  tipo: string;
}

export interface Boleto {
  id: number;
  ciudadano: Ciudadano;
  bus: Bus;
  ruta: Ruta;
  paraderoAbordaje: Paradero;
  paraderoDescenso: Paradero | null;
  estado: 'ACTIVO' | 'COMPLETADO';
  costo: string;
  fechaInicio: string;
  fechaFin: string | null;
}

export interface MetodoPagoCiudadano {
  id: number;
  ciudadano: { id: number };
  metodoPago: { id: number; nombre: string; tipo: string };
  identificador: string;
  saldo: string;
}

export interface CrearBoletoDto {
  ciudadanoId: number;
  busId: number;
  rutaId: number;
  paraderoAbordajeId: number;
  costo: number;
}