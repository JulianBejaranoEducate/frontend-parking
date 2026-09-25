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
 *
 * Al final hay vehículos ya aprobados que usan el parqueadero a diario: son los
 * que aparecen dentro en el dashboard de seguridad (ver seed-stays.ts).
 */
import { BRAND } from '../config/branding.config';
import type { Vehicle } from '../models/vehicle';
import type {
  Applicant,
  DeclaredOwner,
  RegistrationDocument,
  VehicleRegistration,
} from '../models/vehicle-registration';
import type { Affiliation } from '../services/auth.service';
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

/** "Suárez Mejía" → "SUAREZ MEJIA", como lo imprimen los documentos. */
const printed = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();

/** Cuenta institucional ficticia, con correo del dominio de la marca activa. */
function member(uid: string, displayName: string, affiliation: Affiliation, program: string): Applicant {
  const emailName = printed(displayName).toLowerCase().split(' ').join('.');
  return { uid, displayName, email: `${emailName}@${BRAND.emailDomain}`, affiliation, program };
}

interface ApprovedSeed {
  id: string;
  applicant: Applicant;
  owner: DeclaredOwner;
  vehicle: Vehicle;
  documents?: RegistrationDocument[];
  /** Hace cuántos días la aprobó la administración. */
  approvedDaysAgo: number;
}

/** Solicitud aprobada por la administración de la demostración. */
function approved({ id, applicant, owner, vehicle, documents = [], approvedDaysAgo }: ApprovedSeed): VehicleRegistration {
  return {
    id,
    applicant,
    owner,
    vehicle,
    documents,
    status: 'approved',
    submittedAt: daysAgo(approvedDaysAgo + 1),
    updatedAt: daysAgo(approvedDaysAgo),
    reviews: [{ outcome: 'approved', reviewer: DEMO_REVIEWER, decidedAt: daysAgo(approvedDaysAgo) }],
  };
}

/** Frente de tarjeta de propiedad ficticia que coincide con lo declarado. */
function propertyCard(
  owner: DeclaredOwner,
  vehicle: Vehicle,
  licenseNumber: string,
  displacement: number,
  uploadedDaysAgo: number,
): RegistrationDocument {
  return doc(
    'property-card-front',
    'tarjeta.jpg',
    mockPropertyCardFront({
      licenseNumber,
      plate: vehicle.plate ?? '',
      brand: printed(vehicle.brand ?? ''),
      line: printed(vehicle.line ?? ''),
      modelYear: vehicle.modelYear ?? 0,
      displacement,
      color: printed(vehicle.color ?? ''),
      ownerName: printed(`${owner.lastName} ${owner.firstName}`),
      ownerId: owner.documentNumber ?? '',
    }),
    daysAgo(uploadedDaysAgo),
  );
}

