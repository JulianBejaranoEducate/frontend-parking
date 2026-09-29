import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Incident } from '../../core/models/incident';
import { IncidentsApiService } from '../../core/services/api/incidents-api.service';
import { type BackendUser, UsersApiService } from '../../core/services/api/users-api.service';
import { type BackendVehicle, VehiclesApiService } from '../../core/services/api/vehicles-api.service';
import { signInForTest } from '../../testing/test-session';
import { AdminDashboard } from './admin-dashboard';

function vehicle(plate: string, authorized: boolean): BackendVehicle {
  return {
    plate,
    brand: 'Yamaha',
    model: 2022,
    color: 'Negro',
    type: 'moto',
    is_authorized: authorized,
    id_owner: 'test-user',
    owner: { id: 'test-user', name: 'Estudiante de Prueba', email: 'e@uniempresarial.edu.co', roleId: 1, status_user: true },
  };
}

function incident(id: string, title: string, status: Incident['status'], reportedBy = ''): Incident {
  return { id, title, description: `${title}: detalle de prueba.`, status, reportedAt: new Date(), reportedBy };
}

/** Los tres servicios del panel, con listas que cada prueba puede cambiar. */
class BackendStub {
  pending: BackendVehicle[] = [];
  approved: BackendVehicle[] = [];
  inactive: BackendUser[] = [];
  incidentRows: Incident[] = [];
  calls: string[] = [];
  fail = false;

  private readonly incidents = signal<Incident[]>([]);

  readonly vehiclesApi = {
    deauthorized: () => this.answer(() => this.pending),
    authorized: () => this.answer(() => this.approved),
    authorize: (plate: string) => {
      this.calls.push(`aprobar ${plate}`);
      this.approved = [...this.approved, ...this.pending.filter((item) => item.plate === plate)];
      this.pending = this.pending.filter((item) => item.plate !== plate);
      return this.answer(() => undefined);
    },
    deauthorize: (plate: string) => {
      this.calls.push(`revocar ${plate}`);
      return this.answer(() => undefined);
    },
  };

  readonly usersApi = {
    listInactive: () => this.answer(() => this.inactive),
    restore: (id: string) => {
      this.calls.push(`reactivar ${id}`);
      return this.answer(() => undefined);
    },
  };

  readonly incidentsApi = {
    incidents: this.incidents.asReadonly(),
    load: () => this.answer(() => this.incidents.set(this.incidentRows)),
  };

  private answer<T>(value: () => T): Promise<T> {
    return this.fail ? Promise.reject(new Error('sin conexión')) : Promise.resolve(value());
  }
}

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  let backend: BackendStub;

  const create = async (section = 'resumen') => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideRouter([]),
        { provide: VehiclesApiService, useValue: backend.vehiclesApi },
        { provide: UsersApiService, useValue: backend.usersApi },
        { provide: IncidentsApiService, useValue: backend.incidentsApi },
      ],
    }).compileComponents();

    signInForTest('admin');

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const texts = (selector: string) =>
    [...host().querySelectorAll(selector)].map((element) => element.textContent?.replace(/\s+/g, ' ').trim());
  const click = async (label: string) => {
    [...host().querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes(label))?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  beforeEach(() => {
    backend = new BackendStub();
  });

  it('should create', async () => {
    await create();

    expect(component).toBeTruthy();
  });

  it('solo pinta la sección: el menú lo pone el layout (ver admin-navigation.spec)', async () => {
    await create();

    expect(host().querySelector('app-sidebar')).toBeNull();
  });

  it('el resumen cuenta pendientes, usuarios inactivos e incidencias abiertas', async () => {
    backend.pending = [vehicle('AAA11A', false), vehicle('BBB22B', false)];
    backend.incidentRows = [incident('1', 'Golpe leve', 'open'), incident('2', 'Alarma', 'resolved')];

    await create('resumen');

    expect(texts('.tile__value')).toEqual(['2', '0', '1']);
    expect(text('.tiles .tile:last-child .tile__note')).toBe('De 2 reportadas por portería.');
  });

  it('aprobar un vehículo pendiente le da permiso y lo saca de pendientes', async () => {
    backend.pending = [vehicle('AAA11A', false)];

    await create('pendientes');
    expect(texts('.request__title')).toEqual(['AAA11A']);

    await click('Aprobar');

    expect(backend.calls).toEqual(['aprobar AAA11A']);
    expect(text('.empty')).toBe('No hay vehículos pendientes.');
  });

  it('revocar la autorización de un vehículo aprobado', async () => {
    backend.approved = [vehicle('KZT45F', true)];

    await create('aprobados');
    await click('Revocar autorización');

    expect(backend.calls).toEqual(['revocar KZT45F']);
  });

  it('reactivar un usuario dado de baja', async () => {
    backend.inactive = [{ id: 'u9', name: 'Usuaria de Prueba', email: 'u9@uniempresarial.edu.co', roleId: 1, status_user: false }];

    await create('usuarios');
    await click('Reactivar usuario');

    expect(backend.calls).toEqual(['reactivar u9']);
  });

  it('las incidencias muestran título, estado y quién las reportó', async () => {
    backend.incidentRows = [incident('1', 'Golpe leve', 'open', 'Vigilante de Prueba')];

    await create('incidencias');

    expect(text('.incident .request__title')).toContain('Golpe leve');
    expect(text('.incident .chip')).toBe('Abierta');
    expect(text('.incident .request__meta')).toContain('Reportó: Vigilante de Prueba');
  });

  it('si el backend no responde, lo avisa en vez de mostrar listas vacías sin explicación', async () => {
    backend.fail = true;

    await create('pendientes');

    expect(text('.alert')).toContain('No pudimos consultar el backend');
  });

  it('una sección desconocida muestra el resumen', async () => {
    await create('no-existe');

    expect(text('.page__title')).toBe('Resumen');
  });
});
