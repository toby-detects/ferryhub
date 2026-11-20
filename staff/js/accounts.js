(() => {
  const $ = id => document.getElementById(id); let list = [], cur = null;
  const me = UI.profile().id;
  async function load() {
    $('empty').hidden = false; $('empty').textContent = 'Loading…';
    try { list = (await Staff.api('accounts.list')).accounts; render(); }
    catch (e) { list = []; $('rows').innerHTML = ''; $('empty').innerHTML = `${UI.esc(UI.err(e))} <button class="btn btn-line" id="retry">Try again</button>`; $('retry').onclick = load; }
  }
  function render() {
    $('rows').innerHTML = list.map(a => `<tr><td class="rn">${UI.esc(a.username)}${a.id === me ? ' <small>(you)</small>' : ''}</td><td>${UI.esc(a.displayName)}</td>
      <td><span class="badge ${a.role === 'admin' ? 'neutral' : ''}">${a.role === 'admin' ? 'Admin' : 'Staff'}</span></td><td>${a.role === 'admin' ? 'All ports' : UI.esc(PORT_NAMES[a.port])}</td>
      <td><span class="badge ${a.active ? 's-active' : 's-disabled'}">${a.active ? 'Active' : 'Inactive'}</span></td><td>${Time.stamp(a.createdAt)}</td>
      <td><button class="iconbtn" data-id="${a.id}" aria-label="Edit ${UI.esc(a.username)}"><img src="../assets/icons/edit.png" alt=""></button></td></tr>`).join('');
    $('empty').hidden = list.length > 0; if (!list.length) $('empty').textContent = 'No accounts yet.';
  }
  document.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => b.closest('dialog').close(); });
  const showErr = (f, m) => { const e = f.querySelector('[data-ferr]'); e.hidden = !m; e.textContent = m || ''; };

  // Create
  const cf = $('cf'), cdlg = $('cdlg');
  const crules = { username: v => /^[a-z0-9._-]{3,30}$/.test(v.trim().toLowerCase()) ? '' : 'Use 3 to 30 letters, numbers, dots, dashes or underscores.', port: V.req('Choose a port.'), password: v => v.length < 8 ? 'Use at least 8 characters.' : '' };
  V.live(cf, crules);
  $('add').onclick = () => { cf.reset(); V.clear(cf); showErr(cf, ''); cdlg.showModal(); };
  cf.onsubmit = async e => {
    e.preventDefault(); showErr(cf, ''); if (!V.run(cf, crules)) return; const b = cf.querySelector('[type=submit]'); b.disabled = true;
    try { await Staff.api('accounts.create', { method: 'POST', body: { username: cf.elements.username.value, displayName: cf.elements.displayName.value, port: cf.elements.port.value, password: cf.elements.password.value } });
      cdlg.close(); UI.toast('Account created. Share the password privately.', 'ok'); load(); }
    catch (err) { showErr(cf, UI.err(err)); } finally { b.disabled = false; }
  };

  // Edit / activate / reset password
  const ef = $('ef'), edlg = $('edlg');
  const erules = { password: v => v && v.length < 8 ? 'Use at least 8 characters.' : '' };
  V.live(ef, erules);
  $('rows').onclick = e => {
    const b = e.target.closest('[data-id]'); if (!b) return; cur = list.find(a => a.id === b.dataset.id); V.clear(ef); showErr(ef, ''); ef.reset();
    $('et').textContent = 'Edit ' + cur.username; ef.elements.displayName.value = cur.displayName === cur.username ? '' : cur.displayName;
    $('epf').hidden = cur.role === 'admin'; if (cur.role !== 'admin') ef.elements.port.value = cur.port;
    ef.elements.active.checked = cur.active; ef.elements.active.disabled = cur.id === me; edlg.showModal();
  };
  ef.onsubmit = async e => {
    e.preventDefault(); showErr(ef, ''); if (!V.run(ef, erules)) return; const b = ef.querySelector('[type=submit]'); b.disabled = true;
    try {
      const body = { id: cur.id, displayName: ef.elements.displayName.value, active: ef.elements.active.checked };
      if (cur.role !== 'admin') body.port = ef.elements.port.value;
      if (cur.id === me) delete body.active;
      await Staff.api('accounts.update', { method: 'POST', body });
      if (ef.elements.password.value) await Staff.api('accounts.reset', { method: 'POST', body: { id: cur.id, password: ef.elements.password.value } });
      edlg.close(); UI.toast('Account updated.', 'ok'); load();
    } catch (err) { showErr(ef, UI.err(err)); } finally { b.disabled = false; }
  };
  load();
})();
