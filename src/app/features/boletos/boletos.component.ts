import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// Importaciones requeridas de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-boletos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule
  ],
  templateUrl: './boletos.component.html',
  styleUrls: ['./boletos.component.scss']
})
export class BoletosComponent implements OnInit {
  // Historial operativo de la tabla
  public boletos: any[] = [];
  public displayedColumns: string[] = ['id', 'ciudadano', 'bus', 'ruta', 'estado', 'costo', 'acciones'];

  // Listas dinámicas de catálogos
  public rutasDisponibles: any[] = [];
  public paraderosDisponibles: any[] = [];
  public busesDisponibles: any[] = [];
  
  // Cuenta local sincronizada con el Backend
  public metodosPago: any[] = [
    { identificador: '1234-5678-9012-3456', saldo: 0.00 } // Inicializado en 0 hasta que cargue de DB
  ];
  public metodoPagoId: number | null = null; // ID único del registro en la base de datos

  // Modelos vinculados a los selectores [(ngModel)]
  public busSeleccionadoId: number | null = null;
  public rutaSeleccionadaId: number | null = null;
  public paraderoAbordajeId: number | null = null;

  // ID del ciudadano en sesión para pruebas (Filtro Personal)
  public usuarioSesionId: number = 5; 

  // URL base de tu API Backend
  private API_URL = 'http://localhost:3000'; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.consultarServiciosBackend();
    this.cargarRutasBackend();
    this.cargarParaderosBackend();
    this.cargarBusesBackend();
    this.obtenerSaldoRealBackend(); // Carga el saldo persistido del ciudadano
  }

  // 1. Obtiene el saldo real persistido desde la base de datos
  public obtenerSaldoRealBackend(): void {
    this.http.get<any[]>(`${this.API_URL}/metodo-pago-ciudadano?ciudadanoId=${this.usuarioSesionId}`).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const tarjetaActiva = data[0];
          this.metodoPagoId = tarjetaActiva.id; // Almacenamos el ID de la tabla para el PATCH posterior
          this.metodosPago = [{
            identificador: tarjetaActiva.identificador,
            saldo: parseFloat(tarjetaActiva.saldo)
          }];
          console.log('Saldo real sincronizado:', this.metodosPago[0].saldo);
        }
      },
      error: (err) => console.error('Error al consultar saldo real de la tarjeta:', err)
    });
  }

  // 2. Filtra para ver ÚNICAMENTE tus propios boletos en la tabla
  public consultarServiciosBackend(): void {
    this.http.get<any[]>(`${this.API_URL}/boleto?ciudadanoId=${this.usuarioSesionId}`).subscribe({
      next: (data) => {
        this.boletos = data;
        console.log('Mis boletos filtrados cargados:', this.boletos);
      },
      error: (err) => console.error('Error al consultar tiquetes:', err)
    });
  }

  // 3. Trae catálogo de buses desde el backend
  public cargarBusesBackend(): void {
    this.http.get<any[]>(`${this.API_URL}/bus`).subscribe({
      next: (data) => this.busesDisponibles = data,
      error: (err) => console.error('Error al cargar catálogo de buses:', err)
    });
  }

  // 4. Trae catálogo de rutas
  public cargarRutasBackend(): void {
    this.http.get<any[]>(`${this.API_URL}/ruta`).subscribe({
      next: (data) => this.rutasDisponibles = data,
      error: (err) => console.error('Error al cargar catálogo de rutas:', err)
    });
  }

  // 5. Trae catálogo general de paraderos
  public cargarParaderosBackend(): void {
    this.http.get<any[]>(`${this.API_URL}/paradero`).subscribe({
      next: (data) => this.paraderosDisponibles = data,
      error: (err) => console.error('Error al cargar catálogo de paraderos:', err)
    });
  }

  // Filtra paraderos asignados a la ruta seleccionada
  public alCambiarRuta(): void {
    const rutaElegida = this.rutasDisponibles.find(r => r.id === this.rutaSeleccionadaId);
    if (rutaElegida && rutaElegida.paraderosEnRuta?.length > 0) {
      this.paraderosDisponibles = rutaElegida.paraderosEnRuta.map((item: any) => item.paradero);
    } else {
      this.cargarParaderosBackend();
    }
    this.paraderoAbordajeId = null;
  }

  // Crea un nuevo boleto y descuenta/persiste el saldo real en el servidor
  public registrarAbordaje(): void {
    if (!this.busSeleccionadoId || !this.rutaSeleccionadaId || !this.paraderoAbordajeId) {
      alert('Por favor, selecciona un bus, una ruta y un paradero para simular el abordaje.');
      return;
    }

    const ruta = this.rutasDisponibles.find(r => r.id === this.rutaSeleccionadaId);
    const costoFinal = ruta ? parseFloat(ruta.tarifa) : 2500.00;

    // Validación de fondos en el lado del cliente
    if (this.metodosPago[0].saldo < costoFinal) {
      alert('Transacción rechazada: Saldo insuficiente en la tarjeta inteligente.');
      return;
    }

    const nuevoBoletoDto = {
      ciudadanoId: Number(this.usuarioSesionId),
      busId: Number(this.busSeleccionadoId),
      rutaId: Number(this.rutaSeleccionadaId),
      paraderoAbordajeId: Number(this.paraderoAbordajeId),
      costo: costoFinal
    };

    // Primero guardamos el boleto de abordaje
    this.http.post(`${this.API_URL}/boleto`, nuevoBoletoDto).subscribe({
      next: () => {
        this.consultarServiciosBackend(); // Refresca el historial de viajes de la tabla
        
        // Calculamos el remanente de saldo
        const nuevoSaldoCalculado = this.metodosPago[0].saldo - costoFinal;

        // Construcción del DTO de actualización para el método de pago
        const updateSaldoDto = {
          ciudadanoId: Number(this.usuarioSesionId),
          metodoPagoId: 1, // Tipo de método predeterminado (Tarjeta)
          identificador: this.metodosPago[0].identificador,
          saldo: nuevoSaldoCalculado
        };

        // Realizamos el PATCH al id del método de pago recuperado para guardarlo en DB
        const idTransaccion = this.metodoPagoId || this.usuarioSesionId;
        this.http.patch(`${this.API_URL}/metodo-pago-ciudadano/${idTransaccion}`, updateSaldoDto).subscribe({
          next: () => {
            // Sincronizamos la UI local sólo tras la confirmación exitosa del servidor
            this.metodosPago[0].saldo = nuevoSaldoCalculado;
            console.log('Saldo debitado y guardado en la base de datos de manera definitiva.');
          },
          error: (err) => console.error('Error al persistir el nuevo saldo en el servidor:', err)
        });

        // Limpieza de campos del formulario
        this.busSeleccionadoId = null;
        this.rutaSeleccionadaId = null;
        this.paraderoAbordajeId = null;
      },
      error: (err) => console.error('Error al crear el boleto de abordaje:', err)
    });
  }

  // Ejecuta un PATCH directo al ID con el Body DTO exacto de Postman para el descenso
  public registrarDescenso(boleto: any): void {
    const updateBoletoDto = {
      paraderoDescensoId: 3, 
      estado: 'COMPLETADO',
      fechaFin: new Date().toISOString()
    };

    this.http.patch(`${this.API_URL}/boleto/${boleto.id}`, updateBoletoDto).subscribe({
      next: () => {
        this.consultarServiciosBackend(); // Refresca tu lista personal de la tabla
        alert(`Boleto #${boleto.id} finalizado exitosamente.`);
      },
      error: (err) => {
        console.error('Error al registrar el descenso:', err);
        alert('Ocurrió un error al intentar actualizar el boleto.');
      }
    });
  }
}