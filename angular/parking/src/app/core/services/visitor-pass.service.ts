import { Injectable } from '@angular/core';
import { BRAND } from '../config/branding.config';
import { type VisitorPass, type VisitorRegistration } from '../models/visitor-pass';

/**
 * Minutos que vive un pase antes de vencerse.
 *
 * Es la defensa real contra que alguien comparta una foto del QR: aunque la
 * captura se escape, el código deja de servir enseguida. Bloquear la captura de
 * pantalla no es posible en la web y en iOS tampoco en app nativa, así que la
 * seguridad se apoya en la caducidad y en el uso único, no en esconder la
 * imagen.
 */
export const PASS_TTL_MINUTES = 15;

@Injectable({ providedIn: 'root' })
export class VisitorPassService {
  /**
   * Emite un pase nuevo. El token es irrepetible: quien lo tenga es quien pasa,
   * y solo una vez.
   */
  issue(visitor: VisitorRegistration, now: Date = new Date()): VisitorPass {
    const expiresAt = new Date(now.getTime() + PASS_TTL_MINUTES * 60_000);

    // TODO: guardar el pase en Firestore para que el panel de seguridad pueda
    // resolver el token y marcarlo como usado al validarlo en portería.
    return {
      token: this.createToken(),
      visitor,
      issuedAt: now,
      expiresAt,
      status: 'pending',
    };
  }

  /**
   * Dibuja el QR como data URL. La librería se carga con import dinámico para
   * que su peso no entre en el paquete inicial del formulario.
   */
  async renderQrCode(token: string): Promise<string> {
    const QRCode = await import('qrcode');

    return QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
      color: {
        dark: `${BRAND.theme.primary}ff`,
        light: '#ffffffff',
      },
    });
  }

  /**
   * randomUUID solo existe en contexto seguro (HTTPS o localhost). Al probar
   * desde el celular contra una IP de la red local no está, y ahí se recurre a
   * getRandomValues, que sí funciona sin HTTPS.
   */
  private createToken(): string {
    const webCrypto: Crypto = globalThis.crypto;

    if (typeof webCrypto.randomUUID === 'function') {
      return webCrypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);

    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
