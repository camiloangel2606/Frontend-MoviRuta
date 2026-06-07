import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogModule
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QRCodeComponent } from 'angularx-qrcode';
import { Bus } from '../../../services/bus.service';

export interface QrBusDialogData {
  bus: Bus;
}

@Component({
  selector: 'app-qr-bus-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    QRCodeComponent,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-icon">qr_code_2</mat-icon>
      Código QR del Bus
    </h2>

    <mat-dialog-content class="dialog-content">
      <div class="qr-info">
        <p class="bus-placa">{{ data.bus.placa }}</p>
        <p class="bus-modelo">{{ data.bus.modelo }} — {{ data.bus.anio }}</p>
      </div>

      <div class="qr-wrapper">
        <qrcode
          [qrdata]="qrData"
          [width]="256"
          [errorCorrectionLevel]="'M'"
          [colorDark]="'#1775ff'"
          [colorLight]="'#ffffff'">
        </qrcode>
      </div>

      <p class="qr-hint">
        Escanea este código para identificar el bus en la plataforma.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="center" class="dialog-actions">
      <button mat-flat-button color="primary" (click)="onCerrar()">
        <mat-icon>check</mat-icon>
        Listo
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 600;
      justify-content: center;
    }
    .dialog-icon { color: #1775ff; }
    .dialog-content {
      padding: 16px 24px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-width: 320px;
    }
    .qr-info { text-align: center; }
    .bus-placa {
      font-size: 22px;
      font-weight: 700;
      font-family: monospace;
      color: #1a1a1a;
      margin: 0;
      letter-spacing: 0.1em;
    }
    .bus-modelo {
      font-size: 14px;
      color: #666;
      margin: 4px 0 0;
    }
    .qr-wrapper {
      padding: 16px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .qr-hint {
      font-size: 12px;
      color: #888;
      text-align: center;
      margin: 0;
    }
    .dialog-actions { padding: 12px 24px 16px; }
  `],
})
export class QrBusDialogComponent {
  get qrData(): string {
    return `BUS-${this.data.bus.id}:${this.data.bus.placa}`;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QrBusDialogData,
    private dialogRef: MatDialogRef<QrBusDialogComponent>,
  ) {}

  onCerrar(): void {
    this.dialogRef.close();
  }
}
