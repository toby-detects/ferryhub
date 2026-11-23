const UI = {
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  toast(msg, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    document.getElementById('toasts').append(t); setTimeout(() => t.remove(), 3600);
  },
  soon(what = '') { UI.toast('Under Progress' + (what ? ': ' + what : '. This feature is not available yet.'), 'warn'); },
  err(e) { return e && e.message ? e.message : 'Something went wrong. Please try again.'; },
  profile() { return (Staff.get() || {}).profile || {}; },
  // The port the page works on: staff are fixed to theirs; admins pick one (or ALL where the page allows it).
  port(allowAll = false) {
    const p = UI.profile(); if (p.role !== 'admin') return p.port;
    let v = ''; try { v = sessionStorage.getItem('fh_staff_port') || (allowAll ? 'ALL' : 'ANILAO'); } catch (e) { v = allowAll ? 'ALL' : 'ANILAO'; }
    return v === 'ALL' && !allowAll ? 'ANILAO' : v;
  },
  portLabel(c) { return PORT_NAMES[c] || 'All ports'; },
  confirm(title, msg, ok = 'Delete') {
    return new Promise(res => {
      const d = document.createElement('dialog'); d.className = 'dlg sm';
      d.innerHTML = `<h2>${UI.esc(title)}</h2><p>${UI.esc(msg)}</p><div class="dlg-actions"><button class="btn btn-line" value="no">Cancel</button><button class="btn btn-danger" value="yes">${UI.esc(ok)}</button></div>`;
      document.body.append(d);
      d.addEventListener('close', () => { res(d.returnValue === 'yes'); d.remove(); });
      d.querySelectorAll('button').forEach(b => { b.onclick = () => d.close(b.value); });
      d.showModal();
    });
  }
};

const USERS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3 0-6 1.5-6 4v2h12v-2c0-2.500-3-4-6-4zm7.200.2c2.600.4 4.800 1.800 4.800 3.800v2h-4v-2c0-1.500-.300-2.800-.800-3.800z"/></svg>';
const NAV = [
  { id: 'passengers', label: 'Passenger Records', href: 'passenger-records.html', icon: 'menu-passengers' },
  { id: 'announcements', label: 'Announcement', href: 'announcements.html', icon: 'menu-announcement' },
  { id: 'schedule', label: 'Manage Schedule', href: 'manage-schedule.html', icon: 'menu-schedule' },
  { id: 'accounts', label: 'Account Management', href: 'accounts.html', svg: USERS_SVG, admin: true },
  { id: 'trips', label: 'Trip Information Records', icon: 'menu-trips', locked: true },
  { id: 'register', label: 'Register Passenger', icon: 'menu-register', locked: true }
];

