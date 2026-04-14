import { environment } from '../../../environments/environment';

export class SecurityLogger {
  private static readonly enabled = !environment.production && environment.securityLogsEnabled;

  static info(scope: string, message: string, context?: unknown): void {
    if (!this.enabled) {
      return;
    }

    if (context === undefined) {
      console.log(`[Security:${scope}] ${message}`);
      return;
    }

    console.log(`[Security:${scope}] ${message}`, context);
  }

  static warn(scope: string, message: string, context?: unknown): void {
    if (context === undefined) {
      console.warn(`[Security:${scope}] ${message}`);
      return;
    }

    console.warn(`[Security:${scope}] ${message}`, context);
  }

  static error(scope: string, message: string, context?: unknown): void {
    if (context === undefined) {
      console.error(`[Security:${scope}] ${message}`);
      return;
    }

    console.error(`[Security:${scope}] ${message}`, context);
  }
}
