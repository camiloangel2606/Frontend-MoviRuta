import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

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
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatButtonModule, MatIconModule, MatTableModule, MatTabsModule,
  ],
  templateUrl: './boletos.component.html',
  styleUrls: ['./boletos.component.scss'],
})
export class BoletosComponent implements OnInit {

  // ── Tabla ─────────────────────────────────────────────────────────────────
  public boletos: any[] = [];
  public displayedColumns = [
    'id', 'ruta', 'bus', 'conductor', 'origen', 'destino', 'estado', 'costo', 'acciones',
  ];

  // ── Catálogos ─────────────────────────────────────────────────────────────
  public programaciones: any[]       = [];
  /** RutaParaderos de la programación elegida, ordenados por `orden` */
  public paraderosDeRuta: any[]      = [];
  /** Solo paraderos con orden MAYOR al origen elegido */
  public paraderosDestino: any[]     = [];

  // ── Método de pago ────────────────────────────────────────────────────────
  public metodosPago: any[]          = [{ identificador: '—', saldo: 0 }];
  public metodoPagoId: number | null = null;

  // ── Modelos del formulario de abordaje ────────────────────────────────────
  public programacionId: number | null      = null;
  public rutaParaderoOrigenId: number | null = null;

  // ── Estado del modal de descenso ──────────────────────────────────────────
  public mostrarModalDescenso              = false;
  public boletoEnDescenso: any | null      = null;
  public paraderosDescensoModal: any[]     = [];
  public rutaParaderoDescensoId: number | null = null;

  // ── Sesión ────────────────────────────────────────────────────────────────
  public usuarioSesionId = 5;

  private API = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarBoletos();
    this.cargarProgramaciones();
    this.cargarSaldo();
  }

  // ── Carga inicial ─────────────────────────────────────────────────────────

  cargarBoletos(): void {
    this.http
      .get<any[]>(`${this.API}/boleto?ciudadanoId=${this.usuarioSesionId}`)
      .subscribe({
        next:  (d) => (this.boletos = d),
        error: (e) => console.error('Error boletos:', e),
      });
  }

  cargarProgramaciones(): void {
    // Solo programaciones ACTIVAS
    this.http
      .get<any[]>(`${this.API}/programacion?estado=ACTIVO`)
      .subscribe({
        next:  (d) => (this.programaciones = d),
        error: (e) => console.error('Error programaciones:', e),
      });
  }

  cargarSaldo(): void {
    this.http
      .get<any[]>(`${this.API}/metodo-pago-ciudadano?ciudadanoId=${this.usuarioSesionId}`)
      .subscribe({
        next: (d) => {
          if (d?.length > 0) {
            this.metodoPagoId = d[0].id;
            this.metodosPago  = [{ identificador: d[0].identificador, saldo: parseFloat(d[0].saldo) }];
          }
        },
        error: (e) => console.error('Error saldo:', e),
      });
  }

  // ── Selección de programación → carga paraderos ───────────────────────────

  alSeleccionarProgramacion(): void {
    this.rutaParaderoOrigenId = null;
    this.paraderosDeRuta      = [];
    this.paraderosDestino     = [];

    const prog = this.programaciones.find((p) => p.id === this.programacionId);
    if (!prog?.ruta?.paraderosEnRuta?.length) return;

    this.paraderosDeRuta = [...prog.ruta.paraderosEnRuta]
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((item: any) => ({
        rutaParaderoId: item.id,        // id de RutaParadero — lo enviamos al backend
        paraderoId:     item.paradero.id,
        nombre:         item.paradero.nombre,
        tipo:           item.paradero.tipo,
        orden:          item.orden,
      }));
  }

  // ── HU-ENTR-2-003: Registrar Abordaje ────────────────────────────────────

  registrarAbordaje(): void {
    if (!this.programacionId || !this.rutaParaderoOrigenId || !this.metodoPagoId) {
      alert('Selecciona una programación, un paradero de origen y verifica tu método de pago.');
      return;
    }

    const payload = {
      ciudadanoId:          this.usuarioSesionId,
      programacionId:       this.programacionId,
      rutaParaderoOrigenId: this.rutaParaderoOrigenId,
      metodoPagoId:         this.metodoPagoId,
    };

    this.http.post(`${this.API}/boleto`, payload).subscribe({
      next: () => {
        this.cargarBoletos();
        this.cargarSaldo();
        this.programacionId       = null;
        this.rutaParaderoOrigenId = null;
        this.paraderosDeRuta      = [];
      },
      error: (e) => {
        console.error('Error al registrar abordaje:', e);
        alert(e?.error?.message ?? 'Error al registrar el abordaje.');
      },
    });
  }

  // ── HU-ENTR-2-004: Modal de Descenso ─────────────────────────────────────

  abrirModalDescenso(boleto: any): void {
    this.boletoEnDescenso        = boleto;
    this.rutaParaderoDescensoId  = null;
    this.paraderosDescensoModal  = [];

    // Obtenemos los paraderosEnRuta de la programación del boleto
    const prog = this.programaciones.find(
      (p) => p.id === boleto.programacion?.id,
    );

    const paraderosEnRuta: any[] = prog?.ruta?.paraderosEnRuta ?? [];
    const ordenOrigen            = boleto.rutaParaderoOrigen?.orden ?? -1;

    this.paraderosDescensoModal = paraderosEnRuta
      .filter((item: any) => item.orden > ordenOrigen)
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((item: any) => ({
        rutaParaderoId: item.id,
        nombre:         item.paradero.nombre,
        tipo:           item.paradero.tipo,
        orden:          item.orden,
      }));

    // Si la programación no estaba en caché, la pedimos al backend
    if (!prog) {
      this.http
        .get<any>(`${this.API}/programacion/${boleto.programacion?.id}`)
        .subscribe({
          next: (p) => {
            const items      = p?.ruta?.paraderosEnRuta ?? [];
            const ordenOrig  = boleto.rutaParaderoOrigen?.orden ?? -1;
            this.paraderosDescensoModal = items
              .filter((i: any) => i.orden > ordenOrig)
              .sort((a: any, b: any) => a.orden - b.orden)
              .map((i: any) => ({
                rutaParaderoId: i.id,
                nombre:         i.paradero.nombre,
                tipo:           i.paradero.tipo,
                orden:          i.orden,
              }));
            this.mostrarModalDescenso = true;
          },
          error: (e) => console.error('Error al cargar programación:', e),
        });
      return;
    }

    this.mostrarModalDescenso = true;
  }

  cerrarModalDescenso(): void {
    this.mostrarModalDescenso   = false;
    this.boletoEnDescenso       = null;
    this.rutaParaderoDescensoId = null;
    this.paraderosDescensoModal = [];
  }

  confirmarDescenso(): void {
    if (!this.rutaParaderoDescensoId || !this.boletoEnDescenso) return;

    this.http
      .patch(`${this.API}/boleto/${this.boletoEnDescenso.id}`, {
        rutaParaderoDescensoId: this.rutaParaderoDescensoId,
      })
      .subscribe({
        next: () => {
          this.cargarBoletos();
          this.cerrarModalDescenso();
        },
        error: (e) => {
          console.error('Error al registrar descenso:', e);
          alert(e?.error?.message ?? 'Error al registrar el descenso.');
        },
      });
  }
}