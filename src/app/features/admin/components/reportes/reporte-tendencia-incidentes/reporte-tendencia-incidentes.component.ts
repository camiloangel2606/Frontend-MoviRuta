import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { forkJoin } from 'rxjs';
import { SkeletonLoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state.component';
import { ToastService } from '../../../../../core/services/toast.service';
import {
  ReporteTendenciaIncidentesService,
  EmpresaTendencia,
  BusTendencia,
  IncidenteTendencia,
} from '../../../services/reporte-tendencia-incidentes.service';

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TIPOS_CONFIG = [
  { key: 'MECANICO',  label: 'Mecánicos',  color: '#EF5350' },
  { key: 'ACCIDENTE', label: 'Accidentes', color: '#FF7043' },
  { key: 'ELECTRICO', label: 'Eléctricos', color: '#FFA726' },
  { key: 'OTRO',      label: 'Otros',      color: '#78909C' },
] as const;

export type RangoMeses = 3 | 6 | 12;

@Component({
  selector: 'app-reporte-tendencia-incidentes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    NgxEchartsModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './reporte-tendencia-incidentes.component.html',
  styleUrl: './reporte-tendencia-incidentes.component.scss',
})
export class ReporteTendenciaIncidentesComponent implements OnInit {
  readonly empresaCtrl = new FormControl<number | null>(null);
  readonly mesesCtrl = new FormControl<RangoMeses>(6, { nonNullable: true });

  isLoading = true;
  chartOptions: EChartsOption | null = null;
  empresas: EmpresaTendencia[] = [];
  mesesConDatos = 0;

  private todosIncidentes: IncidenteTendencia[] = [];
  private todosBuses: BusTendencia[] = [];

  constructor(
    private service: ReporteTendenciaIncidentesService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      empresas: this.service.getEmpresas(),
      buses: this.service.getBuses(),
      incidentes: this.service.getTodosIncidentes(),
    }).subscribe({
      next: ({ empresas, buses, incidentes }) => {
        this.empresas = empresas;
        this.todosBuses = buses;
        this.todosIncidentes = incidentes;
        this.recalcular();
        this.isLoading = false;
      },
      error: err => {
        this.isLoading = false;
        const msg = err?.error?.message ?? err?.message ?? 'No se pudo cargar el reporte';
        this.toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });

    this.empresaCtrl.valueChanges.subscribe(() => this.onFiltroChange());
    this.mesesCtrl.valueChanges.subscribe(() => this.onFiltroChange());
  }

  private onFiltroChange(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.recalcular();
      this.isLoading = false;
    }, 50);
  }

  private recalcular(): void {
    const numMeses = this.mesesCtrl.value;
    const empresaId = this.empresaCtrl.value;

    // Construir buckets de los últimos N meses
    const hoy = new Date();
    const bucketKeys: string[] = [];
    const labels: string[] = [];
    for (let i = numMeses - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      bucketKeys.push(`${d.getFullYear()}-${mm}`);
      labels.push(`${MESES_ES[d.getMonth()]} ${d.getFullYear()}`);
    }

    // Filtrar por empresa usando el mapa bus → empresa
    let filtrados = this.todosIncidentes;
    if (empresaId) {
      const busIdsEmpresa = new Set(
        this.todosBuses
          .filter(b => b.empresa?.id === empresaId)
          .map(b => b.id)
      );
      filtrados = this.todosIncidentes.filter(i => i.bus && busIdsEmpresa.has(i.bus.id));
    }

    // Contadores por tipo y mes
    const counts: Record<string, number[]> = {};
    for (const t of TIPOS_CONFIG) {
      counts[t.key] = new Array(numMeses).fill(0);
    }

    for (const inc of filtrados) {
      const mesKey = inc.createdAt?.slice(0, 7);
      const idx = bucketKeys.indexOf(mesKey ?? '');
      if (idx < 0) continue;
      const tipo = TIPOS_CONFIG.some(t => t.key === inc.tipo) ? inc.tipo : 'OTRO';
      counts[tipo][idx]++;
    }

    // Meses del período que tienen al menos un incidente
    this.mesesConDatos = bucketKeys.filter((_, i) =>
      TIPOS_CONFIG.some(t => counts[t.key][i] > 0)
    ).length;

    if (this.mesesConDatos === 0) {
      this.chartOptions = null;
      return;
    }

    this.chartOptions = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: TIPOS_CONFIG.map(t => t.label),
        top: 0,
        textStyle: { color: '#555' },
      },
      grid: { left: 48, right: 24, top: 56, bottom: 32 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#bbb' } },
        axisLabel: { color: '#555' },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#555' },
        splitLine: { lineStyle: { color: '#eee' } },
      },
      series: TIPOS_CONFIG.map(t => ({
        name: t.label,
        type: 'line',
        smooth: true,
        data: counts[t.key],
        itemStyle: { color: t.color },
        lineStyle: { color: t.color, width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        emphasis: { focus: 'series' },
      })),
    };
  }

  get hayDatos(): boolean {
    return this.mesesConDatos >= 1;
  }

  get nombreEmpresaSeleccionada(): string {
    if (!this.empresaCtrl.value) return 'Todas';
    return this.empresas.find(e => e.id === this.empresaCtrl.value)?.nombre ?? 'Todas';
  }

  get totalIncidentesPeriodo(): number {
    if (!this.todosIncidentes.length) return 0;
    const numMeses = this.mesesCtrl.value;
    const empresaId = this.empresaCtrl.value;
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (numMeses - 1), 1);

    let filtrados = this.todosIncidentes;
    if (empresaId) {
      const busIds = new Set(
        this.todosBuses.filter(b => b.empresa?.id === empresaId).map(b => b.id)
      );
      filtrados = filtrados.filter(i => i.bus && busIds.has(i.bus.id));
    }
    return filtrados.filter(i => {
      const f = new Date(i.createdAt);
      return !isNaN(f.getTime()) && f >= desde;
    }).length;
  }
}
