import { supabase, SERVICES, formatDate, whatsappLink } from './supabase.js';

const loadingState = document.getElementById('loadingState');
const adminContent = document.getElementById('adminContent');
const adminBadge = document.getElementById('adminBadge');
const logoutBtn = document.getElementById('logoutBtn');

let allRequests = [];
let allMessages = [];
let allPosts = [];
let currentRequest = null;
let currentMessage = null;
let editingPostId = null;

const STATUS_LABELS = {
    new: 'New',
    in_progress: 'In Progress',
    completed: 'Completed',
    declined: 'Declined',
};

function badgeClass(status) {
    return ({
        new: 'badge-new',
        in_progress: 'badge-progress',
        completed: 'badge-done',
        declined: 'badge-declined',
    })[status] || 'badge-new';
}

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function requireAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('login.html');
        return null;
    }
    const { data: isAdmin, error } = await supabase.rpc('is_admin');
    if (error || !isAdmin) {
        window.location.replace('login.html');
        return null;
    }
    const email = session.user.email;
    adminBadge.textContent = email;
    loadingState.hidden = true;
    adminContent.hidden = false;
    return session;
}

async function loadRequests() {
    const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    allRequests = data || [];
    renderRequests();
    renderDashboard();
    renderClients();
    renderAnalytics();
}

async function loadMessages() {
    const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    allMessages = data || [];
    renderMessages();
    renderDashboard();
}

async function loadPosts() {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    allPosts = data || [];
    renderPosts();
}

function renderDashboard() {
    document.getElementById('mTotal').textContent = allRequests.length;
    document.getElementById('mNew').textContent = allRequests.filter((r) => r.status === 'new').length;
    document.getElementById('mDone').textContent = allRequests.filter((r) => r.status === 'completed').length;
    document.getElementById('mMsg').textContent = allMessages.length;

    const recent = allRequests.slice(0, 5);
    const recentEl = document.getElementById('recentRequests');
    recentEl.innerHTML = recent.length
        ? recent.map((r) => `
            <div class="status-item">
                <span><strong>${esc(r.request_id)}</strong> · ${esc(r.full_name)}</span>
                <span class="badge ${badgeClass(r.status)}">${STATUS_LABELS[r.status] || r.status}</span>
            </div>`).join('')
        : '<p class="empty-row">No requests yet.</p>';

    const counts = {};
    allRequests.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const statusEl = document.getElementById('statusBreakdown');
    statusEl.innerHTML = Object.keys(counts).length
        ? Object.entries(counts).map(([k, v]) => `
            <div class="status-item">
                <span class="badge ${badgeClass(k)}">${STATUS_LABELS[k] || k}</span>
                <strong>${v}</strong>
            </div>`).join('')
        : '<p class="empty-row">No data yet.</p>';
}

