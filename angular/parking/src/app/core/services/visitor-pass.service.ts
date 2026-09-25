import { Injectable, computed, effect, signal } from '@angular/core';
import { BRAND } from '../config/branding.config';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import { seedPasses } from '../demo/seed-passes';
import { type PassStatus, type VisitorPass, type VisitorRegistration } from '../models/visitor-pass';

/**
 * Minutos que vive un pase antes de vencerse.
 *
 * Es la defensa real contra que alguien comparta una foto del QR: aunque la
 * captura se escape, el código deja de servir enseguida. Bloquear la captura de
 * pantalla no es posible en la web y en iOS tampoco en app nativa, así que la
 * seguridad se apoya en la caducidad y en el uso único, no en esconder la
 * imagen (ADR-003).
 */
export const PASS_TTL_MINUTES = 15;

const STORAGE_KEY = 'passes';

/** not-found: el código no es de ningún pase · not-pending: el pase ya se usó, venció o se anuló. */
export type PassErrorCode = 'not-found' | 'not-pending';

/** Error de negocio al usar o anular un pase. */
export class PassError extends Error {
  constructor(
    readonly code: PassErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Pases de visitante: se emiten desde el formulario de visitantes y los valida
 * el personal de seguridad al escanear el QR (Fase 3, resuelve COR-002).
 *
 * TODO: en demostración se guardan en el navegador, así que el pase solo se puede
 * validar en el mismo navegador donde se generó. Con Firebase se guardarán en
 * Firestore y marcar un pase como usado será una transacción, para que dos
 * guardias no lo validen a la vez.
 */
@Injectable({ providedIn: 'root' })
export class VisitorPassService {
  private readonly _passes = signal<VisitorPass[]>(loadDemo<VisitorPass[]>(STORAGE_KEY) ?? seedPasses());

  /** Todos los pases, el más reciente primero. */
  readonly all = computed(() => [...this._passes()].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime()));

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._passes()));
  }

  /**
   * Emite y guarda un pase nuevo. El token es irrepetible: quien lo tenga es
   * quien pasa, y solo una vez.
   *
   * @param visitor Datos que escribió el visitante en el formulario.
   * @param now Momento de emisión, inyectable para las pruebas.
   */
  issue(visitor: VisitorRegistration, now: Date = new Date()): VisitorPass {
    const pass: VisitorPass = {
      token: this.createToken(),
      visitor,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + PASS_TTL_MINUTES * 60_000),
      status: 'pending',
    };

    this._passes.update((passes) => [...passes, pass]);
    return pass;
  }

  /**
   * Busca un pase por el token leído del QR.
   *
   * @returns El pase, o undefined si el código no corresponde a ninguno.
   */
  find(token: string | null | undefined): VisitorPass | undefined {
    const value = token?.trim();
    return value ? this._passes().find((pass) => pass.token === value) : undefined;
  }

  /**
   * Estado real del pase: uno pendiente cuya hora ya pasó cuenta como vencido.
   *
   * @param now Momento de referencia; por defecto, ahora.
   */
  statusOf(pass: VisitorPass, now: Date = new Date()): PassStatus {
    return pass.status === 'pending' && now.getTime() >= pass.expiresAt.getTime() ? 'expired' : pass.status;
  }

  /**
   * Marca el pase como usado al registrar el ingreso del visitante.
   *
   * @param token Pase validado.
   * @param usage Estancia que abrió y guardia que lo validó.
   * @param at Momento de la validación; por defecto, ahora.
   * @throws PassError `not-found` si no existe, o `not-pending` si ya no está vigente.
   */
  markUsed(token: string, usage: { stayId: string; guardName: string }, at: Date = new Date()): VisitorPass {
    const pass = this.require(token);

    if (this.statusOf(pass, at) !== 'pending') {
      throw new PassError('not-pending', 'Este pase ya no está vigente.');
    }

    return this.replace({ ...pass, status: 'used', usedAt: at, stayId: usage.stayId, usedBy: usage.guardName });
  }

  /**
   * Devuelve un pase usado a pendiente. Solo lo usa «Deshacer» en los primeros
   * segundos; si mientras tanto venció, queda vencido.
   */
  markUnused(token: string): void {
    const pass = this.find(token);

    if (pass?.status === 'used') {
      const { usedAt: _usedAt, stayId: _stayId, usedBy: _usedBy, ...rest } = pass;
      this.replace({ ...rest, status: 'pending' });
    }
  }

  /**
   * Anula un pase que todavía no se usó, p. ej. cuando el visitante genera uno nuevo.
   *
   * @param reason Motivo que queda guardado.
   */
  revoke(token: string, reason: string): void {
    const pass = this.find(token);

    if (pass && pass.status === 'pending') {
      this.replace({ ...pass, status: 'revoked', revokedReason: reason });
    }
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

  private require(token: string): VisitorPass {
    const pass = this.find(token);

    if (!pass) {
      throw new PassError('not-found', 'El código no corresponde a ningún pase.');
    }

    return pass;
  }

  private replace(updated: VisitorPass): VisitorPass {
    this._passes.update((passes) => passes.map((pass) => (pass.token === updated.token ? updated : pass)));
    return updated;
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
