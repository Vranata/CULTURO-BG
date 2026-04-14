import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FRONTEND_URL = 'https://frontend-culturo-bg.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const TEXTS = {
  success: 'Успешно',
  error: 'Грешка',
  missingParams: 'Липсват задължителни параметри (action, requestId или userId).',
  invalidAction: 'Невалидно действие. Използвайте approve или reject.',
  notFound: 'Заявката не бе намерена в базата данни.',
  alreadyProcessed: 'Тази заявка вече е била обработена.',
  approved: 'Потребителят бе успешно повишен в Special User!',
  rejected: 'Заявката бе успешно отхвърлена.',
};

function redirectResponse(type: 'success' | 'error' | 'info' | 'warning', text: string) {
  const url = new URL(`${FRONTEND_URL}/admin-message`);
  url.searchParams.set('type', type);
  url.searchParams.set('text', text);
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': url.toString(),
    },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const requestId = url.searchParams.get('request_id');
    const authUserId = url.searchParams.get('auth_user_id');

    if (!action || !requestId || !authUserId) {
      return redirectResponse('error', TEXTS.missingParams);
    }

    if (action !== 'approve' && action !== 'reject') {
      return redirectResponse('error', TEXTS.invalidAction);
    }

    // 1. Fetch request status
    const { data: requestRow, error: fetchError } = await supabase
      .from('user_upgrade_requests')
      .select('status')
      .eq('id_request', requestId)
      .single();

    if (fetchError || !requestRow) {
      return redirectResponse('error', TEXTS.notFound);
    }

    if (requestRow.status !== 'pending') {
      return redirectResponse('info', `${TEXTS.alreadyProcessed} (${requestRow.status})`);
    }

    // 2. Perform action
    if (action === 'approve') {
      const { error: upgradeError } = await supabase
        .from('users')
        .update({ id_category: 2 })
        .eq('auth_user_id', authUserId);

      if (upgradeError) {
        return redirectResponse('error', upgradeError.message);
      }
    }

    // 3. Update request status
    const { error: updateError } = await supabase
      .from('user_upgrade_requests')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id_request', requestId);

    if (updateError) {
      return redirectResponse('error', updateError.message);
    }

    return redirectResponse('success', action === 'approve' ? TEXTS.approved : TEXTS.rejected);

  } catch (err: any) {
    return redirectResponse('error', err.message || String(err));
  }
});
