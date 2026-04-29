/**
 * Limpia un RUT removiendo puntos, guiones y espacios.
 * Retorna solo los dígitos y el posible dígito verificador (K).
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[-.\s]/g, '').toUpperCase();
}

/**
 * Valida un RUT chileno usando el algoritmo módulo 11.
 * Acepta formatos: "12345678-9", "12.345.678-9", "123456789", "12345678K", "5.126.663-K"
 * Nunca lanza excepción; retorna false para inputs vacíos o malformados.
 */
export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;

  const cleaned = cleanRut(rut);

  // Debe tener al menos 2 caracteres: cuerpo (mínimo 1 dígito) + DV
  // Formato esperado tras limpiar: dígitos seguidos de dígito o K
  if (!/^\d{7,8}[\dK]$/.test(cleaned)) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  // Calcular DV esperado con algoritmo módulo 11
  const digits = body.split('').reverse();
  const sequence = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i], 10) * sequence[i % sequence.length];
  }

  const remainder = 11 - (sum % 11);
  let expectedDv: string;
  if (remainder === 11) {
    expectedDv = '0';
  } else if (remainder === 10) {
    expectedDv = 'K';
  } else {
    expectedDv = String(remainder);
  }

  return dv === expectedDv;
}

/**
 * Formatea un RUT al formato estándar XX.XXX.XXX-X.
 * Retorna string vacío si el input es inválido o malformado.
 */
export function formatRut(rut: string): string {
  if (!rut || typeof rut !== 'string') return '';

  const cleaned = cleanRut(rut);

  // Validar que tenga la longitud mínima esperada
  if (!/^\d{7,8}[\dK]$/.test(cleaned)) return '';

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  // Formatear cuerpo con puntos cada 3 dígitos desde la derecha
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}-${dv}`;
}
