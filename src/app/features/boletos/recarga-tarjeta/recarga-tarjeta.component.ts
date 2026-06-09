declare const ePayco: any;

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { SkeletonLoaderComponent } from '../../../shared/components/loader/loader.component';
import { TarjetaActiva, ReferenciaTransaccion } from '../../../shared/models/tarjeta.models';

@Component({
  selector: 'app-recarga-tarjeta',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SkeletonLoaderComponent,
  ],
  templateUrl: './recarga-tarjeta.component.html',
  styleUrl: './recarga-tarjeta.component.scss',
})
export class RecargaTarjetaComponent implements OnInit, OnDestroy {
  tarjeta: TarjetaActiva | null = null;
  isLoading = true;
  isProcesando = false;
  montoPredefSeleccionado: number | null = null;

  readonly montoCtrl = new FormControl<number | null>(null, [
    Validators.min(5000),
    Validators.max(500000),
  ]);

  readonly montosPredef = [10_000, 20_000, 50_000, 100_000];

  private destroy$ = new Subject<void>();
  private ciudadanoId: number | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarTarjeta();
  }

  ngOnDestroy(): void {
    this.detenerPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarTarjeta(silencioso = false): void {
    const securityUserId = this.auth.getCurrentUser()?.id;
    if (!securityUserId) {
      this.isLoading = false;
      return;
    }

    if (!silencioso) this.isLoading = true;

    const fuente$ = this.ciudadanoId
      ? this.api.get<any[]>(`${environment.negocioUrl}/metodo-pago-ciudadano?ciudadanoId=${this.ciudadanoId}`)
      : this.api.get<any>(`${environment.negocioUrl}/persona/security/${securityUserId}`).pipe(
          switchMap((persona: any) => {
            this.ciudadanoId = persona.ciudadanoId;   // ciudadanoId, no persona.id
            return this.api.get<any[]>(`${environment.negocioUrl}/metodo-pago-ciudadano?ciudadanoId=${this.ciudadanoId}`);
          }),
        );

    fuente$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (items) => {
        const mpc = Array.isArray(items) && items.length > 0 ? items[0] : null;
        if (mpc) {
          const saldoNuevo = parseFloat(mpc.saldo);
          const saldoAnterior = this.tarjeta?.saldo ?? null;

          this.tarjeta = {
            id: mpc.id.toString(),
            saldo: saldoNuevo,
            tipo: mpc.metodoPago?.tipo ?? '',
          };

          if (silencioso && saldoAnterior !== null && saldoNuevo !== saldoAnterior) {
            this.detenerPolling();
            this.toast.success(`Saldo actualizado: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(saldoNuevo)}`);
            this.montoCtrl.reset();
            this.montoPredefSeleccionado = null;
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private iniciarPolling(): void {
    this.detenerPolling();
    let intentos = 0;
    const MAX_INTENTOS = 100; // 100 * 3s = 5 minutos

    this.pollingTimer = setInterval(() => {
      intentos++;
      this.cargarTarjeta(true);
      if (intentos >= MAX_INTENTOS) this.detenerPolling();
    }, 3000);
  }

  private detenerPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    // Cuando el usuario vuelve a la pestaña tras pagar en ePayco,
    // refrescamos el saldo inmediatamente para no esperar al siguiente tick del polling.
    if (this.ciudadanoId) {
      this.cargarTarjeta(true);
    }
  }

  seleccionarMonto(monto: number): void {
    this.montoPredefSeleccionado = monto;
    this.montoCtrl.setValue(monto);
  }

  onMontoPersonalizado(): void {
    this.montoPredefSeleccionado = null;
  }

  get saldoActual(): number {
    return this.tarjeta?.saldo ?? 0;
  }

  get montoActual(): number {
    return this.montoCtrl.value ?? 0;
  }

  get saldoFuturo(): number {
    return this.saldoActual + this.montoActual;
  }

  get puedeContiuar(): boolean {
    return this.montoCtrl.valid && this.montoCtrl.value !== null && this.montoCtrl.value > 0;
  }

  continuar(): void {
    if (!this.puedeContiuar || !this.tarjeta) return;

    this.isProcesando = true;
    const monto = this.montoCtrl.value!;

    this.api
      .post<ReferenciaTransaccion>(`${environment.negocioUrl}/pagos/referencia`, {
        tarjetaId: this.tarjeta.id,
        monto,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ref) => this.cargarEpayco(ref, monto),
        error: () => {
          this.isProcesando = false;
          this.toast.error('No se pudo conectar con la pasarela de pago. Intenta de nuevo.');
        },
      });
  }

  private cargarEpayco(ref: ReferenciaTransaccion, monto: number): void {
    if (document.querySelector('script[data-epayco-key]')) {
      this.abrirEpayco(ref, monto);
      return;
    }

    const script = document.createElement('script');
    script.src = environment.epayco.checkoutUrl;
    script.setAttribute('data-epayco-key', environment.epayco.publicKey);

    script.onload = () => this.abrirEpayco(ref, monto);

    script.onerror = () => {
      this.isProcesando = false;
      this.toast.error('No se pudo conectar con la pasarela de pago. Intenta de nuevo.');
    };

    document.body.appendChild(script);
  }

  private abrirEpayco(ref: ReferenciaTransaccion, monto: number): void {
    const handler = ePayco.checkout.configure({
      key: environment.epayco.publicKey,
      test: environment.epayco.test,
    });

    handler.open({
      name: 'Recarga Tarjeta Transporte',
      description: ref.referencia,
      invoice: ref.referencia,
      currency: 'cop',
      amount: monto.toString(),
      tax_base: '0',
      tax: '0',
      country: 'co',
      lang: 'es',
      external: 'false',
      response: `${environment.epayco.webhookBaseUrl}/pagos/respuesta`,
      confirmation: `${environment.epayco.webhookBaseUrl}/pagos/confirmacion`,
    });

    this.isProcesando = false;
    this.iniciarPolling();
  }
}
