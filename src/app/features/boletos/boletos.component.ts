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
    this.http
      .get<any[]>(`${this.API}/programacion`)
      .subscribe({
        next: (d) => {
          // Solo programaciones activas: ni finalizadas ni canceladas.
          // El estado por defecto en la entidad es 'PROGRAMADO'.
          this.programaciones = (d ?? []).filter(
            (p) => p.estado !== 'FINALIZADO' && p.estado !== 'CANCELADO',
          );
        },
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

  /** Flag para mostrar el mensaje "ya estás en el último paradero" en el modal */
  public esUltimoParadero = false;

  abrirModalDescenso(boleto: any): void {
    this.boletoEnDescenso       = boleto;
    this.rutaParaderoDescensoId = null;
    this.paraderosDescensoModal = [];
    this.esUltimoParadero       = false;

    const ordenOrigen = boleto.rutaParaderoOrigen?.orden ?? -1;

    // Buscamos los paraderos de la ruta. Tres estrategias en cascada:
    //   1º La programación en caché ya trae paraderosEnRuta anidados.
    //   2º Pedimos /programacion/:id si el boleto la referencia.
    //   3º El boleto es huérfano (programacion=null) → sacamos la rutaId
    //      desde rutaParaderoOrigen y consultamos /ruta/:id/paraderos.
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

    // Boleto huérfano — pedir el RutaParadero para obtener la rutaId
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
        // IMPORTANTE: GET /ruta/:id/paraderos no incluye el id del RutaParadero
        // (solo trae orden + paradero anidado). Para poder hacer el PATCH del
        // descenso necesitamos GET /ruta-paradero (lista global) y filtrar
        // client-side por rutaId — ese sí trae el id de cada RutaParadero.
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

  /** Filtra los paraderos a los que el ciudadano puede bajarse (orden > origen),
   *  los ordena y los normaliza al formato del dropdown. Marca `esUltimoParadero`
   *  cuando la lista filtrada queda vacía pero SÍ existe la ruta. */
  private aplicarParaderosFiltrados(items: any[], ordenOrigen: number): void {
    console.warn('========== [Descenso] DEBUG ==========');
    console.warn('[Descenso] cantidad items:', items?.length ?? 0);
    console.warn('[Descenso] ordenOrigen:', ordenOrigen);
    console.warn('[Descenso] PRIMER item (estructura completa):',
      items?.[0] ? JSON.stringify(items[0], null, 2) : 'NO HAY ITEMS');
    console.warn('[Descenso] CAMPOS del primer item:',
      items?.[0] ? Object.keys(items[0]) : []);
    console.warn('======================================');

    const todosOrdenados = [...items].sort(
      (a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0),
    );

    const posteriores = todosOrdenados.filter(
      (item: any) => (item.orden ?? 0) > ordenOrigen,
    );

    this.paraderosDescensoModal = posteriores.map((item: any) => {
      // El id del RutaParadero puede venir con distintos nombres según el endpoint:
      //   - `id` cuando viene de /ruta/:id/paraderos (RutaParadero entity)
      //   - `rutaParaderoId` si el backend lo expone con ese alias
      //   - dentro de objeto anidado en algunos formatos
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
    }).filter((p) => p.rutaParaderoId != null); // descarta los que no tengan id válido

    console.log('[Descenso] paraderos normalizados:', this.paraderosDescensoModal);

    // Si la ruta tiene paraderos pero ninguno es posterior, el ciudadano
    // abordó en el último — no hay descenso posible posterior.
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

  /** Marca un paradero como seleccionado — solo uno a la vez. */
  seleccionarParaderoDescenso(rutaParaderoId: number | null | undefined): void {
    if (rutaParaderoId == null) return;
    this.rutaParaderoDescensoId = Number(rutaParaderoId);
  }

  /** Handler del <select> nativo. Con [ngValue] numérico, Angular guarda en
   *  target.value un string interno con prefijo de índice ("2: 10"), pero el
   *  ngModel ya recibe el número correcto — NO normalizar desde target.value
   *  porque Number("2: 10") = NaN y rompería el botón Confirmar. */
  onChangeParaderoDescenso(_evt: Event): void {
    // ngModel ya tiene el valor correcto; nada que hacer aquí.
  }

  /** Comparación robusta para destacar la card seleccionada.
   *  Evita el bug de "todas seleccionadas" cuando ambos lados son undefined/null. */
  esParaderoSeleccionado(rutaParaderoId: number | null | undefined): boolean {
    if (rutaParaderoId == null || this.rutaParaderoDescensoId == null) return false;
    return Number(this.rutaParaderoDescensoId) === Number(rutaParaderoId);
  }

  /** trackBy para *ngFor — mejora rendering y previene re-creación de cards. */
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