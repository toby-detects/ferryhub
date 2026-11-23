/* MOCK authentication for the prototype only. Not secure: runs entirely in the browser.
   Two separate logins: Staff accounts come from AccountStore (hashed); the single Admin account is a constant below.
   Replace Auth.USERS.admin and AccountStore.verify with a real server login before going live. */
const Auth = {
  USERS: { admin: { username: 'toby', password: '11111111', label: 'Admin' } },
  HOME: { staff: 'passenger-records.html', admin: 'admin-dashboard.html' },
  session() { try { return JSON.parse(sessionStorage.getItem('fh_staff_session')); } catch (e) { return null; } },
  login(role, username) { try { sessionStorage.setItem('fh_staff_session', JSON.stringify({ role, username: username || '', label: role === 'admin' ? 'Admin' : 'Staff' })); } catch (e) {} },
  logout() { try { sessionStorage.removeItem('fh_staff_session'); } catch (e) {} location.href = (document.body.dataset.root || '') + 'index.html'; },
  /* Guard for pages in /pages. A Staff session cannot open Admin pages and an Admin session cannot open Staff pages. */
  require(role = 'staff') {
    const s = Auth.session();
    if (!s) { location.replace('../index.html'); return false; }
    if (s.role !== role) { location.replace(Auth.HOME[s.role] || '../index.html'); return false; }
    // A Staff account that was disabled or deleted by an Admin loses access on the next page load.
    if (s.role === 'staff' && (!s.username || !AccountStore.isActive(s.username))) { try { sessionStorage.removeItem('fh_staff_session'); } catch (e) {} location.replace('../index.html'); return false; }
    return true;
  }
};

(() => {
  const form = document.getElementById('loginForm'); if (!form) return;
  const ses = Auth.session();
  if (ses && (ses.role === 'admin' || AccountStore.isActive(ses.username))) { location.replace('pages/' + Auth.HOME[ses.role]); return; }
  const note = document.getElementById('lnote'), $ = id => document.getElementById(id);
  const rules = { username: V.req('Enter your username.'), password: V.req('Enter your password.') };
  V.live(form, rules);

  let mode = 'staff';
  const COPY = {
    staff: ['Staff Login', 'Sign in to manage passengers, announcements and schedules.'],
    admin: ['Admin Login', 'Sign in to view analytics, booking records and staff accounts.']
  };
  function setMode(m) {
    mode = m; note.hidden = true; V.clear(form); form.reset();
    $('lt').textContent = COPY[m][0]; document.querySelector('.lcard .sub').textContent = COPY[m][1];
    $('segAdmin').classList.toggle('on', m === 'admin'); $('segStaff').classList.toggle('on', m === 'staff');
    $('segAdmin').setAttribute('aria-pressed', String(m === 'admin')); $('segStaff').setAttribute('aria-pressed', String(m === 'staff'));
    $('demo').hidden = m === 'admin'; document.title = COPY[m][0] + ' | FerryHub';
  }
  $('segAdmin').onclick = () => setMode('admin');
  $('segStaff').onclick = () => setMode('staff');

  const pw = form.elements.password, eye = $('eye');
  eye.onclick = () => {
    const show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); eye.setAttribute('aria-pressed', String(show));
    eye.classList.toggle('show', show);
  };
  const fail = msg => {
    note.hidden = false; note.className = 'notice bad'; note.textContent = msg;
    ['username', 'password'].forEach(n => form.elements[n].closest('.field').classList.add('bad'));
    pw.value = ''; pw.focus();
  };
  form.onsubmit = async e => {
    e.preventDefault(); note.hidden = true;
    if (!V.run(form, rules)) return;
    const user = form.elements.username.value.trim(), pass = pw.value, btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (mode === 'admin') {
        const a = Auth.USERS.admin;
        if (user === a.username && pass === a.password) { Auth.login('admin', a.username); location.href = 'pages/' + Auth.HOME.admin; return; }
        fail('Incorrect username or password.');
      } else {
        const r = await AccountStore.verify(user, pass);
        if (r.ok) { AccountStore.touchLogin(r.account.id); Auth.login('staff', r.account.username); location.href = 'pages/' + Auth.HOME.staff; return; }
        fail(r.reason === 'disabled' ? 'This account is disabled. Please contact your administrator.' : 'Incorrect username or password.');
      }
    } finally { btn.disabled = false; }
  };
})();
