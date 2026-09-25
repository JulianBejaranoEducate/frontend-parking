import { TestBed } from '@angular/core/testing';
import type { VisitorRegistration } from '../models/visitor-pass';
import { PASS_TTL_MINUTES, PassError, VisitorPassService } from './visitor-pass.service';

describe('VisitorPassService', () => {
  const now = new Date('2026-09-15T10:00:00');
  const minutesLater = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

  const visitor: VisitorRegistration = {
    firstName: 'Ana María',
    lastName: 'Rodríguez Prueba',
    documentType: 'CC',
    documentNumber: '1000000001',
    vehicle: { type: 'bicicleta', brand: 'GW', color: 'Verde' },
    reason: 'Entrega de documentos',
  };

  let service: VisitorPassService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisitorPassService);
  });

  it('arranca con los pases ya usados de los visitantes que están dentro', () => {
    expect(service.all().map((pass) => [pass.token, pass.status, pass.stayId])).toEqual([
      ['demo-pass-luisa', 'used', 's-visita-luisa'],
      ['demo-pass-martin', 'used', 's-visita-martin'],
    ]);
  });

  it('emite un pase guardado, con token irrepetible y vencimiento a los 15 minutos', () => {
    const first = service.issue(visitor, now);
    const second = service.issue(visitor, now);

    expect(first.token).not.toBe(second.token);
    expect(first.expiresAt.getTime() - now.getTime()).toBe(PASS_TTL_MINUTES * 60_000);
    expect(service.find(` ${first.token} `)).toEqual(first);
    expect(service.find('no-existe')).toBeUndefined();
  });

  it('el vencimiento se calcula con la hora: no hace falta guardarlo', () => {
    const pass = service.issue(visitor, now);

    expect(service.statusOf(pass, minutesLater(14))).toBe('pending');
    expect(service.statusOf(pass, minutesLater(15))).toBe('expired');
    expect(pass.status).toBe('pending');
  });

  it('se usa una sola vez y solo mientras está vigente', () => {
    const pass = service.issue(visitor, now);
    const expired = service.issue(visitor, now);

    const used = service.markUsed(pass.token, { stayId: 'stay-1', guardName: 'Carlos Ramírez' }, minutesLater(2));

    expect(used).toMatchObject({ status: 'used', stayId: 'stay-1', usedBy: 'Carlos Ramírez', usedAt: minutesLater(2) });
    expect(() => service.markUsed(pass.token, { stayId: 'stay-2', guardName: 'Carlos Ramírez' })).toThrow(PassError);
    expect(() => service.markUsed(expired.token, { stayId: 'stay-3', guardName: 'Carlos Ramírez' }, minutesLater(20))).toThrow(
      'ya no está vigente',
    );
    expect(() => service.markUsed('no-existe', { stayId: 'stay-4', guardName: 'Carlos Ramírez' })).toThrow(
      'no corresponde a ningún pase',
    );
  });

  it('deshacer el uso lo devuelve a vigente, sin rastro del ingreso', () => {
    const pass = service.issue(visitor, now);
    service.markUsed(pass.token, { stayId: 'stay-1', guardName: 'Carlos Ramírez' }, now);

    service.markUnused(pass.token);

    expect(service.find(pass.token)).toEqual(pass);
  });

  it('anular solo afecta a los pases que no se han usado', () => {
    const pending = service.issue(visitor, now);

    service.revoke(pending.token, 'Reemplazado por un pase nuevo');
    service.revoke('demo-pass-martin', 'No debería anularse');

    expect(service.find(pending.token)).toMatchObject({ status: 'revoked', revokedReason: 'Reemplazado por un pase nuevo' });
    expect(service.find('demo-pass-martin')?.status).toBe('used');
  });
});
