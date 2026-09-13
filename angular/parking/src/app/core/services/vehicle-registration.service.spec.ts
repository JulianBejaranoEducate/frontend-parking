import { TestBed } from '@angular/core/testing';
import { signInForTest } from '../../testing/demo-session';
import type { RegistrationDocument } from '../models/vehicle-registration';
import { AuthService, DEMO_ACCOUNTS } from './auth.service';
import { NotificationService } from './notification.service';
import { RegistrationError, VehicleRegistrationService } from './vehicle-registration.service';

const frontCard: RegistrationDocument = {
  kind: 'property-card-front',
  fileName: 'tarjeta.jpg',
  mimeType: 'image/jpeg',
  dataUrl: 'data:image/jpeg;base64,AAAA',
  uploadedAt: new Date(),
};

const motoInput = (plate: string) => ({
  owner: { firstName: 'Julian', lastName: 'Bejarano', documentType: 'CC' as const, documentNumber: '1012345678' },
  vehicle: { type: 'moto' as const, plate, brand: 'Honda', line: 'CB 125F', modelYear: 2023, color: 'Rojo' },
  documents: [frontCard],
});

describe('VehicleRegistrationService', () => {
  const setup = (profile: 'user' | 'admin') => {
    TestBed.configureTestingModule({});
    const auth = signInForTest(profile);

    return {
      service: TestBed.inject(VehicleRegistrationService),
      auth,
      notifications: TestBed.inject(NotificationService),
    };
  };

  /** Cambia de cuenta sin recrear los servicios, como al cerrar y abrir sesión. */
  const switchTo = (auth: AuthService, profile: 'user' | 'admin') =>
    (auth as unknown as { _user: { set: (value: unknown) => void } })._user.set(DEMO_ACCOUNTS[profile]);

  it('envía la solicitud como pendiente y avisa a la administración', () => {
    const { service, auth, notifications } = setup('user');

    const registration = service.submit(motoInput('ABC12D'));

    expect(registration.status).toBe('pending');
    expect(registration.applicant.uid).toBe('demo-uid');
    expect(service.pending().some((item) => item.id === registration.id)).toBe(true);

    switchTo(auth, 'admin');
    const notice = notifications.items().find((item) => item.link?.includes(registration.id));
    expect(notice?.title).toBe('Nueva solicitud de registro');
  });

  it('no admite una placa que ya tiene una solicitud vigente', () => {
    const { service } = setup('user');

    expect(() => service.submit(motoInput('KZT45F'))).toThrowError(RegistrationError);
  });

  it('una moto sin la tarjeta de propiedad no se puede enviar', () => {
    const { service } = setup('user');

    expect(() => service.submit({ ...motoInput('ABC12D'), documents: [] })).toThrowError(
      'Faltan documentos obligatorios.',
    );
  });

  it('respeta el máximo de 5 vehículos por persona', () => {
    const { service } = setup('user');
    const bike = { owner: { firstName: 'Julian', lastName: 'Bejarano' }, vehicle: { type: 'bicicleta' as const }, documents: [] };

    service.submit(bike);
    service.submit(bike);

    expect(service.mine()).toHaveLength(5);
    expect(() => service.submit(bike)).toThrowError(/Ya tienes 5 vehículos/);
  });

  it('solo la administración puede aprobar, y la persona recibe el aviso', () => {
    const { service, auth, notifications } = setup('user');

    expect(() => service.approve('reg-bianchi')).toThrowError(/Solo la administración/);

    switchTo(auth, 'admin');
    service.approve('reg-bianchi');
    expect(service.find('reg-bianchi')?.status).toBe('approved');

    switchTo(auth, 'user');
    expect(notifications.items()[0].title).toBe('Vehículo aprobado');
  });

  it('pedir actualización devuelve la solicitud y reenviar la pone otra vez en la cola', () => {
    const { service, auth } = setup('admin');

    service.requestUpdate('reg-bianchi', 'frame-serial', 'No se lee el serial.');
    expect(service.find('reg-bianchi')?.status).toBe('needs-update');

    switchTo(auth, 'user');
    service.resubmit('reg-bianchi', [{ ...frontCard, kind: 'frame-serial' }]);

    const registration = service.find('reg-bianchi');
    expect(registration?.status).toBe('pending');
    expect(registration?.documents.filter((document) => document.kind === 'frame-serial')).toHaveLength(1);
  });

  it('una solicitud ya revisada no admite otra decisión', () => {
    const { service } = setup('admin');

    expect(() => service.reject('reg-kzt45f', 'Otro motivo')).toThrowError(/ya fue revisada/);
  });

  it('nadie puede eliminar la solicitud de otra persona', () => {
    const { service } = setup('user');

    expect(() => service.remove('reg-qwe28f')).toThrowError(/pertenece a otra persona/);
  });
});
