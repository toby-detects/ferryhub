const UI = {
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  toast(msg, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    document.getElementById('toasts').append(t); setTimeout(() => t.remove(), 3200);
  },
  soon(what = '') { UI.toast('Under Progress' + (what ? ': ' + what : '. This feature is not available yet.'), 'warn'); },
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

// Sidebar config. locked:true = reserved module, shown but not linked.
const NAV = [
  { id: 'passengers', label: 'Passenger Records', href: 'passenger-records.html', icon: 'menu-passengers' },
  { id: 'announcements', label: 'Announcement', href: 'announcements.html', icon: 'menu-announcement' },
  { id: 'schedule', label: 'Manage Schedule', href: 'manage-schedule.html', icon: 'menu-schedule' },
  { id: 'trips', label: 'Trip Information Records', icon: 'menu-trips', locked: true },
  { id: 'register', label: 'Register Passenger', icon: 'menu-register', locked: true }
];

// Admin sidebar. Icons are SVG files in assets/icons.
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', href: 'admin-dashboard.html', file: 'admin-dashboard.svg' },
  { id: 'bookings', label: 'Booking Records', href: 'admin-bookings.html', file: 'admin-bookings.svg' },
  { id: 'accounts', label: 'Account Management', href: 'admin-accounts.html', file: 'admin-accounts.svg' }
];

(() => {
  const role = document.body.dataset.role || 'staff', isAdmin = role === 'admin';
  const page = document.body.dataset.page; if (!page || !Auth.require(role)) return;
  const s = Auth.session(), main = document.getElementById('page');
  const home = isAdmin ? Auth.HOME.admin : Auth.HOME.staff;
  const nav = (isAdmin ? ADMIN_NAV : NAV).map(n => n.locked
    ? `<button type="button" class="locked" data-soon aria-disabled="true"><img src="../assets/icons/${n.file || n.icon + '.png'}" alt=""><span>${n.label}<span class="chip">Under Progress</span></span></button>`
    : `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ''}><img src="../assets/icons/${n.file || n.icon + '.png'}" alt=""><span>${n.label}</span></a>`).join('');
  document.body.insertAdjacentHTML('afterbegin', `
  <div class="app">
    <aside class="side" id="side" aria-label="Sidebar">
      <div class="side-clock" aria-live="off"><span id="cd"></span><span id="ct"></span></div>
      <a class="brand" href="${home}"><img src="../assets/images/${isAdmin ? 'admin' : 'staff'}-logo.png" alt="FerryHub ${isAdmin ? 'Admin' : 'Staff'} Portal"></a>
      <nav class="nav" aria-label="Main">${nav}</nav>
      <button type="button" class="logout" id="logout"><img src="../assets/icons/logout.png" alt="">Logout</button>
    </aside>
    <div class="main-col">
      <header class="top">
        <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false">&#9776;</button>
        <div class="route"><span>Mabini-Tingloy Route</span><i></i><b>MONTENEGRO SHIPPING LINES</b></div>
        <button class="bell sp" id="bell" aria-label="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22zm7-6.2V11a7 7 0 0 0-5.2-6.8V3.5a1.8 1.8 0 0 0-3.6 0v.7A7 7 0 0 0 5 11v4.8l-2 2V19h18v-1.2z"/></svg><span class="dot"></span></button>
        <div class="acct"><button id="acct" aria-haspopup="true" aria-expanded="false"><img src="../assets/icons/account.png" alt="">${UI.esc(s.label)}</button>
          <div class="menu" id="menu" hidden><p>Signed in as ${UI.esc(s.label)}${s.username ? ' (' + UI.esc(s.username) + ')' : ''}<br>Prototype session</p><button class="btn btn-line" id="logout2">Logout</button></div></div>
      </header>
      <div class="content" id="slot"></div>
    </div>
  </div>
  <div class="scrim" id="scrim"></div>
  ${isAdmin ? '' : '<button class="validate" id="validate"><span>Validate Ticket</span><img src="../assets/icons/camera.png" alt=""></button>'}
  <div id="toasts" aria-live="polite"></div>`);
  document.getElementById('slot').append(main);

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
  const out = async () => { if (await UI.confirm('Log out?', 'You will return to the login page.', 'Logout')) Auth.logout(); };
  document.getElementById('logout').onclick = out; document.getElementById('logout2').onclick = out;
  document.getElementById('bell').onclick = () => UI.soon();
  const vt = document.getElementById('validate'); if (vt) vt.onclick = () => UI.soon();
})();
