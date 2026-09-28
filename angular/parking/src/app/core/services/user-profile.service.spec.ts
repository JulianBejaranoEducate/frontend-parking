import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environments';
import { UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UserProfileService],
    });
    service = TestBed.inject(UserProfileService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('envía POST /users con únicamente el nombre válido', async () => {
    const synchronization = service.syncCurrentUser('Ana Pérez');
    const request = httpTesting.expectOne(`${environment.apiUrl}/users`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Ana Pérez' });
    request.flush({});

    await expect(synchronization).resolves.toBeUndefined();
  });

  it('normaliza el nombre con trim antes de enviarlo', async () => {
    const synchronization = service.syncCurrentUser('  Ana Pérez  ');
    const request = httpTesting.expectOne(`${environment.apiUrl}/users`);

    expect(request.request.body).toEqual({ name: 'Ana Pérez' });
    request.flush({});

    await expect(synchronization).resolves.toBeUndefined();
  });

  it.each([null, '', '   ', 'A', 'A'.repeat(101), 'Ana-Pérez', 'Ana123'])(
    'rechaza el displayName inválido %s sin enviar POST',
    async (displayName) => {
      await expect(service.syncCurrentUser(displayName)).rejects.toThrow(
        'Firebase display name is missing or invalid',
      );
      httpTesting.expectNone(`${environment.apiUrl}/users`);
    },
  );

  it.each(['Ab', 'A'.repeat(100)])('acepta el límite de nombre %s', async (name) => {
    const synchronization = service.syncCurrentUser(name);
    const request = httpTesting.expectOne(`${environment.apiUrl}/users`);

    expect(request.request.body).toEqual({ name });
    request.flush({});

    await expect(synchronization).resolves.toBeUndefined();
  });

  it('propaga los errores del backend', async () => {
    const synchronization = service.syncCurrentUser('Ana Pérez');
    const request = httpTesting.expectOne(`${environment.apiUrl}/users`);
    request.flush({ message: 'Profile sync failed' }, { status: 500, statusText: 'Server Error' });

    await expect(synchronization).rejects.toMatchObject({ status: 500 });
  });
});