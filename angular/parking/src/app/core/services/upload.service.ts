import { Injectable } from '@angular/core';
import type { DocumentKind, RegistrationDocument } from '../models/vehicle-registration';

/** Lado más largo de las fotos una vez reducidas: se sigue leyendo cada campo. */
const MAX_IMAGE_EDGE = 1400;
const JPEG_QUALITY = 0.78;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

/**
 * Prepara los archivos que adjunta el usuario.
 *
 * Una foto de celular pesa entre 3 y 12 MB. Se reduce en el propio dispositivo
 * a unos cientos de KB antes de guardarla: sube más rápido con datos móviles y
 * la tarjeta sigue siendo legible para quien revisa.
 *
 * TODO: con Firebase, subir el resultado a Storage y guardar solo su ruta.
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  async prepare(file: File, kind: DocumentKind): Promise<RegistrationDocument> {
    const isPdf = file.type === 'application/pdf';

    if (!isPdf && !file.type.startsWith('image/')) {
      throw new UploadError('Adjunta una foto (JPG o PNG) o un PDF.');
    }

    if (isPdf && file.size > MAX_PDF_BYTES) {
      throw new UploadError('El PDF supera los 5 MB. Prueba con una foto del documento.');
    }

    if (!isPdf && file.size > MAX_IMAGE_BYTES) {
      throw new UploadError('La foto supera los 15 MB.');
    }

    const dataUrl = isPdf ? await readAsDataUrl(file) : await compressImage(file);

    return {
      kind,
      fileName: file.name,
      mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
      dataUrl,
      uploadedAt: new Date(),
    };
  }
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new UploadError('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);

  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const context = canvas.getContext('2d');

    if (!context) {
      return readAsDataUrl(file);
    }

    // Fondo blanco: un PNG con transparencia no debe quedar negro al pasar a JPG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    // Típico de fotos HEIC de iPhone abiertas en un navegador que no las entiende.
    image.onerror = () => reject(new UploadError('No se pudo abrir la foto. Prueba con otra en formato JPG.'));
    image.src = url;
  });
}
