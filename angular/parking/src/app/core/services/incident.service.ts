import { Injectable, computed, effect, signal } from '@angular/core';
import { loadDemo, saveDemo } from '../demo/demo-storage';
import type { Incident, IncidentStatus } from '../models/incident';
import { createId } from '../utils/id';

/**
 * Incidencias del parqueadero.
 *
 * Las reporta el personal de seguridad (por ahora, las diferencias de conteo al
 * recibir un turno) y las gestiona la administración.
 *
 * TODO: en demostración vive en el navegador; con Firebase será una colección
 * de Firestore.
 */

const STORAGE_KEY = 'incidents';

const hoursAgo = (hours: number): Date => new Date(Date.now() - hours * 3_600_000);

function seedIncidents(): Incident[] {
  return [
    {
      id: 'inc-1',
      title: 'Moto bloqueando la salida',
      description: 'Una moto quedó estacionada sobre la franja de salida de la zona de motos.',
      zoneName: 'Zona de motos',
      severity: 'medium',
      status: 'open',
      reportedAt: hoursAgo(2),
      reportedBy: 'Portería principal',
      plate: 'UIO34E',
    },
    {
      id: 'inc-2',
      title: 'Ingreso con pase de visitante vencido',
      description: 'Se intentó ingresar con un código QR vencido. Se generó uno nuevo tras verificar la identidad.',
      zoneName: 'Portería principal',
      severity: 'high',
      status: 'in-review',
      reportedAt: hoursAgo(20),
      reportedBy: 'Portería principal',
    },
    {
      id: 'inc-3',
      title: 'Rayón reportado en un scooter',
      description: 'El propietario reporta un rayón en la carcasa al retirar el vehículo.',
      zoneName: 'Zona de scooters',
      severity: 'medium',
      status: 'open',
      reportedAt: hoursAgo(50),
      reportedBy: 'Camila Herrera',
    },
    {
      id: 'inc-4',
      title: 'Casco olvidado',
      description: 'Casco negro encontrado en la zona de bicicletas. Está en portería.',
      zoneName: 'Zona de bicicletas',
      severity: 'low',
      status: 'resolved',
      reportedAt: hoursAgo(75),
      reportedBy: 'Ronda de seguridad',
      resolvedAt: hoursAgo(70),
    },
  ];
}

/** Datos que aporta quien reporta; id, estado y fecha los pone el servicio. */
export type IncidentReport = Omit<Incident, 'id' | 'status' | 'reportedAt' | 'resolvedAt'>;

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly _items = signal<Incident[]>(loadDemo<Incident[]>(STORAGE_KEY) ?? seedIncidents());

  /** Lo más reciente primero. */
  readonly items = computed(() =>
    [...this._items()].sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime()),
  );

  /** Todo lo que todavía requiere atención: abiertas y en revisión. */
  readonly unresolved = computed(() => this.items().filter((item) => item.status !== 'resolved'));

  constructor() {
    effect(() => saveDemo(STORAGE_KEY, this._items()));
  }

  /**
   * Registra una incidencia nueva, abierta.
   *
   * @param report Qué pasó, dónde y quién lo reporta.
   * @returns La incidencia creada.
   */
  report(report: IncidentReport): Incident {
    const incident: Incident = { ...report, id: createId('inc'), status: 'open', reportedAt: new Date() };
    this._items.update((items) => [...items, incident]);
    return incident;
  }

  /**
   * Cambia el estado de una incidencia. Al resolverla guarda la fecha; al
   * reabrirla, la borra.
   */
  setStatus(id: string, status: IncidentStatus): void {
    this._items.update((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, status, resolvedAt: status === 'resolved' ? new Date() : undefined }
          : item,
      ),
    );
  }
}
