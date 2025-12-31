export async function reverseGeocode(lat: number, lng: number) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GolozurApp/1.0 (contact@example.com)'
            }
        });
        if (!response.ok) return {};
        const data = await response.json();
        return { address: data?.display_name };
    } catch (_e) {
        return {};
    }
}

