/// <reference path="./types.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors';

type UpgradeRequestBody = {
  applicantName?: string;
  applicantEmail?: string;
  specialtyCategory?: string;
  specialtyCategoryId?: number;
  applicantType?: 'person' | 'company';
  companyIdentifier?: string | null;
  reason?: string;
  submittedByEmail?: string;
  submittedByRole?: string;
};

const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? 'culturobg@gmail.com';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvamluZmtubGZvY2p0dHhpcnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk2NDM1MywiZXhwIjoyMDkwNTQwMzUzfQ.JFcmF2Qz4ZmEsghsioMFYXVHxXxiuF2MSIqdpwVvTcc';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildInviteAliasEmail = (email: string) => {
  const atIndex = email.indexOf('@');

  if (atIndex === -1) {
    return email;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  return `${localPart}+upgrade-request-${uniqueSuffix}@${domainPart}`;
};

const collectNotificationRecipients = (email: string) => {
  const recipients = [email, buildInviteAliasEmail(email)];

  return recipients.filter((recipient, index) => recipients.indexOf(recipient) === index);
};

Deno.serve(async (request: Request) => {
  try {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(500, { error: 'Missing Supabase environment variables.' });
    }

    if (!serviceRoleKey) {
      return jsonResponse(500, {
        error: 'Missing service role key. Set SERVICE_ROLE_KEY in Supabase secrets.',
      });
    }

    const payload = (await request.json()) as UpgradeRequestBody;
    const applicantName = payload.applicantName?.trim() || 'Потребител';
    const applicantEmail = payload.applicantEmail?.trim() || '';
    const specialtyCategory = payload.specialtyCategory?.trim() || 'Неизбрана категория';
    const applicantType = payload.applicantType === 'company' ? 'Фирма' : 'Лице';
    const companyIdentifier = payload.applicantType === 'company' ? payload.companyIdentifier?.trim() || '-' : '-';
    const reason = payload.reason?.trim() || '-';
    const submittedByEmail = payload.submittedByEmail?.trim() || '-';
    const submittedByRole = payload.submittedByRole?.trim() || '-';

    const inviteMetadata = {
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      specialty_category: specialtyCategory,
      specialty_category_id: String(payload.specialtyCategoryId ?? ''),
      applicant_type: applicantType,
      company_identifier: companyIdentifier,
      reason,
      submitted_by_email: submittedByEmail,
      submitted_by_role: submittedByRole,
    };

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const redirectTo = request.headers.get('origin') ? `${request.headers.get('origin')}/login` : undefined;
    const notificationRecipients = collectNotificationRecipients(adminEmail);
    let lastInviteError: Error | null = null;

    for (const recipientEmail of notificationRecipients) {
      const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(recipientEmail, {
        data: inviteMetadata,
        redirectTo,
      });

      if (!inviteError) {
        return jsonResponse(200, { ok: true });
      }

      lastInviteError = new Error(inviteError.message);
    }

    return jsonResponse(502, {
      error: 'Failed to send upgrade request email.',
      details: lastInviteError?.message ?? 'Unknown invite error.',
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, {
      error: 'Unexpected error while sending upgrade request email.',
      details,
    });
  }
});