/** Moto aprobada, con su tarjeta de propiedad ficticia. */
function approvedMoto(
  seed: Omit<ApprovedSeed, 'documents'> & { licenseNumber: string; displacement: number },
): VehicleRegistration {
  return approved({
    ...seed,
    documents: [propertyCard(seed.owner, seed.vehicle, seed.licenseNumber, seed.displacement, seed.approvedDaysAgo + 1)],
  });
}

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
      owner: { firstName: 'Julian Andrés', lastName: 'Bejarano Rojas', documentType: 'CC', documentNumber: '1012345678' },
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
      vehicle: { type: 'scooter', color: 'Negro' },
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
      vehicle: { type: 'scooter', color: 'Blanco' },
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
      owner: { firstName: 'Sebastián', lastName: 'Gómez Arias', documentType: 'CC', documentNumber: '1015432198' },
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

    // ---- Vehículos aprobados que usan el parqueadero a diario ------------------------------
    approvedMoto({
      id: 'reg-hgt52b',
      applicant: member('u-natalia', 'Natalia Suárez', 'docente', 'Contaduría Pública'),
      owner: { firstName: 'Natalia', lastName: 'Suárez Mejía', documentType: 'CC', documentNumber: '52876543' },
      vehicle: { type: 'moto', plate: 'HGT52B', brand: 'Honda', line: 'XR 150L', modelYear: 2023, color: 'Blanco' },
      licenseNumber: '10000000007',
      displacement: 149,
      approvedDaysAgo: 60,
    }),
    approvedMoto({
      id: 'reg-lmn38e',
      applicant: member('u-felipe', 'Felipe Ortiz', 'estudiante', 'Ingeniería Industrial'),
      owner: { firstName: 'Felipe', lastName: 'Ortiz Cano', documentType: 'CC', documentNumber: '1019876543' },
      vehicle: { type: 'moto', plate: 'LMN38E', brand: 'AKT', line: 'NKD 125', modelYear: 2022, color: 'Rojo' },
      licenseNumber: '10000000008',
      displacement: 124,
      approvedDaysAgo: 45,
    }),
    approvedMoto({
      id: 'reg-pqr71c',
      applicant: member('u-juliana', 'Juliana Castro', 'administrativo', 'Biblioteca'),
      owner: { firstName: 'Juliana', lastName: 'Castro Vélez', documentType: 'CC', documentNumber: '1032456789' },
      vehicle: { type: 'moto', plate: 'PQR71C', brand: 'Yamaha', line: 'XTZ 125', modelYear: 2021, color: 'Negro' },
      licenseNumber: '10000000009',
      displacement: 124,
      approvedDaysAgo: 80,
    }),
    approvedMoto({
      id: 'reg-stv64k',
      applicant: member('u-diego', 'Diego Salazar', 'estudiante', 'Finanzas y Comercio Exterior'),
      owner: { firstName: 'Diego', lastName: 'Salazar Mora', documentType: 'CC', documentNumber: '1001987654' },
      vehicle: { type: 'moto', plate: 'STV64K', brand: 'Suzuki', line: 'Gixxer 150', modelYear: 2024, color: 'Azul' },
      licenseNumber: '10000000010',
      displacement: 155,
      approvedDaysAgo: 20,
    }),
    approvedMoto({
      id: 'reg-wxy19h',
      applicant: member('u-paula', 'Paula Moreno', 'docente', 'Marketing y Negocios Digitales'),
      owner: { firstName: 'Paula', lastName: 'Moreno Pardo', documentType: 'CC', documentNumber: '52198765' },
      vehicle: { type: 'moto', plate: 'WXY19H', brand: 'Bajaj', line: 'Boxer CT 100', modelYear: 2020, color: 'Gris' },
      licenseNumber: '10000000011',
      displacement: 99,
      approvedDaysAgo: 120,
    }),
    approvedMoto({
      id: 'reg-bcd82m',
      applicant: member('u-esteban', 'Esteban Ruiz', 'estudiante', 'Administración de Empresas'),
      owner: { firstName: 'Esteban', lastName: 'Ruiz Galindo', documentType: 'CC', documentNumber: '1027654321' },
      vehicle: { type: 'moto', plate: 'BCD82M', brand: 'TVS', line: 'Apache RTR 160', modelYear: 2023, color: 'Negro' },
      licenseNumber: '10000000012',
      displacement: 159,
      approvedDaysAgo: 30,
    }),
    approved({
      id: 'reg-gw-lynx',
      applicant: member('u-mariana', 'Mariana López', 'estudiante', 'Contaduría Pública'),
      owner: { firstName: 'Mariana', lastName: 'López Vera', documentType: 'CC', documentNumber: '1034567890' },
      vehicle: { type: 'bicicleta', brand: 'GW', color: 'Verde', frameSerial: 'GWL458812' },
      documents: [doc('frame-serial', 'serial.jpg', mockFrameSerial('GWL458812'), daysAgo(16))],
      approvedDaysAgo: 15,
    }),
    approved({
      id: 'reg-rockhopper',
      applicant: member('u-andrea', 'Andrea Pineda', 'docente', 'Ingeniería Industrial'),
      owner: { firstName: 'Andrea', lastName: 'Pineda Soto', documentType: 'CC', documentNumber: '39876543' },
      vehicle: { type: 'bicicleta', brand: 'Specialized', color: 'Rojo' },
      approvedDaysAgo: 25,
    }),
    approved({
      id: 'reg-scooter-tomas',
      applicant: member('u-tomas', 'Tomás Rincón', 'estudiante', 'Marketing y Negocios Digitales'),
      owner: { firstName: 'Tomás', lastName: 'Rincón Arango', documentType: 'CC', documentNumber: '1098123456' },
      vehicle: { type: 'scooter', brand: 'Xiaomi', color: 'Negro' },
      documents: [
        doc(
          'purchase-proof',
          'factura.jpg',
          mockPurchaseInvoice('TOMAS RINCON ARANGO', '1098123456', 'SCOOTER ELÉCTRICO URBANO'),
          daysAgo(11),
        ),
      ],
      approvedDaysAgo: 10,
    }),
    approved({
      id: 'reg-scooter-sara',
      applicant: member('u-sara', 'Sara Quintero', 'administrativo', 'Bienestar Universitario'),
      // Sin marca: el formulario la deja opcional porque no todos la conocen.
      owner: { firstName: 'Sara', lastName: 'Quintero Mesa', documentType: 'CC', documentNumber: '1020345678' },
      vehicle: { type: 'scooter', color: 'Gris' },
      approvedDaysAgo: 35,
    }),
  ];
}
