/**
 * Solicitudes de ejemplo para el modo demostración. Todas las personas, placas
 * y documentos son ficticios.
 *
 * Están pensadas para ejercitar cada caso de la revisión:
 * - Coincidencia total entre cuenta, formulario y documento.
 * - Formulario igual a la cuenta, pero la tarjeta a nombre de un familiar
 *   (solo lo detecta quien revisa la foto).
 * - Formulario con el nombre del familiar: la app avisa sola de la
 *   coincidencia parcial con la cuenta.
 * - Una solicitud reenviada después de pedir actualizar un documento.
 */
import type { RegistrationDocument, VehicleRegistration } from '../models/vehicle-registration';
import {
  mockFrameSerial,
  mockPropertyCardBack,
  mockPropertyCardFront,
  mockPurchaseInvoice,
} from './mock-documents';

/** Coincide con el uid del usuario de demostración de AuthService. */
export const DEMO_STUDENT_UID = 'demo-uid';
export const DEMO_REVIEWER = 'Laura Martínez';

const hoursAgo = (hours: number): Date => new Date(Date.now() - hours * 3_600_000);
const daysAgo = (days: number): Date => hoursAgo(days * 24);

const doc = (
  kind: RegistrationDocument['kind'],
  fileName: string,
  dataUrl: string,
  uploadedAt: Date,
): RegistrationDocument => ({ kind, fileName, mimeType: 'image/svg+xml', dataUrl, uploadedAt });

