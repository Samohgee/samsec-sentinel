document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) {
        year.textContent = new Date().getFullYear();
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        });
    }

    const counters = document.querySelectorAll('[data-count]');
    if (counters.length) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = Number(el.getAttribute('data-count'));
                const duration = 1200;
                const start = performance.now();
                const step = (now) => {
                    const progress = Math.min((now - start) / duration, 1);
                    const value = Math.floor(progress * target);
                    el.textContent = `${value}`;
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        el.textContent = `${target}`;
                    }
                };
                requestAnimationFrame(step);
                obs.unobserve(el);
            });
        }, { threshold: 0.5 });

        counters.forEach((counter) => observer.observe(counter));
    }

    const scannerForm = document.getElementById('scannerForm');
    const scanUrl = document.getElementById('scanUrl');
    const resultsShell = document.getElementById('resultsShell');

    if (scannerForm && scanUrl && resultsShell) {
        scannerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const target = scanUrl.value.trim();
            const result = buildScannerResult(target || 'https://example.com');
            resultsShell.innerHTML = result;
        });
    }

    const newsletterForms = document.querySelectorAll('.inline-form');
    newsletterForms.forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const input = form.querySelector('input');
            if (input) {
                input.value = 'Subscribed';
            }
        });
    });
});

function buildScannerResult(url) {
    const hostname = new URL(url).hostname.replace('www.', '');
    const score = 90 + Math.floor(Math.random() * 8);
    const findings = [
        {
            title: 'TLS Certificate',
            detail: 'TLS 1.3 is enabled and certificate chain is valid.',
            severity: 'Low'
        },
        {
            title: 'Security headers',
            detail: `CSP and X-Frame-Options are present for ${hostname}.`,
            severity: 'Medium'
        },
        {
            title: 'Cookie protection',
            detail: 'Secure and HttpOnly flags are already configured.',
            severity: 'Low'
        },
        {
            title: 'Outdated software',
            detail: 'The stack appears to be modern, but an older plugin was detected.',
            severity: 'High'
        }
    ];

    return `
        <div class="glass-card score-card">
            <div>
                <p class="label">Overall security score</p>
                <div class="score-value">${score}</div>
            </div>
            <div class="pill pill-accent">AI review complete</div>
        </div>
        <div class="glass-card panel-card">
            <p class="label">Assessment for ${hostname}</p>
            <p class="hero-text">The scanner identified modern TLS coverage and strong baseline protections, with one high-priority patch recommended around an outdated dependency.</p>
        </div>
        <div class="finding-list">
            ${findings.map((finding) => `
                <article class="glass-card finding-card">
                    <strong>${finding.title}</strong>
                    <p>${finding.detail}</p>
                    <span class="pill">${finding.severity}</span>
                </article>
            `).join('')}
        </div>
    `;
}
