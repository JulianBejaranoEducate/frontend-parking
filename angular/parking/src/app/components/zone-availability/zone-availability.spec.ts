import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ParkingZone } from '../../core/models/parking';
import { ZoneAvailability } from './zone-availability';

describe('ZoneAvailability', () => {
  let fixture: ComponentFixture<ZoneAvailability>;

  const zone = (id: string, capacity: number, occupied: number): ParkingZone => ({
    id,
    name: `Zona ${id}`,
    accepts: 'moto',
    capacity,
    occupied,
  });

  const render = async (zones: ParkingZone[], showOccupied = false) => {
    fixture.componentRef.setInput('zones', zones);
    fixture.componentRef.setInput('showOccupied', showOccupied);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ZoneAvailability] }).compileComponents();
    fixture = TestBed.createComponent(ZoneAvailability);
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const chips = () => [...host().querySelectorAll('.chip')].map((chip) => chip.textContent?.trim());

  it('clasifica cada zona por ocupación, siempre con texto además del color', async () => {
    await render([zone('a', 10, 3), zone('b', 10, 9), zone('c', 10, 10)]);

    expect(chips()).toEqual(['Disponible', 'Casi lleno', 'Sin cupos']);
  });

  it('calcula cupos libres y el ancho de la barra', async () => {
    await render([zone('a', 60, 45)]);

    expect(host().querySelector('.zone__count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('15 libres de 60');
    expect(host().querySelector<HTMLElement>('.meter__fill')?.style.width).toBe('75%');
    expect(host().querySelector('.meter')?.getAttribute('aria-valuenow')).toBe('45');
  });

  it('portería ve también los puestos en uso', async () => {
    await render([zone('a', 20, 2)], true);

    expect(host().querySelector('.zone__count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '18 libres de 20 · 2 en uso',
    );
  });

  it('nunca muestra cupos negativos aunque se registren ingresos de más', async () => {
    await render([zone('a', 5, 7)]);

    expect(host().querySelector('.zone__count strong')?.textContent?.trim()).toBe('0');
  });
});
