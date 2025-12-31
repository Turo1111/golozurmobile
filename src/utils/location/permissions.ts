import * as Location from 'expo-location'

export async function askLocationPermission() {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        return status
    } catch (_e) {
        return 'denied'
    }
}

export async function getCurrentCoords() {
    try {
        // Intentar usar la última ubicación conocida (rápida)
        const last = await Location.getLastKnownPositionAsync()
        if (last?.coords?.latitude && last?.coords?.longitude) {
            return { lat: last.coords.latitude, lng: last.coords.longitude }
        }
        // Fallback a obtener ubicación actual con precisión balanceada y timeout
        const { coords } = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 10000,
            timeout: 5000
        })
        return { lat: coords.latitude, lng: coords.longitude }
    } catch (_e) {
        return null
    }
}

