/**
 * Pases de visitante de ejemplo para el modo demostración. Personas y placas
 * son ficticias.
 *
 * Son los pases con los que entraron los dos visitantes que están dentro en
 * seed-stays.ts; ya quedaron usados. Un pase vigente no tiene sentido como dato
 * fijo porque vence a los 15 minutos: para probar el escaneo se genera uno desde
 * el formulario de visitantes.
 */
import type { VisitorPass } from '../models/visitor-pass';
import { minutesAgo } from './demo-time';

export function seedPasses(): VisitorPass[] {
  const used = (minutesInside: number): Pick<VisitorPass, 'issuedAt' | 'expiresAt' | 'usedAt'> => {
    const issuedAt = minutesAgo(minutesInside + 4);
    return {
      issuedAt,
      expiresAt: new Date(issuedAt.getTime() + 15 * 60_000),
      usedAt: minutesAgo(minutesInside),
    };
  };

  return [
    {
      token: 'demo-pass-martin',
      visitor: {
        firstName: 'Martín',
        lastName: 'Acosta Bernal',
        documentType: 'CC',
        documentNumber: '1098765432',
        vehicle: { type: 'moto', plate: 'UYT43G', brand: 'Honda', color: 'Negro' },
        reason: 'Reunión en Admisiones',
      },
      ...used(40),
      status: 'used',
      stayId: 's-visita-martin',
      usedBy: 'Carlos Ramírez',
    },
    {
      token: 'demo-pass-luisa',
      visitor: {
        firstName: 'Luisa',
        lastName: 'Guerrero Paz',
        documentType: 'CC',
        documentNumber: '1122334455',
        vehicle: { type: 'bicicleta', brand: 'Scott', color: 'Blanco' },
        reason: 'Evento de egresados',
      },
      ...used(25),
      status: 'used',
      stayId: 's-visita-luisa',
      usedBy: 'Carlos Ramírez',
    },
  ];
}
