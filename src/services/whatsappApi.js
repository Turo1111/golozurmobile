import apiClient from '../utils/client'

/**
 * Contrato HTTP de la sección WhatsApp Automatizado.
 * Todas las rutas viven en `gzapi` sin prefijo `/api`.
 */

export const getServiceState = () => apiClient.get('/whatsappService/state')

export const updateServiceConfig = (payload) => apiClient.put('/whatsappService/config', payload)

export const sendServiceCommand = (type, payload = {}) =>
  apiClient.post('/whatsappService/command', { type, payload })

export const getDispatchLogs = (groupId) =>
  apiClient.get('/whatsappService/logs', { params: groupId ? { groupId } : {} })

export const getGroups = () => apiClient.get('/whatsappGroup')

export const getGroup = (groupId) => apiClient.get(`/whatsappGroup/${groupId}`)

export const createGroup = (payload) => apiClient.post('/whatsappGroup', payload)

export const updateGroup = (groupId, payload) => apiClient.put(`/whatsappGroup/${groupId}`, payload)

export const deleteGroup = (groupId) => apiClient.delete(`/whatsappGroup/${groupId}`)

export const setGroupClients = (groupId, clientIds, mode = 'replace') =>
  apiClient.put(`/whatsappGroup/${groupId}/clients`, { clientIds, mode })

export const getWhatsappClients = (filters = {}) =>
  apiClient.post('/client/whatsapp-list', { limit: 1000, ...filters })

export const backfillRegions = (payload = {}) =>
  apiClient.post('/client/backfill-regions', payload, { timeout: 120000 })

export const updateClientPhones = (clientId, payload) =>
  apiClient.patch(`/client/${clientId}`, payload)
