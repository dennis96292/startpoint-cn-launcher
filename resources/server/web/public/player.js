// Toast notification system
function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
        padding: '8px 20px', borderRadius: '9999px', fontSize: '14px',
        color: '#fff', transition: 'opacity 0.3s', opacity: '1',
        background: type === 'error' ? '#dc2626' : '#2563eb'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

// API helper
async function api(method, path, bodyObj) {
    const opts = { method };
    if (bodyObj) {
        opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        opts.body = Object.entries(bodyObj).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    }
    const r = await fetch('/api/player/' + PID + path, opts);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || (r.status + ' ' + r.statusText));
    return d;
}

// Field editing — delegated change handler
document.addEventListener('change', async function (e) {
    const el = e.target;
    if (!el.classList.contains('edit-field')) return;
    const field = el.dataset.field;
    const value = el.type === 'checkbox' ? el.checked : el.value;
    try {
        await api('PATCH', '/field', { field, value });
        showToast(field + ' 已保存');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Action buttons — delegated click handler
document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.js-action');
    if (!btn) return;
    e.preventDefault();

    const action = btn.dataset.action;
    const confirmMap = {
        delChar: '删除角色 ' + btn.dataset.code + '?',
        delItem: '删除道具 ' + btn.dataset.itemId + '?',
        delQuestProgress: '删除关卡 section=' + btn.dataset.section + ' quest=' + btn.dataset.questId + '?',
        delDrawnQuest: '删除抽选关卡 category=' + btn.dataset.category + ' quest=' + btn.dataset.questId + '?',
        resetChallenge: '将所有每日挑战次数恢复至 CDN 默认值？'
    };

    if (confirmMap[action] && !confirm(confirmMap[action])) return;

    try {
        switch (action) {
            case 'delChar': {
                await api('DELETE', '/character/' + btn.dataset.code);
                location.reload();
                break;
            }
            case 'delItem': {
                await api('DELETE', '/item/' + btn.dataset.itemId);
                location.reload();
                break;
            }
            case 'delQuestProgress': {
                await api('DELETE', '/quest_progress/' + btn.dataset.section + '/' + btn.dataset.questId);
                location.reload();
                break;
            }
            case 'delDrawnQuest': {
                await api('DELETE', '/drawn_quest/' + btn.dataset.category + '/' + btn.dataset.questId);
                location.reload();
                break;
            }
            case 'resetChallenge': {
                await api('POST', '/reset_challenge');
                alert('已恢复');
                location.reload();
                break;
            }
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Item search filter
(function() {
    const input = document.getElementById('itemSearch');
    if (!input) return;
    input.addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        const table = this.closest('section').querySelector('tbody');
        if (!table) return;
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = q === '' || text.includes(q) ? '' : 'none';
        }
    });
})();

// Equipment search filter
(function() {
    const input = document.getElementById('equipSearch');
    if (!input) return;
    input.addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        const table = this.closest('section').querySelector('tbody');
        if (!table) return;
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = q === '' || text.includes(q) ? '' : 'none';
        }
    });
})();

// Quest progress search filter
(function() {
    var input = document.getElementById('questSearch');
    if (!input) return;
    input.addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        var table = this.closest('section').querySelector('tbody');
        if (!table) return;
        var rows = table.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            rows[i].style.display = q === '' || rows[i].textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
        }
    });
})();

// Drawn quest search filter
(function() {
    var input = document.getElementById('drawnSearch');
    if (!input) return;
    input.addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        var table = this.closest('section').querySelector('tbody');
        if (!table) return;
        var rows = table.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            rows[i].style.display = q === '' || rows[i].textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
        }
    });
})();
