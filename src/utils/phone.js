/**
 * Normalización local de móviles argentinos para la app.
 *
 * Devuelve E.164 (`+549...`) o un error en español. La misma regla corre en
 * `gzapi` (`src/utils/phoneAr.ts`): la app valida antes de enviar y el backend
 * vuelve a validar como fuente de verdad.
 */

const ALLOWED_CHARACTERS = /^[\d\s+\-()./\u00A0]+$/
const SEPARATORS = /[\s\u00A0\-()./]/g
const NATIONAL_MOBILE = /^[1-3]\d{9}$/

export function phoneDigits (value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function normalizeArgentineMobile (value) {
  const raw = String(value ?? '').trim()
  if (raw === '') {
    return { ok: false, error: 'Ingresá un número de teléfono.' }
  }
  if (!ALLOWED_CHARACTERS.test(raw)) {
    return { ok: false, error: `"${raw}" no parece un número de teléfono.` }
  }

  const compact = raw.replace(SEPARATORS, '')
  const digits = compact.replace(/\D/g, '')
  if (digits === '') {
    return { ok: false, error: 'El teléfono no tiene dígitos.' }
  }

  let national = ''
  if (digits.startsWith('549')) {
    if (digits.length !== 13) {
      return invalidLength(raw)
    }
    national = digits.slice(3)
  } else if (digits.startsWith('54')) {
    if (digits.length !== 12) {
      return invalidLength(raw)
    }
    national = digits.slice(2)
  } else if (digits.startsWith('9') && digits.length === 11) {
    national = digits.slice(1)
  } else {
    national = digits.replace(/^0+/, '')
  }

  if (!NATIONAL_MOBILE.test(national)) {
    return invalidLength(raw)
  }

  return { ok: true, value: `+549${national}` }
}

export function samePhone (left, right) {
  const a = normalizeArgentineMobile(left)
  const b = normalizeArgentineMobile(right)
  if (!a.ok || !b.ok) {
    return phoneDigits(left) === phoneDigits(right)
  }
  return a.value === b.value
}

/** Dígitos nacionales (sin 54/9) para guardar en `telefonos: [Number]`. */
export function nationalPhoneNumber (value) {
  const normalized = normalizeArgentineMobile(value)
  if (!normalized.ok) {
    return null
  }
  return Number(normalized.value.replace(/\D/g, '').slice(3))
}

function invalidLength (raw) {
  return {
    ok: false,
    error: `"${raw}" no es un móvil argentino válido. Ingresá 10 dígitos, por ejemplo 3816041154.`
  }
}
