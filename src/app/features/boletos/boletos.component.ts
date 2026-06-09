import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../core/services/auth.service';

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
  public paraderosDeRuta: any[]      = [];
  public paraderosDestino: any[]     = [];

  // ── Métodos de pago del usuario en sesión ─────────────────────────────────
  public metodosPagoCiudadano: any[] = [];
  public metodoPagoSeleccionadoId: number | null = null;

  // ── Modelos del formulario de abordaje ────────────────────────────────────
  public programacionId: number | null      = null;
  public rutaParaderoOrigenId: number | null = null;

  // ── Estado del modal de descenso ──────────────────────────────────────────
  public mostrarModalDescenso              = false;
  public boletoEnDescenso: any | null      = null;
  public paraderosDescensoModal: any[]     = [];
  public rutaParaderoDescensoId: number | null = null;

  // ── Sesión — se resuelve dinámicamente en ngOnInit ────────────────────────
  public ciudadanoId: number | null = null;
  public cargandoSesion = true;

  private API = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.resolverCiudadano();
    this.cargarProgramaciones();
  }

  // ── Resolución del ciudadano en sesión ────────────────────────────────────

  private resolverCiudadano(): void {
    const securityUserId = this.auth.getCurrentUser()?.id;
    if (!securityUserId) {
      this.cargandoSesion = false;
      return;
    }

    this.http.get<any>(`${this.API}/persona/security/${securityUserId}`).subscribe({
      next: (persona) => {
        this.ciudadanoId = persona?.ciudadanoId ?? null;
        this.cargandoSesion = false;
        if (this.ciudadanoId) {
          this.cargarBoletos();
          this.cargarMetodosPago();
        }
      },
      error: (e) => {
        console.error('Error al resolver ciudadano:', e);
        this.cargandoSesion = false;
      },
    });
  }

  // ── Carga inicial ─────────────────────────────────────────────────────────

  cargarBoletos(): void {
    if (!this.ciudadanoId) return;
    this.http
      .get<any[]>(`${this.API}/boleto?ciudadanoId=${this.ciudadanoId}`)
      .subscribe({
        next:  (d) => (this.boletos = d),
        error: (e) => console.error('Error boletos:', e),
      });
  }

  cargarMetodosPago(): void {
    if (!this.ciudadanoId) return;
    this.http
      .get<any[]>(`${this.API}/metodo-pago-ciudadano?ciudadanoId=${this.ciudadanoId}`)
      .subscribe({
        next: (d) => {
          this.metodosPagoCiudadano = d ?? [];
          // Pre-seleccionar el primero si solo hay uno
          if (this.metodosPagoCiudadano.length === 1) {
            this.metodoPagoSeleccionadoId = this.metodosPagoCiudadano[0].id;
          }
        },
        error: (e) => console.error('Error métodos de pago:', e),
      });
  }

  cargarProgramaciones(): void {
    this.http
      .get<any[]>(`${this.API}/programacion`)
      .subscribe({
        next: (d) => {
          this.programaciones = (d ?? []).filter(
            (p) => p.estado !== 'FINALIZADO' && p.estado !== 'CANCELADO',
          );
        },
        error: (e) => console.error('Error programaciones:', e),
      });
  }

  // ── Helper para la tarjeta de saldo del método seleccionado ──────────────

  get metodoPagoSeleccionado(): any | null {
    if (!this.metodoPagoSeleccionadoId) return null;
    return this.metodosPagoCiudadano.find(m => m.id === this.metodoPagoSeleccionadoId) ?? null;
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
        rutaParaderoId: item.id,
        paraderoId:     item.paradero.id,
        nombre:         item.paradero.nombre,
        tipo:           item.paradero.tipo,
        orden:          item.orden,
      }));
  }

  // ── HU-ENTR-2-003: Registrar Abordaje ────────────────────────────────────

  registrarAbordaje(): void {
    if (!this.ciudadanoId) {
      alert('No se pudo identificar tu cuenta. Vuelve a iniciar sesión.');
      return;
    }
    if (!this.programacionId || !this.rutaParaderoOrigenId || !this.metodoPagoSeleccionadoId) {
      alert('Selecciona una programación, un paradero de origen y un método de pago.');
      return;
    }

    const payload = {
      ciudadanoId:          this.ciudadanoId,
      programacionId:       this.programacionId,
      rutaParaderoOrigenId: this.rutaParaderoOrigenId,
      metodoPagoId:         this.metodoPagoSeleccionadoId,
    };

    this.http.post(`${this.API}/boleto`, payload).subscribe({
      next: () => {
        this.cargarBoletos();
        this.cargarMetodosPago();
        this.programacionId          = null;
        this.rutaParaderoOrigenId    = null;
        this.metodoPagoSeleccionadoId = null;
        this.paraderosDeRuta         = [];
      },
      error: (e) => {
        console.error('Error al registrar abordaje:', e);
        alert(e?.error?.message ?? 'Error al registrar el abordaje.');
      },
    });
  }

  // ── HU-ENTR-2-004: Modal de Descenso ─────────────────────────────────────

  public esUltimoParadero = false;

  abrirModalDescenso(boleto: any): void {
    this.boletoEnDescenso       = boleto;
    this.rutaParaderoDescensoId = null;
    this.paraderosDescensoModal = [];
    this.esUltimoParadero       = false;

    const ordenOrigen = boleto.rutaParaderoOrigen?.orden ?? -1;

    const progCacheada = this.programaciones.find(
      (p) => p.id === boleto.programacion?.id,
    );

    if (progCacheada?.ruta?.paraderosEnRuta?.length) {
      this.aplicarParaderosFiltrados(progCacheada.ruta.paraderosEnRuta, ordenOrigen);
      this.mostrarModalDescenso = true;
      return;
    }

    const progId = boleto.programacion?.id;
    if (progId) {
      this.http.get<any>(`${this.API}/programacion/${progId}`).subscribe({
        next: (p) => {
          const items = p?.ruta?.paraderosEnRuta ?? [];
          this.aplicarParaderosFiltrados(items, ordenOrigen);
          this.mostrarModalDescenso = true;
        },
        error: (e) => {
          console.error('Error al cargar programación:', e);
          this.mostrarModalDescenso = true;
        },
      });
      return;
    }

    const rutaParaderoOrigenId = boleto.rutaParaderoOrigen?.id;
    if (!rutaParaderoOrigenId) {
      this.mostrarModalDescenso = true;
      return;
    }

    this.http.get<any>(`${this.API}/ruta-paradero/${rutaParaderoOrigenId}`).subscribe({
      next: (rp) => {
        const rutaId = rp?.ruta?.id ?? rp?.rutaId;
        if (!rutaId) {
          this.mostrarModalDescenso = true;
          return;
        }
        this.http.get<any[]>(`${this.API}/ruta-paradero`).subscribe({
          next: (todos) => {
            const items = (todos ?? []).filter(
              (rp: any) => Number(rp.ruta?.id ?? rp.rutaId) === Number(rutaId),
            );
            this.aplicarParaderosFiltrados(items, ordenOrigen);
            this.mostrarModalDescenso = true;
          },
          error: (e) => {
            console.error('Error al cargar ruta-paradero (lista):', e);
            this.mostrarModalDescenso = true;
          },
        });
      },
      error: (e) => {
        console.error('Error al cargar ruta-paradero:', e);
        this.mostrarModalDescenso = true;
      },
    });
  }

  private aplicarParaderosFiltrados(items: any[], ordenOrigen: number): void {
    const todosOrdenados = [...items].sort(
      (a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0),
    );

    const posteriores = todosOrdenados.filter(
      (item: any) => (item.orden ?? 0) > ordenOrigen,
    );

    this.paraderosDescensoModal = posteriores.map((item: any) => {
      const rutaParaderoId =
        item.id ?? item.rutaParaderoId ?? item.rutaParadero?.id;

      const paraderoNombre =
        item.paradero?.nombre ?? item.nombre ?? 'Paradero sin nombre';
      const paraderoTipo =
        item.paradero?.tipo ?? item.tipo;

      return {
        rutaParaderoId: rutaParaderoId != null ? Number(rutaParaderoId) : null,
        nombre:         paraderoNombre,
        tipo:           paraderoTipo,
        orden:          item.orden,
      };
    }).filter((p) => p.rutaParaderoId != null);

    this.esUltimoParadero =
      todosOrdenados.length > 0 && posteriores.length === 0;
  }

  cerrarModalDescenso(): void {
    this.mostrarModalDescenso   = false;
    this.boletoEnDescenso       = null;
    this.rutaParaderoDescensoId = null;
    this.paraderosDescensoModal = [];
    this.esUltimoParadero       = false;
  }

  seleccionarParaderoDescenso(rutaParaderoId: number | null | undefined): void {
    if (rutaParaderoId == null) return;
    this.rutaParaderoDescensoId = Number(rutaParaderoId);
  }

  onChangeParaderoDescenso(_evt: Event): void {}

  esParaderoSeleccionado(rutaParaderoId: number | null | undefined): boolean {
    if (rutaParaderoId == null || this.rutaParaderoDescensoId == null) return false;
    return Number(this.rutaParaderoDescensoId) === Number(rutaParaderoId);
  }

  trackByRutaParaderoId = (_index: number, p: any): number => p.rutaParaderoId;

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
