import {
  Component, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import { ParaderoService, Paradero } from '../../../services/paradero.service';
import { ToastService } from '../../../../../core/services/toast.service';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-nuevo-paradero-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './nuevo-paradero-dialog.component.html',
  styleUrl: './nuevo-paradero-dialog.component.scss',
})
export class NuevoParaderoDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapaDiv') mapaDiv!: ElementRef;

  form: FormGroup;
  readonly tipos: Array<Paradero['tipo']> = ['PARADERO', 'ESTACION', 'TERMINAL'];
  isGuardando = false;

  private mapa: L.Map | null = null;
  private marcador: L.Marker | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NuevoParaderoDialogComponent>,
    private paraderoService: ParaderoService,
    private toast: ToastService,
    private ngZone: NgZone,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      tipo: ['PARADERO', Validators.required],
      latitud: [{ value: null as number | null, disabled: true }],
      longitud: [{ value: null as number | null, disabled: true }],
    });
  }

  get nombre() { return this.form.get('nombre'); }
  get tipo() { return this.form.get('tipo'); }

  get coordenadasSeleccionadas(): boolean {
    const raw = this.form.getRawValue();
    return raw.latitud !== null && raw.longitud !== null;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.ngZone.runOutsideAngular(() => this.initMap());
    }, 400);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
  }

  private initMap(): void {
    if (!this.mapaDiv?.nativeElement || this.mapa) return;
    this.mapa = L.map(this.mapaDiv.nativeElement).setView([4.6, -74.08], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.mapa);

    this.mapa.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(7));
      const lng = parseFloat(e.latlng.lng.toFixed(7));

      if (this.marcador) {
        this.marcador.setLatLng([lat, lng]);
      } else {
        this.marcador = L.marker([lat, lng]).addTo(this.mapa!);
      }

      this.ngZone.run(() => {
        this.form.patchValue({ latitud: lat, longitud: lng });
      });
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.latitud === null || raw.longitud === null) {
      this.toast.warning('Seleccione la ubicación del paradero en el mapa.');
      return;
    }
    this.isGuardando = true;
    this.paraderoService.crearParadero({
      nombre: (raw.nombre as string).trim(),
      tipo: raw.tipo,
      latitud: raw.latitud,
      longitud: raw.longitud,
    }).subscribe({
      next: (paradero) => {
        this.isGuardando = false;
        this.dialogRef.close(paradero);
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
