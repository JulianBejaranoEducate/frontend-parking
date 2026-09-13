/**
 * Identificador único para registros creados en el cliente. randomUUID solo
 * existe en contexto seguro (HTTPS o localhost); al probar desde el celular
 * contra la IP de la red local no está, y ahí se recurre a getRandomValues.
 */
export function createId(prefix: string): string {
  const webCrypto: Crypto = globalThis.crypto;

  if (typeof webCrypto.randomUUID === 'function') {
    return `${prefix}-${webCrypto.randomUUID()}`;
  }

  const bytes = new Uint8Array(12);
  webCrypto.getRandomValues(bytes);

  return `${prefix}-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
