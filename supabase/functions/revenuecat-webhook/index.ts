// supabase/functions/revenuecat-webhook/index.ts
// Edge Function que recibe eventos de RevenueCat y sincroniza Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Tipos de eventos de RevenueCat ────────────────────────────
type RCEvent =
  | 'INITIAL_PURCHASE'      // Primera compra
  | 'RENEWAL'               // Renovación exitosa
  | 'PRODUCT_CHANGE'        // Cambio de plan
  | 'CANCELLATION'          // Usuario canceló (sigue activo hasta fin de período)
  | 'BILLING_ISSUE'         // Pago fallido
  | 'EXPIRATION'            // Suscripción expiró definitivamente
  | 'SUBSCRIBER_ALIAS'      // Alias de usuario
  | 'UNCANCELLATION'        // Usuario reactivó antes de expirar
  | 'TRANSFER'              // Transferencia entre usuarios

interface RCWebhookBody {
  event: {
    type: RCEvent
    app_user_id: string           // Este es el store_id de Supabase
    expiration_at_ms: number | null
    purchased_at_ms: number
    product_id: string
    period_type: 'NORMAL' | 'TRIAL' | 'INTRO'
  }
  api_version: string
}

serve(async (req: Request) => {
  // ── 1. Verificar método ──────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ── 2. Verificar Authorization header de RevenueCat ──────────
  const authHeader = req.headers.get('Authorization')
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')

  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    console.error('[RC Webhook] Unauthorized request')
    return new Response('Unauthorized', { status: 401 })
  }

  // ── 3. Parsear body ──────────────────────────────────────────
  let body: RCWebhookBody
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { type, app_user_id, expiration_at_ms } = body.event
  const storeId = app_user_id  // En useSubscription usamos store_id como appUserID

  console.log(`[RC Webhook] Evento: ${type} | Store: ${storeId}`)

  // ── 4. Crear cliente de Supabase con service_role ────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // ── 5. Determinar nuevo status según evento ──────────────────
  let newStatus: string | null = null
  let newExpiresAt: string | null = null

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      // Suscripción activa o renovada
      newStatus = 'pro'
      newExpiresAt = expiration_at_ms
        ? new Date(expiration_at_ms).toISOString()
        : null
      break

    case 'CANCELLATION':
      // Canceló pero sigue activo hasta que expire
      // No cambiamos a 'free' todavía — lo hace EXPIRATION
      // Solo registramos la fecha de expiración para informar al usuario
      newStatus = 'pro'
      newExpiresAt = expiration_at_ms
        ? new Date(expiration_at_ms).toISOString()
        : null
      break

    case 'BILLING_ISSUE':
      // Pago fallido — mantenemos 'pro' pero RevenueCat reintentará
      // Solo logueamos, no cambiamos status todavía
      console.log(`[RC Webhook] Problema de pago para store: ${storeId}`)
      return new Response(JSON.stringify({ received: true, action: 'billing_issue_logged' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    case 'EXPIRATION':
      // Suscripción expiró definitivamente → pasar a free
      newStatus = 'free'
      newExpiresAt = null
      break

    default:
      // Evento no relevante (TRANSFER, SUBSCRIBER_ALIAS, etc.)
      console.log(`[RC Webhook] Evento ignorado: ${type}`)
      return new Response(JSON.stringify({ received: true, action: 'ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  }

  // ── 6. Actualizar Supabase ───────────────────────────────────
  if (newStatus && storeId) {
    const { error } = await supabase
      .from('stores')
      .update({
        subscription_status: newStatus,
        subscription_expires_at: newExpiresAt,
      })
      .eq('id', storeId)

    if (error) {
      console.error(`[RC Webhook] Error al actualizar store ${storeId}:`, error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`[RC Webhook] ✅ Store ${storeId} → ${newStatus}`)
  }

  return new Response(
    JSON.stringify({ received: true, store_id: storeId, new_status: newStatus }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
