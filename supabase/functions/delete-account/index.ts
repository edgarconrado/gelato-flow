// supabase/functions/delete-account/index.ts
// Elimina completamente la cuenta del usuario — auth + datos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── 1. Verificar que el usuario está autenticado ──────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Cliente con JWT del usuario para verificar identidad
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Token inválido' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // ── 2. Cliente admin para borrar todo ────────────────────
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // ── 3. Obtener store_id del usuario ──────────────────────
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single()

        // ── 4. Si es owner, borrar la tienda y todos sus datos ───
        if (profile?.role === 'owner' && profile?.store_id) {
            const storeId = profile.store_id

            // Primero obtenemos los IDs de ventas para borrar sale_items
            const { data: sales } = await supabaseAdmin
                .from('sales')
                .select('id')
                .eq('store_id', storeId)

            if (sales && sales.length > 0) {
                const saleIds = sales.map((s: any) => s.id)
                await supabaseAdmin.from('sale_items').delete().in('sale_id', saleIds)
            }

            await supabaseAdmin.from('sales').delete().eq('store_id', storeId)
            await supabaseAdmin.from('expenses').delete().eq('store_id', storeId)
            await supabaseAdmin.from('products').delete().eq('store_id', storeId)
            await supabaseAdmin.from('categories').delete().eq('store_id', storeId)
            await supabaseAdmin.from('store_invitations').delete().eq('store_id', storeId)
            await supabaseAdmin.from('profiles').delete().eq('store_id', storeId)
            await supabaseAdmin.from('stores').delete().eq('id', storeId)

        } else {
            // Si es empleado, solo borrar su perfil
            await supabaseAdmin.from('profiles').delete().eq('id', user.id)
        }

        // ── 5. Borrar el usuario de auth.users ───────────────────
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (deleteError) throw new Error(`Error borrando usuario: ${deleteError.message}`)

        console.log(`[delete-account] ✅ Usuario ${user.id} eliminado completamente`)

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error('[delete-account] Error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})