function renderRequests() {
    const q = (document.getElementById('requestSearch')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('requestStatusFilter')?.value || '';
    let rows = allRequests;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (q) rows = rows.filter((r) =>
        [r.request_id, r.full_name, r.email, r.service, r.phone, r.company]
            .some((v) => String(v || '').toLowerCase().includes(q)));

    const body = document.getElementById('requestsBody');
    body.innerHTML = rows.length
        ? rows.map((r) => `
            <tr>
                <td>${esc(r.request_id)}</td>
                <td>${esc(r.full_name)}</td>
                <td>${esc(r.service)}</td>
                <td>${esc(r.contact_method)}</td>
                <td><span class="badge ${badgeClass(r.status)}">${STATUS_LABELS[r.status] || r.status}</span></td>
                <td>${formatDate(r.created_at)}</td>
                <td><button class="btn-action" data-req="${r.id}">View</button></td>
            </tr>`).join('')
        : '<tr><td colspan="7" class="empty-row">No requests found.</td></tr>';

    body.querySelectorAll('[data-req]').forEach((btn) => {
        btn.addEventListener('click', () => openRequest(btn.dataset.req));
    });
}

function renderMessages() {
    const body = document.getElementById('messagesBody');
    body.innerHTML = allMessages.length
        ? allMessages.map((m) => `
            <tr>
                <td>${esc(m.name)}</td>
                <td>${esc(m.email)}</td>
                <td>${esc(m.subject || '—')}</td>
                <td><span class="badge ${m.status === 'new' ? 'badge-new' : 'badge-done'}">${esc(m.status)}</span></td>
                <td>${formatDate(m.created_at)}</td>
                <td><button class="btn-action" data-msg="${m.id}">View</button></td>
            </tr>`).join('')
        : '<tr><td colspan="6" class="empty-row">No messages yet.</td></tr>';

    body.querySelectorAll('[data-msg]').forEach((btn) => {
        btn.addEventListener('click', () => openMessage(btn.dataset.msg));
    });
}

function renderClients() {
    const q = (document.getElementById('clientSearch')?.value || '').toLowerCase();
    const map = {};
    allRequests.forEach((r) => {
        const key = r.email.toLowerCase();
        if (!map[key]) map[key] = { name: r.full_name, email: r.email, phone: r.phone, company: r.company, count: 0, latest: r.service, latestDate: r.created_at };
        map[key].count += 1;
        if (new Date(r.created_at) > new Date(map[key].latestDate)) {
            map[key].latest = r.service;
            map[key].latestDate = r.created_at;
        }
    });
    let clients = Object.values(map);
    if (q) clients = clients.filter((c) => [c.name, c.email, c.company].some((v) => String(v || '').toLowerCase().includes(q)));
    clients.sort((a, b) => b.count - a.count);

    const body = document.getElementById('clientsBody');
    body.innerHTML = clients.length
        ? clients.map((c) => `
            <tr>
                <td>${esc(c.name)}</td>
                <td>${esc(c.email)}</td>
                <td>${esc(c.phone)}</td>
                <td>${esc(c.company || '—')}</td>
                <td>${c.count}</td>
                <td>${esc(c.latest)}</td>
            </tr>`).join('')
        : '<tr><td colspan="6" class="empty-row">No clients yet.</td></tr>';
}

function renderPosts() {
    const body = document.getElementById('blogBody');
    body.innerHTML = allPosts.length
        ? allPosts.map((p) => `
            <tr>
                <td>${esc(p.title)}</td>
                <td>${esc(p.slug)}</td>
                <td><span class="badge ${p.status === 'published' ? 'badge-done' : 'badge-draft'}">${esc(p.status)}</span></td>
                <td>${p.published_at ? formatDate(p.published_at) : '—'}</td>
                <td>
                    <button class="btn-action" data-edit="${p.id}">Edit</button>
                    <button class="btn-action" data-del="${p.id}">Delete</button>
                </td>
            </tr>`).join('')
        : '<tr><td colspan="5" class="empty-row">No posts yet.</td></tr>';

    body.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openPost(btn.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => deletePost(btn.dataset.del)));
}

function renderAnalytics() {
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        last7.push(d);
    }
    const counts = last7.map((d) => {
        const next = new Date(d); next.setDate(d.getDate() + 1);
        return allRequests.filter((r) => new Date(r.created_at) >= d && new Date(r.created_at) < next).length;
    });
    const max = Math.max(1, ...counts);
    const points = counts.map((c, i) => `${20 + i * 40},${130 - (c / max) * 100}`).join(' ');
    document.getElementById('requestsChart').innerHTML = `<polyline points="${points}" fill="none" stroke="#00c8ff" stroke-width="2"/>`;

    const byService = {};
    allRequests.forEach((r) => { byService[r.service] = (byService[r.service] || 0) + 1; });
    const sorted = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxCount = Math.max(1, ...sorted.map((s) => s[1]));
    document.getElementById('serviceBreakdown').innerHTML = sorted.length
        ? sorted.map(([name, count]) => `
            <div class="traffic-item">
                <span>${esc(name)}</span>
                <div class="progress-bar"><div class="progress-fill" style="width:${(count / maxCount) * 100}%"></div></div>
                <span>${count}</span>
            </div>`).join('')
        : '<p class="empty-row">No data yet.</p>';
}

