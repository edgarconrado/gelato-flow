// supabase/functions/create-store/index.ts
// Crea la tienda y perfil del owner nuevo — bypasea RLS con service_role

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gelato-secret',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Cliente admin (bypasea RLS) ───────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // ── Leer body ─────────────────────────────────────────────
    const { userId, storeName, storePhone, storeAddress, fullName, email, secret } = await req.json()

    // ── Verificar secret interno ──────────────────────────────
    const expectedSecret = Deno.env.get('CREATE_STORE_SECRET') ?? ''
    if (!secret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!userId || !storeName?.trim() || !email?.trim()) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Verificar que no tenga ya un perfil ───────────────────
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'Este usuario ya tiene un negocio registrado.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Crear tienda (trigger activa trial de 7 días) ─────────
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        name: storeName.trim(),
        phone: storePhone?.trim() || null,
        address: storeAddress?.trim() || null,
      })
      .select()
      .single()

    if (storeError) throw new Error(`Error creando tienda: ${storeError.message}`)

    // ── Crear perfil como owner ───────────────────────────────
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName?.trim() ?? '',
        role: 'owner',
        store_id: store.id,
      })

    if (profileError) {
      // Revertir tienda si el perfil falló
      await supabaseAdmin.from('stores').delete().eq('id', store.id)
      throw new Error(`Error creando perfil: ${profileError.message}`)
    }

    console.log(`[create-store] ✅ Owner ${userId} → Store ${store.id}`)

    return new Response(
      JSON.stringify({ success: true, storeId: store.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[create-store] Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})