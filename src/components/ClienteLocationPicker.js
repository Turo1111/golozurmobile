import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { WebView } from 'react-native-webview'
import { askLocationPermission, getCurrentCoords } from '../utils/location/permissions'
import { reverseGeocode } from '../utils/location/reverseGeocode'

const DEFAULT_REGION = { lat: -34.6037, lng: -58.3816, zoom: 12 }

export default function ClienteLocationPicker({ value, onChange, readOnly, height = 260, showSearch = true, showZoomControls = true, marginBottom = 0 }) {
    const [selected, setSelected] = useState(value || null)
    const lastProgrammaticSetAtRef = useRef(0)
    const lastChangeSourceRef = useRef(null) // 'external' | 'search' | 'mylocation' | null
    const reverseReqIdRef = useRef(0)
    const [loading, setLoading] = useState(false)
    const [permission, setPermission] = useState('undetermined')

    useEffect(() => {
        // Cambio externo (propagado por padre)
        lastChangeSourceRef.current = 'external'
        setSelected(value || null)
    }, [value])

    useEffect(() => {
        (async () => {
            const status = await askLocationPermission()
            setPermission(status)
            if (!value && status === 'granted') {
                const coords = await getCurrentCoords()
                if (coords) {
                    lastChangeSourceRef.current = 'mylocation'
                    setSelected({ lat: coords.lat, lng: coords.lng })
                    onChange && onChange({ lat: coords.lat, lng: coords.lng })
                }
            }
        })()
    }, [])

    const mapRegion = useMemo(() => {
        const latitude = selected?.lat ?? DEFAULT_REGION.lat
        const longitude = selected?.lng ?? DEFAULT_REGION.lng
        const zoom = selected ? 15 : DEFAULT_REGION.zoom
        const delta = zoom >= 15 ? 0.01 : zoom >= 13 ? 0.03 : 0.0922
        return {
            latitude,
            longitude,
            latitudeDelta: delta,
            longitudeDelta: delta,
        }
    }, [selected])

    const webRef = useRef(null)

    useEffect(() => {
        if (!webRef.current || !selected) return
        try {
            // Marcar como set programático si vino de una selección externa/buscador/mi ubicación
            if (lastChangeSourceRef.current) {
                lastProgrammaticSetAtRef.current = Date.now()
            }
            webRef.current.postMessage(JSON.stringify({ type: 'setMarker', lat: selected.lat, lng: selected.lng }))
        } catch (_) { }
        finally {
            // Resetear origen después de propagar al mapa
            lastChangeSourceRef.current = null
        }
    }, [selected])

    const handleLongPress = async (coords) => {
        if (readOnly) return
        setLoading(true)
        const lat = coords.latitude
        const lng = coords.longitude
        let address
        const myId = ++reverseReqIdRef.current
        const geo = await reverseGeocode(lat, lng)
        if (myId !== reverseReqIdRef.current) {
            setLoading(false)
            return
        }
        address = geo.address
        const loc = { lat, lng, address }
        setSelected(loc)
        onChange && onChange(loc)
        setLoading(false)
    }

    const handleUseMyLocation = async () => {
        if (readOnly) return
        setLoading(true)
        const status = permission === 'undetermined' ? await askLocationPermission() : permission
        setPermission(status)
        if (status !== 'granted') {
            Alert.alert('Permiso de ubicación', 'No se pudo acceder a la ubicación. Selecciona el punto manualmente.')
            setLoading(false)
            return
        }
        const coords = await getCurrentCoords()
        if (!coords) {
            Alert.alert('Error', 'No se pudo obtener la ubicación actual')
            setLoading(false)
            return
        }
        // Setear marker y mover mapa inmediatamente
        const loc = { lat: coords.lat, lng: coords.lng }
        lastChangeSourceRef.current = 'mylocation'
        setSelected(loc)
        onChange && onChange(loc)
        try {
            webRef.current?.postMessage(JSON.stringify({ type: 'setMarker', lat: coords.lat, lng: coords.lng }))
        } catch (_) { }
        // Hacer reverse geocoding en segundo plano
        const myId = ++reverseReqIdRef.current
        reverseGeocode(coords.lat, coords.lng).then((geo) => {
            if (myId !== reverseReqIdRef.current) return
            const updated = { lat: coords.lat, lng: coords.lng, address: geo?.address }
            setSelected(updated)
            onChange && onChange(updated)
        }).finally(() => setLoading(false))
    }

    const handleClear = () => {
        if (readOnly) return
        setSelected(null)
        onChange && onChange(null)
    }

    // Búsqueda con Nominatim (OSM)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const typingTimeout = useRef(null)

    const searchPlaces = async () => {
        if (!searchQuery?.trim()) {
            setSearchResults([])
            return
        }
        try {
            setSearchLoading(true)
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=6`
            const res = await fetch(url, {
                headers: { 'User-Agent': 'GolozurApp/1.0 (contact@example.com)' }
            })
            const data = await res.json()
            setSearchResults(Array.isArray(data) ? data : [])
        } catch (_e) {
            setSearchResults([])
        } finally {
            setSearchLoading(false)
        }
    }

    useEffect(() => {
        if (readOnly) return
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        const q = searchQuery?.trim() || ''
        if (q.length < 3) {
            setSearchResults([])
            setSearchLoading(false)
            return
        }
        typingTimeout.current = setTimeout(() => {
            searchPlaces()
        }, 450)
        return () => typingTimeout.current && clearTimeout(typingTimeout.current)
    }, [searchQuery, readOnly])

    const handleSelectSearchResult = (item) => {
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        const address = item.display_name
        const loc = { lat, lng, address }
        // Invalidar geocodings en curso para que no sobrescriban esta selección
        reverseReqIdRef.current += 1
        lastChangeSourceRef.current = 'search'
        // Marcar supresión de taps antes de que llegue cualquier click del mapa
        lastProgrammaticSetAtRef.current = Date.now()
        setSelected(loc)
        onChange && onChange(loc)
        try {
            webRef.current?.postMessage(JSON.stringify({ type: 'setMarker', lat, lng }))
        } catch (_) { }
        setSearchResults([])
    }

    return (
        <View>
            {/* Buscador arriba */}
            {!readOnly && showSearch && (
                <View style={styles.searchBoxWrapper}>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar dirección o ciudad"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                    </View>
                    {!!searchResults?.length && (
                        <View style={styles.resultsContainer}>
                            {searchResults.map((it, idx) => (
                                <TouchableOpacity key={`${it.place_id || idx}`} style={styles.resultItem} onPress={() => handleSelectSearchResult(it)}>
                                    <Text numberOfLines={2} style={styles.resultText}>{it.display_name}</Text>
                                </TouchableOpacity>
                            ))}
                            {searchLoading && (
                                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                    <Text style={{ color: '#64748b', fontSize: 12 }}>Buscando…</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}
            <View style={{ height, marginBottom }}>
                <WebView
                    ref={webRef}
                    style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    domStorageEnabled
                    source={{ html: getLeafletHtml(mapRegion.latitude, mapRegion.longitude, showZoomControls) }}
                    setSupportMultipleWindows={false}
                    androidHardwareAccelerationDisabled={false}
                    onError={() => { /* noop to avoid redscreen */ }}
                    onLoadEnd={() => {
                        if (selected) {
                            try {
                                webRef.current?.postMessage(JSON.stringify({ type: 'setMarker', lat: selected.lat, lng: selected.lng }))
                            } catch (_) { }
                        }
                    }}
                    onMessage={(event) => {
                        try {
                            const data = JSON.parse(event.nativeEvent.data)
                            if ((data?.type === 'longPress' || data?.type === 'tap') && data.lat && data.lng) {
                                // Ignorar taps inmediatamente después de un set programático (elegido por buscador/externo/mi ubicación)
                                if (data.type === 'tap' && lastProgrammaticSetAtRef.current && (Date.now() - lastProgrammaticSetAtRef.current < 600)) {
                                    return
                                }
                                handleLongPress({ latitude: data.lat, longitude: data.lng })
                            }
                        } catch (_) { }
                    }}
                />
                {loading && (
                    <View style={styles.loading}>
                        <ActivityIndicator color={'#2563eb'} />
                    </View>
                )}
                {!readOnly && (
                    <>
                        <TouchableOpacity
                            accessibilityRole="button"
                            onPress={handleUseMyLocation}
                            style={styles.fabLeft}
                        >
                            <Icon name="target" size={18} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole="button"
                            onPress={handleClear}
                            style={styles.fabRight}
                        >
                            <Icon name="trash-2" size={18} color="#000" />
                        </TouchableOpacity>
                    </>
                )}
            </View>

        </View>
    )
}

function getLeafletHtml(lat, lng, showZoomControls) {
    const safeLat = Number.isFinite(lat) ? lat : -34.6037
    const safeLng = Number.isFinite(lng) ? lng : -58.3816
    // HTML de Leaflet con detección de long press y marcador
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map', { zoomControl: ${showZoomControls ? true : false} }).setView([${safeLat}, ${safeLng}], 14);
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      let marker = L.marker([${safeLat}, ${safeLng}], { draggable: false }).addTo(map);

      function sendMessage(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      // Long press detection
      let pressTimer = null;
      function handlePressStart(e) {
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          const latlng = e.latlng || map.mouseEventToLatLng(e.originalEvent);
          if (!latlng) return;
          marker.setLatLng(latlng);
          sendMessage({ type: 'longPress', lat: latlng.lat, lng: latlng.lng });
        }, 350);
      }
      function handlePressEnd() { clearTimeout(pressTimer); }

      map.on('mousedown', handlePressStart);
      map.on('mouseup', handlePressEnd);
      map.on('touchstart', handlePressStart);
      map.on('touchend', handlePressEnd);

      // Selección por toque simple (tap/click)
      // Restaura soporte de tap/click para seleccionar rápidamente
      map.on('click', function(e) {
        const latlng = e.latlng;
        if (!latlng) return;
        marker.setLatLng(latlng);
        sendMessage({ type: 'tap', lat: latlng.lat, lng: latlng.lng });
      });

      // Mensajes desde React Native para setear marcador
      document.addEventListener('message', handleRNMessage);
      window.addEventListener('message', handleRNMessage);
      function handleRNMessage(event) {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'setMarker' && data.lat && data.lng) {
            marker.setLatLng([data.lat, data.lng]);
            map.setView([data.lat, data.lng], 15, { animate: true });
            // Bloquear temporalmente la propagación de click/tap después de set programático
            const blockUntil = Date.now() + 500;
            const blocker = function(e) {
              if (Date.now() < blockUntil) {
                e.originalEvent && e.originalEvent.stopPropagation && e.originalEvent.stopPropagation();
                e.originalEvent && e.originalEvent.preventDefault && e.originalEvent.preventDefault();
                return;
              }
              map.off('click', blocker);
            };
            map.on('click', blocker);
          }
        } catch (_) {}
      }
    </script>
  </body>
</html>`
}

const styles = StyleSheet.create({
    actions: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between'
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center'
    },
    primary: { backgroundColor: '#2563eb' },
    secondary: { backgroundColor: '#6B7280' },
    btnText: { color: '#fff', fontWeight: '600' },
    loading: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    fabLeft: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: '#FFFFFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    fabRight: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    attribution: {
        position: 'absolute',
        bottom: 8,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    attrText: {
        color: '#475569',
        fontSize: 10
    },
    actionsInline: {
        display: 'none'
    },
    searchContainer: {
        marginTop: 10,
        marginBottom: 10,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center'
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#fff'
    },
    searchButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    resultsContainer: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        zIndex: 10,
        marginTop: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6
    },
    searchBoxWrapper: {
        position: 'relative'
    },
    resultItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    resultText: {
        color: '#334155',
        fontSize: 13
    }
})


