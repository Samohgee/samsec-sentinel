// Lightweight client-side security tools

function randomFrom(array) { return array[Math.floor(Math.random() * array.length)]; }

document.addEventListener('DOMContentLoaded', () => {
    // Password generator
    const pgGenerate = document.getElementById('pg-generate');
    pgGenerate?.addEventListener('click', () => {
        const length = Number(document.getElementById('pg-length').value || 16);
        const useUpper = document.getElementById('pg-uppercase').checked;
        const useLower = document.getElementById('pg-lowercase').checked;
        const useDigits = document.getElementById('pg-digits').checked;
        const useSymbols = document.getElementById('pg-symbols').checked;
        const pool = [];
        if (useUpper) pool.push(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        if (useLower) pool.push(...'abcdefghijklmnopqrstuvwxyz');
        if (useDigits) pool.push(...'0123456789');
        if (useSymbols) pool.push(...'!@#$%^&*()-_=+[]{};:,.<>/?');
        if (pool.length === 0) return alert('Select at least one character class');
        let out = '';
        crypto.getRandomValues(new Uint32Array(length)).forEach((n, i) => {
            out += pool[n % pool.length];
        });
        document.getElementById('pg-result').value = out;
    });

    // Password strength (simple heuristic)
    const psInput = document.getElementById('ps-password');
    psInput?.addEventListener('input', () => {
        const val = psInput.value || '';
        let score = 0;
        if (val.length >= 8) score += 1;
        if (/[A-Z]/.test(val)) score += 1;
        if (/[a-z]/.test(val)) score += 1;
        if (/[0-9]/.test(val)) score += 1;
        if (/[^A-Za-z0-9]/.test(val)) score += 1;
        const scoreEl = document.getElementById('ps-score');
        const feedback = document.getElementById('ps-feedback');
        scoreEl.textContent = `Score: ${score}/5`;
        if (score <= 2) {
            feedback.textContent = 'Weak — use longer passphrases and add mixed characters.';
        } else if (score <= 4) {
            feedback.textContent = 'OK — add symbols or length for stronger protection.';
        } else {
            feedback.textContent = 'Strong — suitable for most accounts.';
        }
    });

    // Hash generator
    document.getElementById('hg-generate')?.addEventListener('click', async () => {
        const input = document.getElementById('hg-input').value || '';
        const algo = document.getElementById('hg-algo').value || 'sha256';
        const enc = new TextEncoder().encode(input);
        let hashBuffer;
        try {
            hashBuffer = await crypto.subtle.digest(algo, enc);
        } catch (e) {
            // fallback for md5 not supported
            if (algo === 'md5') {
                // simple JS md5 implementation (small)
                const md5 = (s) => {
                    return CryptoJS.MD5(s).toString();
                };
                document.getElementById('hg-result').value = md5(input);
                return;
            }
            alert('Hash algorithm not supported in this browser');
            return;
        }
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        document.getElementById('hg-result').value = hashHex;
    });

    // Base64
    document.getElementById('b64-encode')?.addEventListener('click', () => {
        const input = document.getElementById('b64-input').value || '';
        try { document.getElementById('b64-result').value = btoa(unescape(encodeURIComponent(input))); } catch (e) { document.getElementById('b64-result').value = 'Encode error'; }
    });
    document.getElementById('b64-decode')?.addEventListener('click', () => {
        const input = document.getElementById('b64-input').value || '';
        try { document.getElementById('b64-result').value = decodeURIComponent(escape(atob(input))); } catch (e) { document.getElementById('b64-result').value = 'Decode error'; }
    });

    // JWT decode
    document.getElementById('jwt-input')?.addEventListener('input', () => {
        const val = document.getElementById('jwt-input').value || '';
        const out = document.getElementById('jwt-result');
        if (!val.includes('.')) { out.textContent = 'Not a JWT'; return; }
        try {
            const parts = val.split('.');
            const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            out.textContent = JSON.stringify({ header, payload }, null, 2);
        } catch (e) { out.textContent = 'Invalid token'; }
    });

    // URL encode/decode
    document.getElementById('url-encode')?.addEventListener('click', () => {
        const v = document.getElementById('url-input').value || '';
        document.getElementById('url-result').value = encodeURIComponent(v);
    });
    document.getElementById('url-decode')?.addEventListener('click', () => {
        const v = document.getElementById('url-input').value || '';
        try { document.getElementById('url-result').value = decodeURIComponent(v); } catch (e) { document.getElementById('url-result').value = 'Decode error'; }
    });

    // Random token
    document.getElementById('rt-gen')?.addEventListener('click', () => {
        const len = Number(document.getElementById('rt-length').value || 32);
        const arr = new Uint8Array(len);
        crypto.getRandomValues(arr);
        const token = Array.from(arr).map(n => n.toString(16).padStart(2,'0')).join('').slice(0, len);
        document.getElementById('rt-result').value = token;
    });

    // IP lookup (server)
    document.getElementById('ip-lookup')?.addEventListener('click', async () => {
        const host = document.getElementById('ip-host').value || '';
        if (!host) return;
        const res = await fetch(`/api/v1/tools/ip?host=${encodeURIComponent(host)}`);
        const body = await res.json();
        document.getElementById('ip-result').value = JSON.stringify(body);
    });

    // DNS lookup
    document.getElementById('dns-lookup')?.addEventListener('click', async () => {
        const host = document.getElementById('dns-host').value || '';
        if (!host) return;
        const res = await fetch(`/api/v1/tools/dns?host=${encodeURIComponent(host)}`);
        const body = await res.json();
        document.getElementById('dns-result').value = JSON.stringify(body);
    });

    // SSL check
    document.getElementById('ssl-check')?.addEventListener('click', async () => {
        const host = document.getElementById('ssl-host').value || '';
        if (!host) return;
        const res = await fetch(`/api/v1/tools/ssl?host=${encodeURIComponent(host)}`);
        const body = await res.json();
        document.getElementById('ssl-result').value = JSON.stringify(body);
    });

});

// Add a tiny fallback MD5 via CryptoJS if needed (load dynamically)
(function ensureCryptoJS(){
    if (typeof CryptoJS === 'undefined'){
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        s.crossOrigin = 'anonymous';
        document.head.appendChild(s);
    }
})();
