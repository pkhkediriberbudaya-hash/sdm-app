/**
 * Menormalkan nama desa supaya pencocokan tidak meleset gara-gara beda
 * spasi/strip/huruf besar-kecil antara nama resmi (dropdown Kemendagri) dan
 * nama yang tertulis di file CSV SIKS-NG (mis. "Adan-Adan" vs "ADAN ADAN").
 */
export function normalizeDesaName(name) {
  return (name || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}
