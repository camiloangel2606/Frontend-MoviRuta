export interface TarjetaActiva {
  id: string;
  saldo: number;
  tipo: string;
}

export interface ReferenciaTransaccion {
  referencia: string;
  monto: number;
  descripcion: string;
}
