document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const adminTabs = document.querySelectorAll('.admin-tab');

    navItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');

            navItems.forEach((nav) => nav.classList.remove('active'));
            item.classList.add('active');

            adminTabs.forEach((tab) => tab.classList.remove('active'));
            document.getElementById(tabName)?.classList.add('active');
        });
    });

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

    const buttons = document.querySelectorAll('.button.button-primary.btn-sm');
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.textContent = 'Saved!';
            setTimeout(() => {
                btn.textContent = btn.dataset.original || btn.textContent.replace('Saved!', 'Save Changes');
            }, 2000);
        });
    });
});
