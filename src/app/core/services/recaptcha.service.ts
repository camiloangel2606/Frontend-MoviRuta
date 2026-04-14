import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SecurityLogger } from '../utils/security-logger';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  private siteKey = environment.recaptchaSiteKey;
  private scriptLoaded = false;

  constructor() {
    this.waitForRecaptcha();
  }

  private waitForRecaptcha(): void {
    if (!this.siteKey) {
      SecurityLogger.warn('reCAPTCHA', 'Site key no configurada');
      return;
    }

    if (window.grecaptcha && window.grecaptcha.ready) {
      window.grecaptcha.ready(() => {
        this.scriptLoaded = true;
        SecurityLogger.info('reCAPTCHA', 'Servicio listo');
      });
      return;
    }

    const checkInterval = setInterval(() => {
      if (window.grecaptcha && window.grecaptcha.ready) {
        clearInterval(checkInterval);
        window.grecaptcha.ready(() => {
          this.scriptLoaded = true;
          SecurityLogger.info('reCAPTCHA', 'Servicio listo');
        });
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.scriptLoaded) {
        SecurityLogger.error('reCAPTCHA', 'No se cargo en el tiempo esperado');
      }
    }, 10000);
  }

  async execute(action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        let attempts = 0;
        const maxAttempts = 50;

        const waitInterval = setInterval(() => {
          attempts++;

          if (window.grecaptcha && window.grecaptcha.execute) {
            clearInterval(waitInterval);
            this.performExecute(action, resolve, reject);
            return;
          }

          if (attempts >= maxAttempts) {
            clearInterval(waitInterval);
            SecurityLogger.error('reCAPTCHA', 'Servicio no disponible para ejecutar la accion');
            reject(new Error('reCAPTCHA no esta disponible. Por favor recarga la pagina.'));
          }
        }, 100);

        return;
      }

      this.performExecute(action, resolve, reject);
    });
  }

  private performExecute(
    action: string,
    resolve: (token: string) => void,
    reject: (error: Error) => void
  ): void {
    SecurityLogger.info('reCAPTCHA', `Ejecutando accion ${action}`);

    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(this.siteKey, { action })
        .then((token: string) => {
          SecurityLogger.info('reCAPTCHA', `Accion ${action} completada`);
          resolve(token);
        })
        .catch((error: any) => {
          SecurityLogger.error('reCAPTCHA', `Fallo la accion ${action}`, error);
          reject(new Error('Error en verificacion reCAPTCHA. Por favor intenta de nuevo.'));
        });
    });
  }

  isReady(): boolean {
    return this.scriptLoaded && window.grecaptcha && window.grecaptcha.execute;
  }

  getSiteKey(): string {
    return this.siteKey;
  }
}
