import { useState } from 'react'
import { nationalPhoneNumber, normalizeArgentineMobile } from '../utils/phone'

/**
 * Estado compartido de teléfonos de un cliente (F1-D2 / F1-D3).
 *
 * - Mantiene `telefonos` (números nacionales) y `telefonoActivo` (E.164).
 * - Auto-promueve el primero al borrar el activo.
 * - `flushPending()` incorpora lo escrito en el input antes de guardar, que es
 *   la trampa de UX que dejaba clientes con `telefonos: []`.
 */
export default function useClientPhones () {
  const [telefonos, setTelefonos] = useState([])
  const [telefonoActivo, setTelefonoActivo] = useState(null)
  const [telefonoInput, setTelefonoInputState] = useState('')
  const [error, setError] = useState('')

  const setTelefonoInput = (value) => {
    setTelefonoInputState(value)
    if (error !== '') {
      setError('')
    }
  }

  const apply = (list, active) => {
    setTelefonos(list)
    setTelefonoActivo(active)
    return { ok: true, telefonos: list, telefonoActivo: active }
  }

  const addValue = (value, list, active) => {
    const raw = String(value ?? '').trim()
    if (raw === '') {
      return { ok: true, telefonos: list, telefonoActivo: active }
    }

    const normalized = normalizeArgentineMobile(raw)
    if (!normalized.ok) {
      setError(normalized.error)
      return { ok: false, error: normalized.error }
    }

    const numeric = nationalPhoneNumber(normalized.value)
    if (numeric === null) {
      const message = `"${raw}" no es un móvil argentino válido.`
      setError(message)
      return { ok: false, error: message }
    }

    const next = list.includes(numeric) ? list : [...list, numeric]
    const nextActive = active || normalized.value
    setError('')
    setTelefonoInputState('')
    return apply(next, nextActive)
  }

  const addTelefono = () => addValue(telefonoInput, telefonos, telefonoActivo)

  const removeTelefono = (index) => {
    const removed = telefonos[index]
    const next = telefonos.filter((_, position) => position !== index)
    let nextActive = telefonoActivo

    if (removed !== undefined && nextActive !== null) {
      const normalized = normalizeArgentineMobile(removed)
      if (normalized.ok && normalized.value === nextActive) {
        nextActive = firstActive(next)
      }
    }
    if (next.length === 0) {
      nextActive = null
    }

    apply(next, nextActive)
  }

  const selectTelefono = (value) => {
    const normalized = normalizeArgentineMobile(value)
    if (!normalized.ok) {
      setError(normalized.error)
      return false
    }
    setError('')
    setTelefonoActivo(normalized.value)
    return true
  }

  const flushPending = () => {
    if (String(telefonoInput).trim() === '') {
      return { ok: true, telefonos, telefonoActivo }
    }
    return addValue(telefonoInput, telefonos, telefonoActivo)
  }

  const setFromClient = (client) => {
    const list = Array.isArray(client?.telefonos)
      ? [...new Set(client.telefonos.map(Number).filter((value) => Number.isFinite(value)))]
      : []

    let active = typeof client?.telefonoActivo === 'string' && client.telefonoActivo !== ''
      ? client.telefonoActivo
      : null

    if (active === null && list.length === 1) {
      const normalized = normalizeArgentineMobile(list[0])
      active = normalized.ok ? normalized.value : null
    }

    setTelefonos(list)
    setTelefonoActivo(active)
    setTelefonoInputState('')
    setError('')
  }

  const reset = () => {
    setTelefonos([])
    setTelefonoActivo(null)
    setTelefonoInputState('')
    setError('')
  }

  return {
    telefonos,
    telefonoActivo,
    telefonoInput,
    error,
    setTelefonoInput,
    addTelefono,
    removeTelefono,
    selectTelefono,
    flushPending,
    setFromClient,
    reset
  }
}

function firstActive (list) {
  for (const telefono of list) {
    const normalized = normalizeArgentineMobile(telefono)
    if (normalized.ok) {
      return normalized.value
    }
  }
  return null
}
