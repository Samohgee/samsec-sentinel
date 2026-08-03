import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const adminEmail = (Deno.env.get('ADMIN_EMAIL') || 'admin@samseclabs.com') as string;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch the most recent service requests created in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRequests, error: reqError } = await supabase
      .from('service_requests')
      .select('request_id, full_name, email, phone, service, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (reqError) throw reqError;

    const { data: recentMessages, error: msgError } = await supabase
      .from('contact_messages')
      .select('name, email, subject, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    const body = [
      'SAMSEC LABS — daily summary',
      '',
      `New service requests (${recentRequests?.length || 0}):`,
      ...(recentRequests || []).map((r: any) =>
        `- ${r.request_id} | ${r.full_name} | ${r.service} | ${r.email} | ${r.phone}`
      ),
      '',
      `New contact messages (${recentMessages?.length || 0}):`,
      ...(recentMessages || []).map((m: any) =>
        `- ${m.name} | ${m.subject || '(no subject)'} | ${m.email}`
      ),
    ].join('\n');

    // Resend is the default transactional mailer for Supabase projects.
    // This is a best-effort notification; if RESEND_API_KEY is absent we log instead.
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SAMSEC LABS <onboarding@resend.dev>',
          to: adminEmail,
          subject: 'SAMSEC LABS — new submissions summary',
          text: body,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Resend failed (${resp.status}): ${text}`);
      }
      return new Response(JSON.stringify({ notified: true, requests: recentRequests?.length || 0, messages: recentMessages?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      notified: false,
      reason: 'RESEND_API_KEY not set; summary logged only.',
      requests: recentRequests?.length || 0,
      messages: recentMessages?.length || 0,
      preview: body,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
