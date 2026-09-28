import { adminNavigation } from './admin-navigation';

describe('menú de administración', () => {
  it('lleva todas las secciones y, sin datos todavía, ningún contador', () => {
    const navigation = adminNavigation();

    expect(navigation.context).toBe('Administración');
    expect(navigation.items().map((item) => item.label)).toEqual([
      'Resumen',
      'Pendientes',
      'Aprobados',
      'Rechazados',
      'Actualizaciones',
      'Estadísticas',
      'Incidencias',
    ]);
    expect(navigation.items().some((item) => item.badge)).toBe(false);
  });
});