function openRequest(id) {
    currentRequest = allRequests.find((r) => r.id === id);
    if (!currentRequest) return;
    const r = currentRequest;
    document.getElementById('requestDetail').innerHTML = `
        <h2>${esc(r.request_id)}</h2>
        <p class="label">${esc(r.service)}</p>
        <div class="detail-grid">
            <div class="detail-row"><span>Name</span><strong>${esc(r.full_name)}</strong></div>
            <div class="detail-row"><span>Email</span><strong>${esc(r.email)}</strong></div>
            <div class="detail-row"><span>Phone</span><strong>${esc(r.phone)}</strong></div>
            <div class="detail-row"><span>Company</span><strong>${esc(r.company || '—')}</strong></div>
            <div class="detail-row"><span>Budget</span><strong>${esc(r.budget || '—')}</strong></div>
            <div class="detail-row"><span>Contact method</span><strong>${esc(r.contact_method)}</strong></div>
            <div class="detail-row"><span>Status</span><strong>${esc(r.status)}</strong></div>
            <div class="detail-row"><span>Created</span><strong>${formatDate(r.created_at)}</strong></div>
        </div>
        <h3 style="margin-top:1rem">Project description</h3>
        <p class="hero-text">${esc(r.description)}</p>
        <div class="detail-actions">
            <select id="reqStatusSelect" class="filter-select">
                ${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <button class="button button-primary btn-sm" id="reqSaveStatus">Update status</button>
            <a class="button button-secondary btn-sm" href="${whatsappLink(`Hello ${r.full_name}, regarding your request ${r.request_id} (${r.service}).`)}" target="_blank" rel="noopener">WhatsApp client</a>
            <button class="btn-action" id="reqDelete" style="margin-left:auto;color:#ff6b6b;border-color:rgba(255,107,107,0.3)">Delete</button>
        </div>
        <div class="notes-box">
            <label for="reqNotes">Admin notes</label>
            <textarea id="reqNotes" rows="4" placeholder="Internal notes…">${esc(r.notes || '')}</textarea>
            <button class="button button-secondary btn-sm" id="reqSaveNotes" style="margin-top:0.5rem">Save notes</button>
        </div>`;
    document.getElementById('requestModal').classList.add('active');

    document.getElementById('reqSaveStatus').addEventListener('click', () => updateRequestField(r.id, { status: document.getElementById('reqStatusSelect').value }));
    document.getElementById('reqSaveNotes').addEventListener('click', () => updateRequestField(r.id, { notes: document.getElementById('reqNotes').value }));
    document.getElementById('reqDelete').addEventListener('click', () => deleteRequest(r.id));
}

async function updateRequestField(id, patch) {
    const { error } = await supabase.from('service_requests').update(patch).eq('id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    const idx = allRequests.findIndex((r) => r.id === id);
    if (idx >= 0) allRequests[idx] = { ...allRequests[idx], ...patch };
    renderRequests();
    renderDashboard();
    if (currentRequest && currentRequest.id === id) { currentRequest = allRequests[idx]; }
}

async function deleteRequest(id) {
    if (!confirm('Delete this request? This cannot be undone.')) return;
    const { error } = await supabase.from('service_requests').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    allRequests = allRequests.filter((r) => r.id !== id);
    document.getElementById('requestModal').classList.remove('active');
    renderRequests();
    renderDashboard();
    renderClients();
}

function openMessage(id) {
    currentMessage = allMessages.find((m) => m.id === id);
    if (!currentMessage) return;
    const m = currentMessage;
    document.getElementById('messageDetail').innerHTML = `
        <h2>Message from ${esc(m.name)}</h2>
        <div class="detail-grid">
            <div class="detail-row"><span>Email</span><strong>${esc(m.email)}</strong></div>
            <div class="detail-row"><span>Subject</span><strong>${esc(m.subject || '—')}</strong></div>
            <div class="detail-row"><span>Status</span><strong>${esc(m.status)}</strong></div>
            <div class="detail-row"><span>Received</span><strong>${formatDate(m.created_at)}</strong></div>
        </div>
        <h3 style="margin-top:1rem">Message</h3>
        <p class="hero-text">${esc(m.message)}</p>
        <div class="detail-actions">
            <a class="button button-primary btn-sm" href="mailto:${encodeURIComponent(m.email)}">Reply by email</a>
            <button class="btn-action" id="msgMarkDone">Mark handled</button>
            <button class="btn-action" id="msgDelete" style="margin-left:auto;color:#ff6b6b;border-color:rgba(255,107,107,0.3)">Delete</button>
        </div>`;
    document.getElementById('messageModal').classList.add('active');
    document.getElementById('msgMarkDone').addEventListener('click', async () => {
        const { error } = await supabase.from('contact_messages').update({ status: 'handled' }).eq('id', m.id);
        if (error) { alert(error.message); return; }
        const idx = allMessages.findIndex((x) => x.id === m.id);
        if (idx >= 0) allMessages[idx].status = 'handled';
        renderMessages();
        renderDashboard();
        document.getElementById('messageModal').classList.remove('active');
    });
    document.getElementById('msgDelete').addEventListener('click', async () => {
        if (!confirm('Delete this message?')) return;
        const { error } = await supabase.from('contact_messages').delete().eq('id', m.id);
        if (error) { alert(error.message); return; }
        allMessages = allMessages.filter((x) => x.id !== m.id);
        renderMessages();
        renderDashboard();
        document.getElementById('messageModal').classList.remove('active');
    });
}

function openPost(id) {
    editingPostId = id || null;
    const post = id ? allPosts.find((p) => p.id === id) : null;
    document.getElementById('postId').value = post ? post.id : '';
    document.getElementById('postTitle').value = post ? post.title : '';
    document.getElementById('postSlug').value = post ? post.slug : '';
    document.getElementById('postExcerpt').value = post ? (post.excerpt || '') : '';
    document.getElementById('postAuthor').value = post ? (post.author || 'SAMSEC LABS') : 'SAMSEC LABS';
    document.getElementById('postCover').value = post ? (post.cover_url || '') : '';
    document.getElementById('postContent').value = post ? (post.content || '') : '';
    document.getElementById('postStatus').value = post ? post.status : 'draft';
    document.getElementById('postStatusMsg').textContent = '';
    document.getElementById('postModal').classList.add('active');
}

async function savePost(e) {
    e.preventDefault();
    const msg = document.getElementById('postStatusMsg');
    msg.textContent = '';
    msg.className = 'form-status';
    const payload = {
        title: document.getElementById('postTitle').value.trim(),
        slug: document.getElementById('postSlug').value.trim(),
        excerpt: document.getElementById('postExcerpt').value.trim(),
        author: document.getElementById('postAuthor').value.trim(),
        cover_url: document.getElementById('postCover').value.trim() || null,
        content: document.getElementById('postContent').value,
        status: document.getElementById('postStatus').value,
        published_at: document.getElementById('postStatus').value === 'published' ? new Date().toISOString() : null,
    };
    if (!payload.title || !payload.slug) {
        msg.textContent = 'Title and slug are required.';
        msg.classList.add('error');
        return;
    }
    const id = document.getElementById('postId').value;
    let error;
    if (id) {
        ({ error } = await supabase.from('blog_posts').update(payload).eq('id', id));
    } else {
        ({ error } = await supabase.from('blog_posts').insert(payload));
    }
    if (error) {
        msg.textContent = error.message;
        msg.classList.add('error');
        return;
    }
    msg.textContent = 'Saved.';
    msg.classList.add('ok');
    await loadPosts();
    setTimeout(() => document.getElementById('postModal').classList.remove('active'), 600);
}

async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    await loadPosts();
}

