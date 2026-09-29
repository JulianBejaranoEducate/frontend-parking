import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Incident } from '../../core/models/incident';
import { IncidentsApiService } from '../../core/services/api/incidents-api.service';
import { adminNavigation } from './admin-navigation';

describe('menú de administración', () => {
  const incidents = signal<Incident[]>([]);

  const navigation = () => {
    TestBed.configureTestingModule({
      providers: [{ provide: IncidentsApiService, useValue: { incidents: incidents.asReadonly() } }],
    });
    return TestBed.runInInjectionContext(() => adminNavigation());
  };

  beforeEach(() => incidents.set([]));

  it('lleva todas las secciones y, sin incidencias abiertas, ningún contador', () => {
    const menu = navigation();

    expect(menu.context).toBe('Administración');
    expect(menu.items().map((item) => item.label)).toEqual(['Resumen', 'Pendientes', 'Aprobados', 'Usuarios', 'Incidencias']);
    expect(menu.items().some((item) => item.badge)).toBe(false);
  });

  it('cuenta en «Incidencias» solo las abiertas, y se actualiza al cargar la lista', () => {
    const menu = navigation();
    const at = new Date();

    incidents.set([
      { id: '1', title: 'Golpe', description: 'Golpe leve', status: 'open', reportedAt: at, reportedBy: '' },
      { id: '2', title: 'Alarma', description: 'Sonó la alarma', status: 'resolved', reportedAt: at, reportedBy: '' },
    ]);

    expect(menu.items().find((item) => item.id === 'incidencias')?.badge).toBe(1);
  });
});
