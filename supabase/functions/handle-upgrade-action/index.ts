import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const htmlResponse = (msg: string, isError = false) => {
  const color = isError ? '#dc3545' : '#28a745';
  // Грешка / Успешно
  const title = isError ? '\u0413\u0440\u0435\u0448\u043a\u0430' : '\u0423\u0441\u043f\u0435\u0448\u043d\u043e';
  // Можете да затворите този прозорец.
  const footer = '\u041c\u043e\u0436\u0435\u0442\u0435 \u0434\u0430 \u0437\u0430\u0442\u0432\u043e\u0440\u0438\u0442\u0435 \u0442\u043e\u0437\u0438 \u043f\u0440\u043e\u0437\u043e\u0440\u0435\u0446.';
  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CULTURO BG Administration</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8f9fa; }
    .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
    h1 { color: ${color}; margin-top: 0; }
    p { color: #555; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${msg}</p>
    <p style="margin-top: 30px; font-size: 12px; color: #aaa;">${footer}</p>
  </div>
</body>
</html>`;
  const body = new TextEncoder().encode(html);
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const requestId = url.searchParams.get('request_id');
    const authUserId = url.searchParams.get('auth_user_id');

    if (!action || !requestId || !authUserId) {
      // Липсват задължителни параметри (action, request_id или auth_user_id).
      return htmlResponse('\u041b\u0438\u043f\u0441\u0432\u0430\u0442 \u0437\u0430\u0434\u044a\u043b\u0436\u0438\u0442\u0435\u043b\u043d\u0438 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u0438 (action, request_id \u0438\u043b\u0438 auth_user_id).', true);
    }

    if (action !== 'approve' && action !== 'reject') {
      // Невалидно действие. Използвайте approve или reject.
      return htmlResponse('\u041d\u0435\u0432\u0430\u043b\u0438\u0434\u043d\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u0418\u0437\u043f\u043e\u043b\u0437\u0432\u0430\u0439\u0442\u0435 approve \u0438\u043b\u0438 reject.', true);
    }

    // Checking if the request is still pending
    const { data: requestRow, error: fetchError } = await supabase
      .from('user_upgrade_requests')
      .select('status')
      .eq('id_request', requestId)
      .single();

    if (fetchError || !requestRow) {
      // Не може да бъде намерена заявката. Възможно е да е била изтрита.
      return htmlResponse('\u041d\u0435 \u043c\u043e\u0436\u0435 \u0434\u0430 \u0431\u044a\u0434\u0435 \u043d\u0430\u043c\u0435\u0440\u0435\u043d\u0430 \u0437\u0430\u044f\u0432\u043a\u0430\u0442\u0430. \u0412\u044a\u0437\u043c\u043e\u0436\u043d\u043e \u0435 \u0434\u0430 \u0435 \u0431\u0438\u043b\u0430 \u0438\u0437\u0442\u0440\u0438\u0442\u0430.', true);
    }

    if (requestRow.status !== 'pending') {
      // Тази заявка вече е обработена (текущ статус: ...).
      return htmlResponse(`\u0422\u0430\u0437\u0438 \u0437\u0430\u044f\u0432\u043a\u0430 \u0432\u0435\u0447\u0435 \u0435 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0435\u043d\u0430 (\u0442\u0435\u043a\u0443\u0449 \u0441\u0442\u0430\u0442\u0443\u0441: ${requestRow.status}).`, true);
    }

    if (action === 'approve') {
      // 1. Update the user role to Special User (category 2)
      const { error: upgradeError } = await supabase
        .from('users')
        .update({ id_category: 2 })
        .eq('auth_user_id', authUserId);

      if (upgradeError) {
        // Грешка при обновяване на ролята: ...
        return htmlResponse(`\u0413\u0440\u0435\u0448\u043a\u0430 \u043f\u0440\u0438 \u043e\u0431\u043d\u043e\u0432\u044f\u0432\u0430\u043d\u0435 \u043d\u0430 \u0440\u043e\u043b\u044f\u0442\u0430: ${upgradeError.message}`, true);
      }
    }

    // 2. Update the request status
    const { error: statusError } = await supabase
      .from('user_upgrade_requests')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id_request', requestId);

    if (statusError) {
      // Грешка при промяна на статуса: ...
      return htmlResponse(`\u0413\u0440\u0435\u0448\u043a\u0430 \u043f\u0440\u0438 \u043f\u0440\u043e\u043c\u044f\u043d\u0430 \u043d\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430: ${statusError.message}`, true);
    }

    // Потребителят е успешно повишен до Special User! Статусът на заявката е обновен.
    // Заявката е отхвърлена успешно.
    return htmlResponse(action === 'approve' 
      ? '\u041f\u043e\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043b\u044f\u0442 \u0435 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043f\u043e\u0432\u0438\u0448\u0435\u043d \u0434\u043e Special User! \u0421\u0442\u0430\u0442\u0443\u0441\u044a\u0442 \u043d\u0430 \u0437\u0430\u044f\u0432\u043a\u0430\u0442\u0430 \u0435 \u043e\u0431\u043d\u043e\u0432\u0435\u043d.' 
      : '\u0417\u0430\u044f\u0432\u043a\u0430\u0442\u0430 \u0435 \u043e\u0442\u0445\u0432\u044a\u0440\u043b\u0435\u043d\u0430 \u0443\u0441\u043f\u0435\u0448\u043d\u043e.');

  } catch (error) {
    // Неочаквана грешка: ...
    return htmlResponse(`\u041d\u0435\u043e\u0447\u0430\u043a\u0432\u0430\u043d\u0430 \u0433\u0440\u0435\u0448\u043a\u0430: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});
