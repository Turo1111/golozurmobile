import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setAlert } from '../redux/alertSlice'
import useLocalStorage from './useLocalStorage'
import { decode as base64Decode } from 'base-64'


// Función personalizada para decodificar JWT en React Native
const decodeJWT = (token) => {
    try {
        // Dividir el token en sus partes
        const parts = token.split('.')
        if (parts.length !== 3) {
            throw new Error('Invalid token format')
        }

        // Decodificar el payload (segunda parte)
        const payload = parts[1]
        const decodedPayload = base64Decode(payload.replace(/-/g, '+').replace(/_/g, '/'))
        return JSON.parse(decodedPayload)
    } catch (error) {
        console.error('Error decoding JWT:', error)
        throw error
    }
}

/**
 * Custom hook para verificar permisos del usuario
 * @param {string} requiredPermission - El permiso requerido para acceder a la funcionalidad
 * @param {function} onNoPermission - Callback opcional que se ejecuta cuando no hay permisos
 * @returns {Object} { hasPermission, isLoading, userPermissions }
 */
const usePermissionCheck = (requiredPermission, onNoPermission = null) => {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()
    const [hasPermission, setHasPermission] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkPermission = () => {
            const token = user.token || userStorage.token

            if (!token) {
                setHasPermission(false)
                setIsLoading(false)
                return
            }

            try {
                const decodedToken = decodeJWT(token)

                // Obtener los permisos del rol
                const userRole = decodedToken.role
                const permissions = userRole?.permissions || []

                // Verificamos si el usuario tiene el permiso requerido
                const hasRequiredPermission = permissions.includes(requiredPermission)

                setHasPermission(hasRequiredPermission)

                if (!hasRequiredPermission && onNoPermission) {
                    onNoPermission()
                } else if (!hasRequiredPermission) {
                    dispatch(setAlert({
                        message: 'No tienes permisos para acceder a esta función',
                        type: 'error'
                    }))
                }
            } catch (error) {
                console.error('Error decoding token:', error)
                setHasPermission(false)
                dispatch(setAlert({
                    message: 'Error al verificar permisos',
                    type: 'error'
                }))
            } finally {
                setIsLoading(false)
            }
        }

        checkPermission()
    }, [user.token, userStorage.token, requiredPermission, dispatch, onNoPermission])

    return { hasPermission, isLoading }
}

export default usePermissionCheck 