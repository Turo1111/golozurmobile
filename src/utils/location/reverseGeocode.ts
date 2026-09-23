import * as Location from 'expo-location'

export type ReverseGeocodeFailureReason =
    | 'invalid-coordinates'
    | 'timeout'
    | 'network'
    | 'http'
    | 'invalid-response'

export type ReverseGeocodeResult =
    | { ok: true; address: string }
    | { ok: false; reason: ReverseGeocodeFailureReason }

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
// Nominatim rejects requests with a placeholder contact (HTTP 403); it requires an
// identifying User-Agent with a real contact channel. Shared by every Nominatim call.
export const NOMINATIM_USER_AGENT = 'GolozurApp/1.0 (+https://github.com/Turo1111/golozurmobile)'
// Cota máxima de la consulta al geocoder nativo del dispositivo.
const NATIVE_TIMEOUT_MS = 8000
// Cota global del pedido completo (incluye el reintento).
const OVERALL_TIMEOUT_MS = 10000
// Espera mínima entre intentos: respeta la política de uso de 1 request/segundo de Nominatim.
const RETRY_DELAY_MS = 1000
const MAX_ATTEMPTS = 2

// El geocoder nativo no usa HTTP ni User-Agent, por lo que no puede recibir el 403 de Nominatim.
function formatNativeAddress(place: Location.LocationGeocodedAddress | undefined): string {
    if (!place) return ''

    const pick = (value: string | null | undefined) => (typeof value === 'string' ? value.trim() : '')
    const street = pick(place.street)
    const streetNumber = pick(place.streetNumber)
    const streetLine = street ? [street, streetNumber].filter(Boolean).join(' ') : pick(place.name)

    const parts: string[] = []
    const append = (value: string) => {
        if (!value) return
        if (parts.length > 0 && parts[parts.length - 1] === value) return
        parts.push(value)
    }

    append(streetLine)
    append(pick(place.district))
    append(pick(place.city))
    append(pick(place.region))
    append(pick(place.country))
    return parts.join(', ')
}

async function attemptNativeReverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        const places = await Promise.race([
            Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error('native-geocode-timeout')), NATIVE_TIMEOUT_MS)
            })
        ])
        const address = formatNativeAddress(Array.isArray(places) ? places[0] : undefined)
        if (!address) return { ok: false, reason: 'invalid-response' }
        return { ok: true, address }
    } catch (_e) {
        // Fallo o expiración del geocoder nativo: se descarta y decide el fallback HTTP.
        return { ok: false, reason: 'network' }
    } finally {
        if (timer) clearTimeout(timer)
    }
}

function buildReverseUrl(lat: number, lng: number) {
    return `${NOMINATIM_REVERSE_URL}?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`
}

async function attemptReverseGeocode(lat: number, lng: number, timeoutMs: number): Promise<ReverseGeocodeResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const response = await fetch(buildReverseUrl(lat, lng), {
            headers: {
                'User-Agent': NOMINATIM_USER_AGENT
            },
            signal: controller.signal
        })
        if (!response.ok) return { ok: false, reason: 'http' }
        let data: any
        try {
            data = await response.json()
        } catch (_e) {
            return { ok: false, reason: 'invalid-response' }
        }
        const address = typeof data?.display_name === 'string' ? data.display_name.trim() : ''
        if (!address) return { ok: false, reason: 'invalid-response' }
        return { ok: true, address }
    } catch (_e) {
        return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'network' }
    } finally {
        clearTimeout(timer)
    }
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { ok: false, reason: 'invalid-coordinates' }
    }

    // Geocoder nativo primero: sin HTTP ni User-Agent, inmune al 403 de Nominatim en Android.
    const nativeResult = await attemptNativeReverseGeocode(lat, lng)
    if (nativeResult.ok) return nativeResult

    const deadline = Date.now() + OVERALL_TIMEOUT_MS
    let lastFailure: ReverseGeocodeResult = { ok: false, reason: 'network' }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const remainingMs = deadline - Date.now()
        if (remainingMs <= 0) {
            return { ok: false, reason: 'timeout' }
        }

        lastFailure = await attemptReverseGeocode(lat, lng, remainingMs)
        if (lastFailure.ok) return lastFailure

        const hasRetryLeft = attempt < MAX_ATTEMPTS - 1
        if (hasRetryLeft) {
            const retryFitsInBudget = Date.now() + RETRY_DELAY_MS < deadline
            if (!retryFitsInBudget) return lastFailure
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }
    }

    return lastFailure
}
