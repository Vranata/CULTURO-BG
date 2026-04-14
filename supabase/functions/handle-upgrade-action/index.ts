import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FRONTEND_URL = 'https://frontend-culturo-bg.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function redirectResponse(type: 'success' | 'error' | 'info' | 'warning', text: string, debug?: string, targetId?: string) {
  const url = new URL(`${FRONTEND_URL}/admin-result`);
  url.searchParams.set('type', type);
  url.searchParams.set('text', text);
  if (debug) url.searchParams.set('debug', debug);
  if (targetId) url.searchParams.set('target_id', targetId);
  
  return new Response(null, {
    status: 302,
    headers: { 'Location': url.toString() },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const requestId = url.searchParams.get('request_id');
    const authUserId = url.searchParams.get('auth_user_id');

    if (!action || !requestId || !authUserId) {
      return redirectResponse('error', 'Липсват параметри.');
    }

    const { data: requestRow, error: fetchError } = await supabase
      .from('user_upgrade_requests')
      .select('*')
      .eq('id_request', requestId)
      .single();

    if (fetchError || !requestRow) return redirectResponse('error', 'Заявката не е намерена.');

    if (action === 'approve') {
       const { error: upgradeError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: authUserId,
          email: requestRow.applicant_email,
          name_user: requestRow.applicant_name,
          id_category: 2, // Special_user
          password_hash: 'supabase_auth_managed_placeholder',
          id_region: 0,
          profile_onboarding_completed: true
        }, { onConflict: 'auth_user_id' });

      if (upgradeError) return redirectResponse('error', `Грешка при ъпгрейд: ${upgradeError.message}`, undefined, authUserId);

      // Verify the write
      const { data: verifiedUser } = await supabase
        .from('users')
        .select('id_category')
        .eq('auth_user_id', authUserId)
        .single();
      
      const debugResult = verifiedUser 
        ? `DB_Verified_RoleID: ${verifiedUser.id_category}`
        : `VERIFICATION_FAILED_NOT_FOUND`;

      await supabase.from('user_upgrade_requests').update({ status: 'approved' }).eq('id_request', requestId);
      
      return redirectResponse('success', `Успешно одобрихте ${requestRow.applicant_email}`, debugResult, authUserId);
    }

    if (action === 'reject') {
      await supabase.from('user_upgrade_requests').update({ status: 'rejected' }).eq('id_request', requestId);
      return redirectResponse('success', 'Заявката е отхвърлена.', undefined, authUserId);
    }

    return redirectResponse('error', 'Невалидно действие.');

  } catch (err: any) {
    return redirectResponse('error', err.message || String(err), undefined, 'error');
  }
});
