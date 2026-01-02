// src/lib/files/sha256.ts
// Càlcul de hash SHA-256 al client usant Web Crypto API (sense dependències externes)

/**
 * Calcula el hash SHA-256 d'un File o Blob.
 * Retorna el hash com a string hexadecimal.
 *
 * @param file - Fitxer a processar
 * @returns Hash SHA-256 en format hexadecimal (64 caràcters)
 *
 * @example
 * const hash = await computeSha256(file);
 * console.log(hash); // "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
 */
export async function computeSha256(file: File | Blob): Promise<string> {
  // Llegir el fitxer com ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Calcular hash amb Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

  // Convertir a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Versió asíncrona que pot informar del progrés (per a fitxers molt grans).
 * Nota: En MVP llegim tot d'un cop; aquesta funció és per a futura extensió.
 */
export async function computeSha256WithProgress(
  file: File | Blob,
  _onProgress?: (percent: number) => void
): Promise<string> {
  // En MVP, simplement delegem a la versió simple
  // Per a streaming real caldria usar ReadableStream + crypto.subtle.digest incremental
  return computeSha256(file);
}
