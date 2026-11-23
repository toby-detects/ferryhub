const Auth = {
  session() { const s = Staff.get(); return s && s.profile ? s.profile : null; },
  require() { if (!Auth.session()) { location.replace(Staff.home()); return false; } return true; }
};

(() => {
  const form = document.getElementById('loginForm'); if (!form) return;
  const $ = id => document.getElementById(id), note = $('lnote');
  if (Auth.session()) { location.replace('pages/passenger-records.html'); return; }
  let role = 'staff';
  const rules = { username: V.req('Enter your username.'), password: V.req('Enter your password.') };
  V.live(form, rules);
  const pick = r => {
    role = r; note.hidden = true;
    $('segAdmin').classList.toggle('on', r === 'admin'); $('segStaff').classList.toggle('on', r === 'staff');
    $('segAdmin').setAttribute('aria-pressed', String(r === 'admin')); $('segStaff').setAttribute('aria-pressed', String(r === 'staff'));
    $('lt').textContent = r === 'admin' ? 'Admin Login' : 'Staff Login';
  };
  $('segAdmin').onclick = () => pick('admin'); $('segStaff').onclick = () => pick('staff');
  const pw = form.elements.password, eye = $('eye');
  eye.onclick = () => {
    const show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); eye.setAttribute('aria-pressed', String(show)); eye.classList.toggle('show', show);
  };
  const btn = form.querySelector('[type=submit]');
  form.onsubmit = async e => {
    e.preventDefault(); note.hidden = true;
    if (!V.run(form, rules)) return;
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const out = await Staff.raw('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.elements.username.value, password: pw.value, role }) });
      Staff.set(out); location.href = 'pages/passenger-records.html';
    } catch (err) {
      note.hidden = false; note.className = 'notice bad'; note.textContent = err.message;
      if (err.status === 401) ['username', 'password'].forEach(n => form.elements[n].closest('.field').classList.add('bad'));
      pw.value = ''; pw.focus(); btn.disabled = false; btn.textContent = 'Login';
    }
  };
})();
