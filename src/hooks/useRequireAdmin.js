import { useEffect } from 'react'
import useLocalStorage from './useLocalStorage'
import { useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'

/**
 * F1-D16: la sección WhatsApp Automatizado es solo para rol `admin`.
 * Si el rol cargado no es admin, vuelve atrás sin bloquear la navegación
 * normal de la app.
 */
export default function useRequireAdmin (navigation) {
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const roleName = userStorage?.nameRole || user?.nameRole || null
  const isAdmin = roleName === 'admin'

  useEffect(() => {
    if (roleName !== null && !isAdmin) {
      navigation.goBack()
    }
  }, [isAdmin, navigation, roleName])

  return { isAdmin, roleName }
}
