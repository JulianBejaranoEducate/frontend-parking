import type { VehicleType } from './vehicle';
import {
  DOCUMENT_REQUIREMENTS,
  type VehicleRegistration,
  compareNames,
  nameTokens,
  wasResubmitted,
} from './vehicle-registration';

describe('comparación de nombres', () => {
  it('ignora tildes, mayúsculas, orden y partículas', () => {
    expect(nameTokens('José de la Peña')).toEqual(['JOSE', 'PENA']);
    expect(compareNames('Julián Bejarano', 'BEJARANO JULIAN')).toBe('match');
  });

  it('acepta que la cuenta omita segundo nombre o segundo apellido', () => {
    expect(compareNames('Julian Andrés Bejarano Rojas', 'Julian Bejarano')).toBe('match');
  });

  it('marca como parcial un familiar que comparte apellido', () => {
    expect(compareNames('Ricardo Medina Suárez', 'Sofía Medina')).toBe('partial');
  });

  it('marca como distinto un nombre sin nada en común', () => {
    expect(compareNames('Pedro Pérez', 'Laura Martínez')).toBe('mismatch');
    expect(compareNames('', 'Laura Martínez')).toBe('mismatch');
  });
});

describe('documentos requeridos', () => {
  const required = (type: VehicleType) =>
    DOCUMENT_REQUIREMENTS[type].filter((requirement) => requirement.required).map((requirement) => requirement.kind);

  it('la moto exige la cara frontal de la tarjeta de propiedad', () => {
    expect(required('moto')).toEqual(['property-card-front']);
  });

  it('bicicleta y scooter no exigen documentos', () => {
    expect(required('bicicleta')).toEqual([]);
    expect(required('scooter')).toEqual([]);
  });
});

describe('reenvío de una solicitud', () => {
  const base: VehicleRegistration = {
    id: 'r',
    applicant: { uid: 'u', displayName: 'Ana', email: 'a@x', affiliation: null, program: null },
    owner: { firstName: 'Ana', lastName: 'Ríos' },
    vehicle: { type: 'scooter' },
    documents: [],
    status: 'pending',
    submittedAt: new Date(),
    updatedAt: new Date(),
    reviews: [],
  };

  it('una solicitud que vuelve de actualizar se reconoce como reenviada', () => {
    const resubmitted: VehicleRegistration = {
      ...base,
      reviews: [{ outcome: 'needs-update', reviewer: 'Laura', decidedAt: new Date() }],
    };

    expect(wasResubmitted(resubmitted)).toBe(true);
    expect(wasResubmitted(base)).toBe(false);
  });
});
