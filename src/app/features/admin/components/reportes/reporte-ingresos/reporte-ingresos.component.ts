import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { SkeletonLoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state.component';
import { ToastService } from '../../../../../core/services/toast.service';
import {
  ReporteIngresosService,
  IngresosResponse,
  RangoMeses,
} from '../../../services/reporte-ingresos.service';

const PALETA = [
  '#1565C0',
  '#26A69A',
  '#FFA726',
  '#AB47BC',
  '#EF5350',
  '#66BB6A',
  '#42A5F5',
  '#8D6E63',
];

@Component({
  selector: 'app-reporte-ingresos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
    MatSnackBarModule,
    NgxEchartsModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    CurrencyPipe,
  ],
  templateUrl: './reporte-ingresos.component.html',
  styleUrl: './reporte-ingresos.component.scss',
})
export class ReporteIngresosComponent implements OnInit {
  readonly columnas = ['metodo', 'total', 'porcentaje'];
  readonly rangoCtrl = new FormControl<RangoMeses>(6, { nonNullable: true });

  isLoading = true;
  chartOptions: EChartsOption | null = null;
  datos: IngresosResponse | null = null;

  constructor(
    private reporteService: ReporteIngresosService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar(this.rangoCtrl.value);
    this.rangoCtrl.valueChanges.subscribe(value => {
      if (value) this.cargar(value);
    });
  }

  private cargar(meses: RangoMeses): void {
    this.isLoading = true;
    this.reporteService.getIngresos(meses).subscribe({
      next: res => {
        this.datos = res;
        this.chartOptions = this.construirGrafico(res);
        this.isLoading = false;
      },
      error: err => {
        this.isLoading = false;
        this.datos = null;
        this.chartOptions = null;
        const msg = err?.error?.message ?? err?.message ?? 'No se pudo cargar el reporte de ingresos';
        this.toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  private construirGrafico(res: IngresosResponse): EChartsOption {
    return {
      color: PALETA,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        top: 0,
        textStyle: { color: '#555' },
      },
      grid: { left: 60, right: 24, top: 48, bottom: 32 },
      xAxis: {
        type: 'category',
        data: res.meses,
        axisLine: { lineStyle: { color: '#bbb' } },
        axisLabel: { color: '#555' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#555',
          formatter: (val: number) => this.formatearCorto(val),
        },
        splitLine: { lineStyle: { color: '#eee' } },
      },
      series: res.series.map(s => ({
        name: s.metodoPago,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: s.data,
        barMaxWidth: 56,
      })),
    };
  }

  private formatearCorto(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  }

  exportarCsv(): void {
    if (!this.datos || !this.hayDatos) {
      this.toast.warning('No hay datos para exportar.');
      return;
    }

    const lineas: string[] = ['Mes,Método de pago,Total'];
    for (const serie of this.datos.series) {
      for (let i = 0; i < this.datos.meses.length; i++) {
        const valor = Number(serie.data?.[i]) || 0;
        lineas.push(
          `${this.escapar(this.datos.meses[i])},${this.escapar(serie.metodoPago)},${valor}`,
        );
      }
    }

    const csv = lineas.join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingresos_${this.rangoCtrl.value}m.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.toast.success('Reporte exportado.');
  }

  private escapar(v: string): string {
    const s = String(v ?? '');
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  get hayDatos(): boolean {
    return !!this.datos
      && this.datos.series.length > 0
      && this.datos.totalGeneral > 0;
  }
}
