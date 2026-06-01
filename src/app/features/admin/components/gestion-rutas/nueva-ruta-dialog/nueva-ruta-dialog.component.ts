import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, FormArray,
  FormControl, ReactiveFormsModule, Validators, AbstractControl
} from '@angular/forms';
import {
  MatDialogRef, MatDialogModule
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { RutaService, Paradero } from '../../../services/ruta.service';
import { ToastService } from '../../../../../core/services/toast.service';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-nueva-ruta-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './nueva-ruta-dialog.component.html',
  styleUrl: './nueva-ruta-dialog.component.scss',
})
export class NuevaRutaDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapaDiv') mapaDiv!: ElementRef;

  form: FormGroup;
  busquedaCtrl = new FormControl<string>('');
  todosLosParaderos: Paradero[] = [];
  paraderosFiltrados: Paradero[] = [];
  isCargandoParaderos = false;
  isGuardando = false;

  private mapa: L.Map | null = null;
  private polyline: L.Polyline | null = null;
  private markers: L.Marker[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NuevaRutaDialogComponent>,
    private rutaService: RutaService,
    private toast: ToastService,
    private ngZone: NgZone,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      tarifa: [null as number | null, [Validators.required, Validators.min(0)]],
      paraderos: this.fb.array([]),
    });
  }

  get paraderosFormArray(): FormArray {
    return this.form.get('paraderos') as FormArray;
  }

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  ngOnInit(): void {
    this.cargarParaderos();
    this.configurarBusqueda();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.ngZone.runOutsideAngular(() => this.initMap());
    }, 400);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mapa?.remove();
    this.mapa = null;
  }

  private cargarParaderos(): void {
    this.isCargandoParaderos = true;
    this.rutaService.getParaderos().subscribe({
      next: (paraderos) => {
        this.todosLosParaderos = paraderos;
        this.paraderosFiltrados = paraderos.slice(0, 20);
        this.isCargandoParaderos = false;
      },
      error: () => {
        this.isCargandoParaderos = false;
      },
    });
  }

  private configurarBusqueda(): void {
    this.busquedaCtrl.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$),
    ).subscribe(valor => {
      const termino = typeof valor === 'string' ? valor.toLowerCase().trim() : '';
      this.paraderosFiltrados = termino
        ? this.todosLosParaderos.filter(p => p.nombre.toLowerCase().includes(termino))
        : this.todosLosParaderos.slice(0, 20);
    });
  }

  private initMap(): void {
    if (!this.mapaDiv?.nativeElement || this.mapa) return;
    this.mapa = L.map(this.mapaDiv.nativeElement, { zoomControl: true })
      .setView([4.6, -74.08], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.mapa);
  }

  displayFn = (valor: Paradero | string | null): string => {
    if (!valor) return '';
    if (typeof valor === 'string') return valor;
    return valor.nombre;
  };

  onParaderoSelected(event: MatAutocompleteSelectedEvent): void {
    const paradero: Paradero = event.option.value;
    const yaExiste = this.paraderosFormArray.controls.some(
      c => Number(c.get('paraderoId')?.value) === paradero.id,
    );
    if (yaExiste) {
      this.toast.warning(`"${paradero.nombre}" ya está en la ruta.`);
      setTimeout(() => this.busquedaCtrl.setValue(''), 0);
      return;
    }
    this.agregarParadero(paradero);
    setTimeout(() => this.busquedaCtrl.setValue(''), 0);
  }

  private agregarParadero(paradero: Paradero): void {
    const grupo = this.fb.group({
      paraderoId: [paradero.id],
      nombre: [paradero.nombre],
      latitud: [paradero.latitud],
      longitud: [paradero.longitud],
      distanciaDesdeAnterior: [null as number | null],
      tiempoEstimadoDesdeAnterior: [null as number | null],
    });
    this.paraderosFormArray.push(grupo);
    this.ngZone.runOutsideAngular(() => this.actualizarMapa());
  }

  eliminarParadero(index: number): void {
    this.paraderosFormArray.removeAt(index);
    this.ngZone.runOutsideAngular(() => this.actualizarMapa());
  }

  moverArriba(index: number): void {
    if (index === 0) return;
    const ctrl = this.paraderosFormArray.at(index);
    this.paraderosFormArray.removeAt(index);
    this.paraderosFormArray.insert(index - 1, ctrl);
    this.ngZone.runOutsideAngular(() => this.actualizarMapa());
  }

  moverAbajo(index: number): void {
    if (index >= this.paraderosFormArray.length - 1) return;
    const ctrl = this.paraderosFormArray.at(index);
    this.paraderosFormArray.removeAt(index);
    this.paraderosFormArray.insert(index + 1, ctrl);
    this.ngZone.runOutsideAngular(() => this.actualizarMapa());
  }

  private actualizarMapa(): void {
    if (!this.mapa) return;

    this.markers.forEach(m => m.remove());
    this.markers = [];
    if (this.polyline) { this.polyline.remove(); this.polyline = null; }

    const puntos = this.paraderosFormArray.controls
      .map(c => ({
        nombre: c.get('nombre')?.value as string,
        lat: Number(c.get('latitud')?.value),
        lng: Number(c.get('longitud')?.value),
      }))
      .filter(p => p.lat && p.lng);

    puntos.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], { icon: this.crearIcono(i + 1) })
        .bindPopup(`<strong>${i + 1}. ${p.nombre}</strong>`)
        .addTo(this.mapa!);
      this.markers.push(marker);
    });

    if (puntos.length >= 2) {
      const coords: L.LatLngTuple[] = puntos.map(p => [p.lat, p.lng]);
      this.polyline = L.polyline(coords, { color: '#1775ff', weight: 4, opacity: 0.85 }).addTo(this.mapa);
      this.mapa.fitBounds(this.polyline.getBounds(), { padding: [30, 30] });
    } else if (puntos.length === 1) {
      this.mapa.setView([puntos[0].lat, puntos[0].lng], 14);
    }
  }

  private crearIcono(numero: number): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="background:#1775ff;color:#fff;border-radius:50%;
        width:28px;height:28px;display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);
        border:2px solid #fff;">${numero}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -18],
    });
  }

  get erroresParaderos(): string | null {
    const len = this.paraderosFormArray.length;
    if (len > 0 && len < 3) return `Faltan ${3 - len} paradero(s) más (mínimo 3).`;
    return null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.paraderosFormArray.length < 3) {
      this.toast.warning('Se requieren al menos 3 paraderos.');
      return;
    }
    this.isGuardando = true;
    const { nombre, descripcion, tarifa } = this.form.value;
    const paraderos = this.paraderosFormArray.controls.map((c, i) => {
      const v = c.value;
      const item: any = { paraderoId: v.paraderoId, orden: i + 1 };
      if (v.distanciaDesdeAnterior != null && v.distanciaDesdeAnterior !== '') {
        item.distanciaDesdeAnterior = Number(v.distanciaDesdeAnterior);
      }
      if (v.tiempoEstimadoDesdeAnterior != null && v.tiempoEstimadoDesdeAnterior !== '') {
        item.tiempoEstimadoDesdeAnterior = Number(v.tiempoEstimadoDesdeAnterior);
      }
      return item;
    });
    const dto: any = { nombre: nombre.trim(), tarifa: Number(tarifa), paraderos };
    if (descripcion?.trim()) dto.descripcion = descripcion.trim();

    this.rutaService.crearRutaConParaderos(dto).subscribe({
      next: (ruta) => {
        this.isGuardando = false;
        this.dialogRef.close(ruta);
      },
      error: () => {
        this.isGuardando = false;
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
