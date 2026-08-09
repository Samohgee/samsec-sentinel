/*
  SAMSEC LABS — shared Supabase client + helpers
  Loaded via module so every page reads from one configured instance.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm';

const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '';
const SUPABASE_ANON_KEY = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase configuration missing. Make sure window.SUPABASE_CONFIG is set before this script loads.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

export const WHATSAPP_NUMBER = '2348050765940';
export const ADMIN_EMAIL = 'admin@samseclabs.com';

export const SERVICES = [
    { slug: 'penetration-testing', name: 'Penetration Testing', icon: 'shield', description: 'Simulated attacks that expose real-world weaknesses in your applications and infrastructure before adversaries do.' },
    { slug: 'vulnerability-assessment', name: 'Vulnerability Assessment', icon: 'search', description: 'Comprehensive scanning and manual review to map, prioritize, and remediate vulnerabilities across your estate.' },
    { slug: 'web-development', name: 'Web Development', icon: 'globe', description: 'Secure, high-performance websites and web apps engineered with modern stacks and defense-in-depth from day one.' },
    { slug: 'mobile-app-development', name: 'Mobile App Development', icon: 'device-mobile', description: 'Native and cross-platform mobile apps built with encrypted storage, secure APIs, and polished UX.' },
    { slug: 'ai-chatbot-development', name: 'AI Chatbot Development', icon: 'cpu', description: 'Custom AI assistants trained on your knowledge base to automate support, triage, and operations.' },
    { slug: 'whatsapp-bot-development', name: 'WhatsApp Bot Development', icon: 'message-circle', description: 'Automated WhatsApp workflows for sales, support, and onboarding with secure backend integration.' },
    { slug: 'telegram-bot-development', name: 'Telegram Bot Development', icon: 'send', description: 'Lightweight Telegram bots for alerts, automation, and community engagement with API-first architecture.' },
    { slug: 'security-consulting', name: 'Security Consulting', icon: 'book-open', description: 'Architecture reviews, governance programs, and compliance roadmaps tailored to your business.' },
    { slug: 'malware-removal', name: 'Malware Removal', icon: 'alert-triangle', description: 'Rapid containment, forensic investigation, and full remediation of malware and compromise.' },
    { slug: 'website-maintenance', name: 'Website Maintenance', icon: 'tool', description: 'Ongoing patches, monitoring, backups, and performance tuning to keep your sites secure and fast.' },
    { slug: 'cloud-security', name: 'Cloud Security', icon: 'cloud', description: 'Identity, network, secrets, and posture hardening across AWS, Azure, and GCP environments.' },
];

export function whatsappLink(message) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

export function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export async function submitServiceRequest(payload) {
    const { data, error } = await supabase.rpc('submit_service_request', { payload });
    if (error) throw error;
    return data;
}

export async function submitContactMessage(payload) {
    const { data, error } = await supabase.rpc('submit_contact_message', { payload });
    if (error) throw error;
    return data;
}

export async function fetchPublishedPosts() {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, author, cover_url, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function fetchPostBySlug(slug) {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
    if (error) throw error;
    return data;
}
