import {
  type VehicleRegistration,
  compareNames,
  missingRequiredDocuments,
  nameTokens,
  statusNote,
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
  it('la moto exige la cara frontal de la tarjeta de propiedad', () => {
    expect(missingRequiredDocuments('moto', []).map((item) => item.kind)).toEqual(['property-card-front']);
    expect(missingRequiredDocuments('moto', [{ kind: 'property-card-front' }])).toEqual([]);
  });

  it('bicicleta y scooter no exigen documentos', () => {
    expect(missingRequiredDocuments('bicicleta', [])).toEqual([]);
    expect(missingRequiredDocuments('scooter', [])).toEqual([]);
  });
});

describe('estado para el usuario', () => {
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

  it('explica qué documento volver a enviar', () => {
    const registration: VehicleRegistration = {
      ...base,
      status: 'needs-update',
      reviews: [
        {
          outcome: 'needs-update',
          reviewer: 'Laura',
          decidedAt: new Date(),
          documentKind: 'purchase-proof',
          note: 'Está borrosa.',
        },
      ],
    };

    expect(statusNote(registration)).toBe('Vuelve a enviar: Factura o certificado. Está borrosa.');
  });

  it('una solicitud que vuelve de actualizar se reconoce como reenviada', () => {
    const resubmitted: VehicleRegistration = {
      ...base,
      reviews: [{ outcome: 'needs-update', reviewer: 'Laura', decidedAt: new Date() }],
    };

    expect(wasResubmitted(resubmitted)).toBe(true);
    expect(wasResubmitted(base)).toBe(false);
    expect(statusNote(base)).toBeUndefined();
  });
});