(() => {
  const page = document.body.dataset.page; if (!page || !Auth.require()) return;
  const me = UI.profile(), isAdmin = me.role === 'admin', allPorts = document.body.dataset.allports === '1', main = document.getElementById('page');
  if (page === 'accounts' && !isAdmin) { location.replace('passenger-records.html'); return; }
  const where = isAdmin ? 'Administrator' : PORT_NAMES[me.port];
  const nav = NAV.filter(n => !n.admin || isAdmin).map(n => n.locked
    ? `<button type="button" class="locked" data-soon aria-disabled="true"><img src="../assets/icons/${n.icon}.png" alt=""><span>${n.label}<span class="chip">Under Progress</span></span></button>`
    : `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ''}>${n.svg || `<img src="../assets/icons/${n.icon}.png" alt="">`}<span>${n.label}</span></a>`).join('');
  const portSel = isAdmin ? `<label class="portsel"><span class="sr">Port</span><select id="portSel" aria-label="Port">${allPorts ? '<option value="ALL">All ports</option>' : ''}<option value="ANILAO">Anilao Port</option><option value="TINGLOY">Tingloy Port</option></select></label>` : '';
  document.body.insertAdjacentHTML('afterbegin', `
  <div class="app">
    <aside class="side" id="side" aria-label="Sidebar">
      <div class="side-clock" aria-live="off"><span id="cd"></span><span id="ct"></span></div>
      <a class="brand" href="passenger-records.html"><img src="../assets/images/staff-logo.png" alt="FerryHub Staff Portal"></a>
      <nav class="nav" aria-label="Main">${nav}</nav>
      <button type="button" class="logout" id="logout"><img src="../assets/icons/logout.png" alt="">Logout</button>
    </aside>
    <div class="main-col">
      <header class="top">
        <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false">&#9776;</button>
        <div class="route"><span>Mabini-Tingloy Route</span><i></i><b>MONTENEGRO SHIPPING LINES</b></div>
        <div class="sp"></div>${portSel}
        <button class="bell" id="bell" aria-label="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22zm7-6.2V11a7 7 0 0 0-5.2-6.8V3.5a1.8 1.8 0 0 0-3.6 0v.7A7 7 0 0 0 5 11v4.8l-2 2V19h18v-1.2z"/></svg><span class="dot"></span></button>
        <div class="acct"><button id="acct" aria-haspopup="true" aria-expanded="false"><img src="../assets/icons/account.png" alt=""><span class="who"><b>${UI.esc(me.displayName || me.username)}</b><small>${UI.esc(where)}</small></span></button>
          <div class="menu" id="menu" hidden><p><b>${UI.esc(me.displayName || me.username)}</b><br>${me.role === 'admin' ? 'Admin account' : 'Staff account'}<br>${UI.esc(where)}${isAdmin ? ' (all ports)' : ''}</p><button class="btn btn-line" id="logout2">Logout</button></div></div>
      </header>
      <div class="content" id="slot"></div>
    </div>
  </div>
  <div class="scrim" id="scrim"></div>
  <button class="validate" id="validate"><span>Validate Ticket</span><img src="../assets/icons/camera.png" alt=""></button>
  <div id="toasts" aria-live="polite"></div>`);
  document.getElementById('slot').append(main);
  document.title = document.title.replace(' | FerryHub Staff', '') + ' | FerryHub Staff';

  if (isAdmin) { const s = document.getElementById('portSel'); s.value = UI.port(allPorts); s.onchange = () => { try { sessionStorage.setItem('fh_staff_port', s.value); } catch (e) {} document.dispatchEvent(new Event('fh:port')); }; }
  const tick = () => { const p = Time.parts(), h = +p.hour;
    document.getElementById('cd').textContent = Time.longDate(`${p.year}-${p.month}-${p.day}`);
    document.getElementById('ct').textContent = `${String(h % 12 || 12).padStart(2, '0')}:${p.minute}:${p.second} ${h < 12 ? 'AM' : 'PM'}`; };
  tick(); setInterval(tick, 1000);

  const close = () => { document.body.classList.remove('nav-open'); document.getElementById('burger').setAttribute('aria-expanded', 'false'); };
  document.getElementById('burger').onclick = () => { const o = document.body.classList.toggle('nav-open'); document.getElementById('burger').setAttribute('aria-expanded', String(o)); };
  document.getElementById('scrim').onclick = close;
  const menu = document.getElementById('menu'), acct = document.getElementById('acct');
  acct.onclick = () => { menu.hidden = !menu.hidden; acct.setAttribute('aria-expanded', String(!menu.hidden)); };
  document.addEventListener('click', e => { if (!e.target.closest('.acct')) { menu.hidden = true; acct.setAttribute('aria-expanded', 'false'); } if (e.target.closest('[data-soon]')) UI.soon(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { menu.hidden = true; close(); } });
  const out = async () => { if (await UI.confirm('Log out?', 'You will return to the login page.', 'Logout')) Staff.logout(); };
  document.getElementById('logout').onclick = out; document.getElementById('logout2').onclick = out;
  document.getElementById('bell').onclick = () => UI.soon();
  document.getElementById('validate').onclick = () => Scanner.open();
})();
