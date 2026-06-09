import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ToastService } from '../../../../../core/services/toast.service';
import {
  ReporteDemografiaService,
  DemografiaResponse,
  RangoDemografia,
} from '../../../services/reporte-demografia.service';
import { RutaService, Ruta } from '../../../services/ruta.service';

const PALETA = ['#42A5F5', '#26A69A', '#FFA726', '#AB47BC', '#EF5350', '#9E9E9E'];

interface RutaOpcion {
  id: number | null;
  nombre: string;
}

interface FilaTabla extends Partial<RangoDemografia> {
  esTotal?: boolean;
  rango: string;
  cantidad: number;
  porcentaje: number;
  variacionVsMesAnterior?: number;
}

@Component({
  selector: 'app-reporte-demografia',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    NgxEchartsModule,
  ],
  templateUrl: './reporte-demografia.component.html',
  styleUrl: './reporte-demografia.component.scss',
})
export class ReporteDemografiaComponent implements OnInit {
  @ViewChild('chartWrapper') chartWrapper!: ElementRef<HTMLElement>;

  readonly columnas = ['rango', 'cantidad', 'porcentaje', 'variacion'];

  readonly rutaCtrl = new FormControl<number | null>(null);
  readonly fechaInicioCtrl = new FormControl<Date | null>(null);
  readonly fechaFinCtrl = new FormControl<Date | null>(null);
  readonly rangoFechas = new FormGroup({
    fechaInicio: this.fechaInicioCtrl,
    fechaFin: this.fechaFinCtrl,
  });

  rutas: RutaOpcion[] = [{ id: null, nombre: 'Todas las rutas' }];
  isLoading = false;
  datos: DemografiaResponse | null = null;
  chartOptions: EChartsOption | null = null;
  filas: FilaTabla[] = [];

  readonly chartEvents = {
    click: (event: any) => this.onChartClick(event),
  };

  constructor(
    private demografiaService: ReporteDemografiaService,
    private rutaService: RutaService,
    private toast: ToastService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicioCtrl.setValue(primerDiaMes, { emitEvent: false });
    this.fechaFinCtrl.setValue(hoy, { emitEvent: false });

    this.cargarRutas();
    this.cargar();

    this.rutaCtrl.valueChanges.subscribe(() => this.cargar());
    this.fechaInicioCtrl.valueChanges.subscribe(() => this.cargar());
    this.fechaFinCtrl.valueChanges.subscribe(() => this.cargar());
  }

  private cargarRutas(): void {
    this.rutaService.getRutas().subscribe({
      next: (rutas: Ruta[]) => {
        this.rutas = [
          { id: null, nombre: 'Todas las rutas' },
          ...rutas.map(r => ({ id: r.id, nombre: r.nombre })),
        ];
      },
      error: () => {
        this.toast.error('No se pudieron cargar las rutas.');
      },
    });
  }

  private cargar(): void {
    const fechaInicio = this.fechaInicioCtrl.value;
    const fechaFin = this.fechaFinCtrl.value;
    if (!fechaInicio || !fechaFin) return;

    this.isLoading = true;
    this.demografiaService
      .getDemografia({
        rutaId: this.rutaCtrl.value,
        fechaInicio: this.toIsoDate(fechaInicio),
        fechaFin: this.toIsoDate(fechaFin),
      })
      .subscribe({
        next: res => {
          this.datos = res;
          this.chartOptions = this.construirGrafico(res);
          this.filas = this.construirFilas(res);
          this.isLoading = false;
        },
        error: err => {
          this.isLoading = false;
          this.datos = null;
          this.chartOptions = null;
          this.filas = [];
          const msg = err?.error?.message ?? err?.message ?? 'Error al cargar datos';
          this.toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
  }

  private construirGrafico(res: DemografiaResponse): EChartsOption {
    const max = res.rangos.reduce((m, r) => Math.max(m, r.cantidad), 0);
    const data = res.rangos.map(r => ({
      name: r.cantidad === max && max > 0 ? '★ Predominante' : r.rango,
      value: r.cantidad,
      rangoOriginal: r.rango,
    }));

    return {
      color: PALETA,
      tooltip: {
        trigger: 'item',
        formatter: (p: any) =>
          `${p.data.rangoOriginal}<br/>${p.value} pasajeros (${p.percent}%)`,
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: '#555' },
      },
      series: [
        {
          name: 'Rango etario',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{d}%' },
          data,
        },
      ],
    };
  }

  private construirFilas(res: DemografiaResponse): FilaTabla[] {
    const filas: FilaTabla[] = res.rangos.map(r => ({ ...r }));
    filas.push({
      esTotal: true,
      rango: 'TOTAL',
      cantidad: res.totalPasajeros,
      porcentaje: 100,
    });
    return filas;
  }

  onChartClick(event: any): void {
    const nombre = event?.data?.rangoOriginal ?? event?.name;
    const cantidad = event?.value;
    if (nombre == null || cantidad == null) return;
    this.snackBar.open(`${nombre}: ${cantidad} pasajeros`, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  exportarPng(): void {
    if (!this.datos || !this.chartWrapper) {
      this.toast.warning('No hay datos para exportar.');
      return;
    }
    html2canvas(this.chartWrapper.nativeElement, { backgroundColor: '#ffffff' }).then(canvas => {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `demografia-${this.datos!.rango.desde}-${this.datos!.rango.hasta}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.toast.success('Gráfico exportado.');
    }).catch(() => {
      this.toast.error('No se pudo exportar el gráfico.');
    });
  }

  exportarExcel(): void {
    if (!this.datos) {
      this.toast.warning('No hay datos para exportar.');
      return;
    }
    const rows = this.datos.rangos.map(r => ({
      'Rango etario': r.rango,
      'Cantidad': r.cantidad,
      'Porcentaje': `${r.porcentaje} %`,
      'Variación vs mes anterior': this.formatearVariacion(r.variacionVsMesAnterior),
    }));
    rows.push({
      'Rango etario': 'TOTAL',
      'Cantidad': this.datos.totalPasajeros,
      'Porcentaje': '100 %',
      'Variación vs mes anterior': '—',
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Demografía');
    XLSX.writeFile(wb, `demografia-${this.datos.rango.desde}-${this.datos.rango.hasta}.xlsx`);
    this.toast.success('Reporte exportado.');
  }

  private formatearVariacion(v: number): string {
    if (v > 0) return `+${v}`;
    if (v < 0) return `${v}`;
    return '—';
  }

  private toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
