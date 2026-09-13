/**
 * Documentos de prueba para las solicitudes de ejemplo.
 *
 * Reproducen solo la ESTRUCTURA de una licencia de tránsito colombiana (los
 * campos que la administración compara), con datos ficticios y una marca de
 * agua visible. No llevan escudos, logos oficiales ni datos de personas reales.
 */

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const toDataUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const WATERMARK = `
  <g transform="rotate(-18 428 270)" opacity="0.16">
    <text x="428" y="300" text-anchor="middle" font-size="64" font-weight="800" fill="#c8102e"
      font-family="Arial, sans-serif">DOCUMENTO DE PRUEBA</text>
  </g>`;

function field(x: number, y: number, label: string, value: string, size = 26): string {
  return `
    <text x="${x}" y="${y}" font-size="13" font-weight="700" fill="#4a5878"
      font-family="Arial, sans-serif">${escapeXml(label)}</text>
    <text x="${x}" y="${y + size + 4}" font-size="${size}" font-weight="700" fill="#1a2340"
      font-family="Arial, sans-serif">${escapeXml(value)}</text>`;
}

export interface MockPropertyCard {
  licenseNumber: string;
  plate: string;
  brand: string;
  line: string;
  modelYear: number;
  displacement: number;
  color: string;
  /** Tal como lo imprime la licencia: apellidos primero, en mayúsculas. */
  ownerName: string;
  ownerId: string;
}

export function mockPropertyCardFront(card: MockPropertyCard): string {
  return toDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4f8fb"/><stop offset="1" stop-color="#e6eef5"/>
    </linearGradient>
  </defs>
  <rect width="856" height="540" rx="28" fill="url(#bg)"/>
  <circle cx="620" cy="300" r="190" fill="none" stroke="#b9d3e8" stroke-width="26" opacity="0.5"/>
  <text x="428" y="62" text-anchor="middle" font-size="30" font-weight="800" fill="#1a2340"
    font-family="Arial, sans-serif">LICENCIA DE TRÁNSITO (EJEMPLO)</text>
  <text x="428" y="96" text-anchor="middle" font-size="20" font-weight="700" fill="#1a2340"
    font-family="Arial, sans-serif">No. ${escapeXml(card.licenseNumber)}</text>
  ${field(40, 146, 'PLACA', card.plate)}
  ${field(210, 146, 'MARCA', card.brand)}
  ${field(430, 146, 'LÍNEA', card.line)}
  ${field(720, 146, 'MODELO', String(card.modelYear))}
  ${field(40, 226, 'CILINDRADA CC', String(card.displacement))}
  ${field(210, 226, 'COLOR', card.color)}
  ${field(620, 226, 'SERVICIO', 'PARTICULAR')}
  ${field(40, 306, 'CLASE DE VEHÍCULO', 'MOTOCICLETA')}
  ${field(430, 306, 'COMBUSTIBLE', 'GASOLINA')}
  <line x1="40" y1="410" x2="816" y2="410" stroke="#1a2340" stroke-width="2" opacity="0.4"/>
  ${field(40, 436, 'PROPIETARIO: APELLIDO(S) Y NOMBRE(S)', card.ownerName, 24)}
  ${field(600, 436, 'IDENTIFICACIÓN', `C.C. ${card.ownerId}`, 24)}
  ${WATERMARK}
</svg>`);
}

export function mockPropertyCardBack(card: Pick<MockPropertyCard, 'licenseNumber'>): string {
  const bars = Array.from({ length: 46 }, (_, index) => {
    const width = 3 + ((index * 7) % 5) * 2;
    return `<rect x="${40 + index * 16.5}" y="330" width="${width}" height="120" fill="#1a2340"/>`;
  }).join('');

  return toDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <rect width="856" height="540" rx="28" fill="#f4f8fb"/>
  ${field(40, 60, 'FECHA MATRÍCULA', '14/02/2024', 24)}
  ${field(300, 60, 'FECHA EXP. LIC. TTO.', '14/02/2024', 24)}
  ${field(40, 150, 'ORGANISMO DE TRÁNSITO', 'SECRETARÍA DE MOVILIDAD (EJEMPLO)', 24)}
  ${field(40, 240, 'RESTRICCIÓN MOVILIDAD', '******', 22)}
  ${bars}
  <text x="428" y="500" text-anchor="middle" font-size="22" font-weight="700" fill="#1a2340"
    font-family="Arial, sans-serif">LT-EJEMPLO-${escapeXml(card.licenseNumber)}</text>
  ${WATERMARK}
</svg>`);
}

export function mockFrameSerial(serial: string): string {
  return toDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <defs>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b7280"/><stop offset="0.5" stop-color="#9ca3af"/>
      <stop offset="1" stop-color="#4b5563"/>
    </linearGradient>
  </defs>
  <rect width="856" height="540" fill="#1f2937"/>
  <rect x="60" y="170" width="736" height="200" rx="100" fill="url(#metal)"/>
  <text x="428" y="292" text-anchor="middle" font-size="64" font-weight="700" fill="#1f2937"
    letter-spacing="6" font-family="Consolas, monospace">${escapeXml(serial)}</text>
  ${WATERMARK}
</svg>`);
}

export function mockPurchaseInvoice(buyer: string, buyerId: string, item: string): string {
  return toDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <rect width="856" height="540" fill="#ffffff"/>
  <rect x="0" y="0" width="856" height="86" fill="#1a2340"/>
  <text x="40" y="56" font-size="28" font-weight="800" fill="#ffffff"
    font-family="Arial, sans-serif">FACTURA ELECTRÓNICA DE VENTA (EJEMPLO)</text>
  ${field(40, 130, 'CLIENTE', buyer, 24)}
  ${field(560, 130, 'IDENTIFICACIÓN', `C.C. ${buyerId}`, 24)}
  <line x1="40" y1="210" x2="816" y2="210" stroke="#e2e7f0" stroke-width="2"/>
  ${field(40, 244, 'DESCRIPCIÓN', item, 24)}
  ${field(620, 244, 'CANTIDAD', '1', 24)}
  <line x1="40" y1="330" x2="816" y2="330" stroke="#e2e7f0" stroke-width="2"/>
  ${field(560, 380, 'TOTAL', '$ 2.350.000', 30)}
  ${WATERMARK}
</svg>`);
}
