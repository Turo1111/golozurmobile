// Feature flags for the current release.
//
// WhatsApp automation (Fase 1) is not deployed to production yet: gzapi still
// lacks the groups/service/worker endpoints, so the screens stay hidden even
// for admins. Flip to true once those endpoints are live.
export const WHATSAPP_AUTOMATION_ENABLED = false;
