import { InjectionToken } from '@angular/core';

/**
 * Dibuja un código QR como data URL (imagen PNG en base64).
 *
 * Lo usan el pase del visitante (su id) y «Vehículos» (el identificador del
 * vehículo). La librería se carga con import dinámico para que su peso no entre
 * en el paquete inicial.
 *
 * @param value Texto que codifica el QR.
 */
export async function renderQrCode(value: string): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 512 });
}

/**
 * Generador de QR que usan las pantallas. Es inyectable para que las pruebas lo
 * reemplacen: dibujar el QR necesita un canvas que el entorno de pruebas no tiene.
 */
export const QR_CODE_RENDERER = new InjectionToken<(value: string) => Promise<string>>('QR_CODE_RENDERER', {
  providedIn: 'root',
  factory: () => renderQrCode,
});
