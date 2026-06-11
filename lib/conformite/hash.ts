/**
 * Hash déterministe (FNV-1a 32 bits) pour empreintes de documents démo.
 * Suffisant pour la traçabilité pédagogique ; en production : SHA-256
 * (crypto.subtle) avec horodatage qualifié.
 */
export function stableHash(content: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