export function seedRegistrations(): VehicleRegistration[] {
  return [
    // ---- Julian (el estudiante de la demostración) ----------------------------------
    {
      id: 'reg-kzt45f',
      applicant: {
        uid: DEMO_STUDENT_UID,
        displayName: 'Julian Bejarano',
        email: 'julian.bejarano@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Administración de Empresas',
      },
      owner: {
        firstName: 'Julian Andrés',
        lastName: 'Bejarano Rojas',
        documentType: 'CC',
        documentNumber: '1012345678',
      },
      vehicle: { type: 'moto', plate: 'KZT45F', brand: 'Yamaha', line: 'FZ 2.0', modelYear: 2022, color: 'Negro' },
      documents: [
        doc(
          'property-card-front',
          'tarjeta-frontal.jpg',
          mockPropertyCardFront({
            licenseNumber: '10000000001',
            plate: 'KZT45F',
            brand: 'YAMAHA',
            line: 'FZ 2.0',
            modelYear: 2022,
            displacement: 149,
            color: 'NEGRO',
            ownerName: 'BEJARANO ROJAS JULIAN ANDRES',
            ownerId: '1012345678',
          }),
          daysAgo(40),
        ),
      ],
      status: 'approved',
      submittedAt: daysAgo(40),
      updatedAt: daysAgo(39),
      reviews: [{ outcome: 'approved', reviewer: DEMO_REVIEWER, decidedAt: daysAgo(39) }],
    },
    {
      id: 'reg-bianchi',
      applicant: {
        uid: DEMO_STUDENT_UID,
        displayName: 'Julian Bejarano',
        email: 'julian.bejarano@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Administración de Empresas',
      },
      owner: { firstName: 'Julian Andrés', lastName: 'Bejarano Rojas' },
      vehicle: { type: 'bicicleta', brand: 'Bianchi', color: 'Azul', frameSerial: 'WBK2291037' },
      documents: [doc('frame-serial', 'serial-marco.jpg', mockFrameSerial('WBK2291037'), daysAgo(5))],
      status: 'pending',
      submittedAt: daysAgo(5),
      updatedAt: daysAgo(5),
      reviews: [],
    },
    {
      id: 'reg-scooter-julian',
      applicant: {
        uid: DEMO_STUDENT_UID,
        displayName: 'Julian Bejarano',
        email: 'julian.bejarano@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Administración de Empresas',
      },
      owner: {
        firstName: 'Julian Andrés',
        lastName: 'Bejarano Rojas',
        documentType: 'CC',
        documentNumber: '1012345678',
      },
      vehicle: { type: 'scooter' },
      documents: [
        doc(
          'purchase-proof',
          'factura.jpg',
          mockPurchaseInvoice('CARLOS BEJARANO', '79111222', 'SCOOTER ELÉCTRICO URBANO'),
          daysAgo(4),
        ),
      ],
      status: 'rejected',
      submittedAt: daysAgo(4),
      updatedAt: daysAgo(3),
      reviews: [
        {
          outcome: 'rejected',
          reviewer: DEMO_REVIEWER,
          decidedAt: daysAgo(3),
          reason: 'El propietario no coincide con la cuenta',
          note: 'La factura está a nombre de otra persona.',
        },
      ],
    },

    // ---- Resto de la comunidad -----------------------------------------------------------
    {
      id: 'reg-qwe28f',
      applicant: {
        uid: 'u-valentina',
        displayName: 'Valentina Ríos',
        email: 'valentina.rios@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Marketing y Negocios Digitales',
      },
      owner: {
        firstName: 'Valentina',
        lastName: 'Ríos Cárdenas',
        documentType: 'CC',
        documentNumber: '1023456789',
      },
      vehicle: { type: 'moto', plate: 'QWE28F', brand: 'Honda', line: 'CB 190R', modelYear: 2024, color: 'Rojo' },
      documents: [
        doc(
          'property-card-front',
          'IMG_20260913_0812.jpg',
          mockPropertyCardFront({
            licenseNumber: '10000000002',
            plate: 'QWE28F',
            brand: 'HONDA',
            line: 'CB 190R',
            modelYear: 2024,
            displacement: 184,
            color: 'ROJO',
            ownerName: 'RIOS CARDENAS VALENTINA',
            ownerId: '1023456789',
          }),
          hoursAgo(5),
        ),
        doc('property-card-back', 'IMG_20260913_0813.jpg', mockPropertyCardBack({ licenseNumber: '10000000002' }), hoursAgo(5)),
      ],
      status: 'pending',
      submittedAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
      reviews: [],
    },
    {
      id: 'reg-jkl45b',
      applicant: {
        uid: 'u-andres',
        displayName: 'Andrés Castillo',
        email: 'andres.castillo@uniempresarial.edu.co',
        affiliation: 'docente',
        program: 'Ingeniería Industrial',
      },
      owner: {
        firstName: 'Andrés Felipe',
        lastName: 'Castillo Peña',
        documentType: 'CC',
        documentNumber: '80123456',
      },
      vehicle: { type: 'moto', plate: 'JKL45B', brand: 'AKT', line: 'CR5 180', modelYear: 2023, color: 'Blanco' },
      documents: [
        doc(
          'property-card-front',
          'tarjeta.jpg',
          // La tarjeta está a nombre del padre: el formulario no lo delata.
          mockPropertyCardFront({
            licenseNumber: '10000000003',
            plate: 'JKL45B',
            brand: 'AKT',
            line: 'CR5 180',
            modelYear: 2023,
            displacement: 180,
            color: 'BLANCO',
            ownerName: 'CASTILLO PEÑA JORGE ENRIQUE',
            ownerId: '19234567',
          }),
          daysAgo(2),
        ),
      ],
      status: 'pending',
      submittedAt: daysAgo(2),
      updatedAt: daysAgo(2),
      reviews: [],
    },
    {
      id: 'reg-mnb67c',
      applicant: {
        uid: 'u-sofia',
        displayName: 'Sofía Medina',
        email: 'sofia.medina@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Contaduría Pública',
      },
      // Escribió el nombre de su padre, que es quien figura en la tarjeta.
      owner: {
        firstName: 'Ricardo',
        lastName: 'Medina Suárez',
        documentType: 'CC',
        documentNumber: '79345678',
      },
      vehicle: { type: 'moto', plate: 'MNB67C', brand: 'Suzuki', line: 'GN 125', modelYear: 2019, color: 'Gris' },
      documents: [
        doc(
          'property-card-front',
          'foto-tarjeta.jpg',
          mockPropertyCardFront({
            licenseNumber: '10000000004',
            plate: 'MNB67C',
            brand: 'SUZUKI',
            line: 'GN 125',
            modelYear: 2019,
            displacement: 124,
            color: 'GRIS',
            ownerName: 'MEDINA SUAREZ RICARDO',
            ownerId: '79345678',
          }),
          hoursAgo(3),
        ),
      ],
      status: 'pending',
      submittedAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
      reviews: [],
    },
    {
      id: 'reg-zxc90a',
      applicant: {
        uid: 'u-mateo',
        displayName: 'Mateo Vargas',
        email: 'mateo.vargas@uniempresarial.edu.co',
        affiliation: 'docente',
        program: 'Finanzas y Comercio Exterior',
      },
      owner: {
        firstName: 'Mateo',
        lastName: 'Vargas Díaz',
        documentType: 'CC',
        documentNumber: '1030987654',
      },
      vehicle: { type: 'moto', plate: 'ZXC90A', brand: 'Bajaj', line: 'Pulsar NS 200', modelYear: 2021, color: 'Azul' },
      documents: [
        doc(
          'property-card-front',
          'tarjeta-nueva.jpg',
          mockPropertyCardFront({
            licenseNumber: '10000000005',
            plate: 'ZXC90A',
            brand: 'BAJAJ',
            line: 'PULSAR NS 200',
            modelYear: 2021,
            displacement: 199,
            color: 'AZUL',
            ownerName: 'VARGAS DIAZ MATEO',
            ownerId: '1030987654',
          }),
          hoursAgo(4),
        ),
      ],
      status: 'pending',
      submittedAt: daysAgo(3),
      updatedAt: hoursAgo(4),
      reviews: [
        {
          outcome: 'needs-update',
          reviewer: DEMO_REVIEWER,
          decidedAt: daysAgo(2),
          documentKind: 'property-card-front',
          note: 'La foto salió con reflejo y no se lee el propietario.',
        },
      ],
    },
    {
      id: 'reg-camila',
      applicant: {
        uid: 'u-camila',
        displayName: 'Camila Herrera',
        email: 'camila.herrera@uniempresarial.edu.co',
        affiliation: 'administrativo',
        program: 'Bienestar Universitario',
      },
      owner: {
        firstName: 'Camila',
        lastName: 'Herrera Gil',
        documentType: 'CC',
        documentNumber: '52345678',
      },
      vehicle: { type: 'scooter' },
      documents: [
        doc(
          'purchase-proof',
          'factura-scooter.jpg',
          mockPurchaseInvoice('CAMILA HERRERA GIL', '52345678', 'SCOOTER ELÉCTRICO PLEGABLE'),
          daysAgo(2),
        ),
      ],
      status: 'needs-update',
      submittedAt: daysAgo(2),
      updatedAt: daysAgo(1),
      reviews: [
        {
          outcome: 'needs-update',
          reviewer: DEMO_REVIEWER,
          decidedAt: daysAgo(1),
          documentKind: 'purchase-proof',
          note: 'Envía la factura completa: falta la parte con el número y la fecha.',
        },
      ],
    },
    {
      id: 'reg-trek',
      applicant: {
        uid: 'u-sebastian',
        displayName: 'Sebastián Gómez',
        email: 'sebastian.gomez@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Finanzas y Comercio Exterior',
      },
      owner: { firstName: 'Sebastián', lastName: 'Gómez Arias' },
      vehicle: { type: 'bicicleta', brand: 'Trek', color: 'Negro' },
      documents: [],
      status: 'approved',
      submittedAt: daysAgo(11),
      updatedAt: daysAgo(10),
      reviews: [{ outcome: 'approved', reviewer: DEMO_REVIEWER, decidedAt: daysAgo(10) }],
    },
    {
      id: 'reg-rty19d',
      applicant: {
        uid: 'u-daniela',
        displayName: 'Daniela Torres',
        email: 'daniela.torres@uniempresarial.edu.co',
        affiliation: 'estudiante',
        program: 'Administración de Empresas',
      },
      owner: {
        firstName: 'Daniela',
        lastName: 'Torres Luna',
        documentType: 'CC',
        documentNumber: '1001234567',
      },
      vehicle: { type: 'moto', plate: 'RTY19D', brand: 'Suzuki', line: 'Viva R', modelYear: 2018, color: 'Negro' },
      documents: [
        doc('property-card-front', 'captura.jpg', mockPropertyCardBack({ licenseNumber: '10000000006' }), daysAgo(7)),
      ],
      status: 'rejected',
      submittedAt: daysAgo(7),
      updatedAt: daysAgo(6),
      reviews: [
        {
          outcome: 'rejected',
          reviewer: DEMO_REVIEWER,
          decidedAt: daysAgo(6),
          reason: 'Faltan documentos',
          note: 'Se adjuntó la cara posterior en lugar de la frontal de la tarjeta de propiedad.',
        },
      ],
    },
  ];
}