function exportCsv() {
    const headers = ['Request ID', 'Name', 'Email', 'Phone', 'Company', 'Service', 'Budget', 'Contact Method', 'Status', 'Notes', 'Created At'];
    const rows = allRequests.map((r) => [r.request_id, r.full_name, r.email, r.phone, r.company, r.service, r.budget, r.contact_method, r.status, r.notes, r.created_at]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samsec-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function wireEvents() {
    const navItems = document.querySelectorAll('.nav-item');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const pageTitle = document.getElementById('pageTitle');
    navItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            navItems.forEach((n) => n.classList.remove('active'));
            item.classList.add('active');
            adminTabs.forEach((t) => t.classList.remove('active'));
            document.getElementById(tabName)?.classList.add('active');
            pageTitle.textContent = item.querySelector('span:last-child').textContent;
        });
    });

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });

    document.getElementById('requestSearch').addEventListener('input', renderRequests);
    document.getElementById('requestStatusFilter').addEventListener('change', renderRequests);
    document.getElementById('clientSearch').addEventListener('input', renderClients);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    document.getElementById('newPostBtn').addEventListener('click', () => openPost(null));
    document.getElementById('postForm').addEventListener('submit', savePost);

    document.getElementById('requestModalClose').addEventListener('click', () => document.getElementById('requestModal').classList.remove('active'));
    document.getElementById('messageModalClose').addEventListener('click', () => document.getElementById('messageModal').classList.remove('active'));
    document.getElementById('postModalClose').addEventListener('click', () => document.getElementById('postModal').classList.remove('active'));
    [document.getElementById('requestModal'), document.getElementById('messageModal'), document.getElementById('postModal')].forEach((m) => {
        m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
    });
}

(async () => {
    const session = await requireAdmin();
    if (!session) return;
    wireEvents();
    await Promise.all([loadRequests(), loadMessages(), loadPosts()]);
})();
