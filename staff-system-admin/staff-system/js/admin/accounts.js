/* Account Management controller (Admin only). All reads and writes go through AccountStore, which is the seam for a real backend. */
(() => {
  const $ = id => document.getElementById(id), sel = new Set(), st = { q: '', status: '', port: '' };
  const when = iso => { const d = new Date(iso), p = Time.parts(d), key = `${p.year}-${p.month}-${p.day}`, t = Time.label(p.hour + ':' + p.minute);
    return key === Time.today() ? 'Today, ' + t : Time.shortDate(key).replace(', ' + p.year, p.year === Time.today().slice(0, 4) ? '' : ', ' + p.year) + ', ' + t; };
  const dateOnly = iso => { const p = Time.parts(new Date(iso)); return Time.shortDate(`${p.year}-${p.month}-${p.day}`); };
  $('po').innerHTML = '<option value="">Not assigned</option>' + PORTS.map(p => `<option>${p}</option>`).join('');
  $('fp').innerHTML = '<option value="">All</option>' + PORTS.map(p => `<option>${p}</option>`).join('');

  const visible = () => { const q = st.q.trim().toLowerCase();
    return AccountStore.list().filter(a => (!st.status || a.status === st.status) && (!st.port || a.port === st.port) && (!q || a.id.toLowerCase().includes(q) || a.username.toLowerCase().includes(q)))
      .sort((a, b) => b.id.localeCompare(a.id)); };
  function render() {
    const all = AccountStore.list(), rows = visible(); [...sel].forEach(id => { if (!all.some(a => a.id === id)) sel.delete(id); });
    const allOn = rows.length && rows.every(a => sel.has(a.id));
    $('thead').innerHTML = `<th scope="col"><input class="chk" type="checkbox" id="all" aria-label="Select all accounts" ${allOn ? 'checked' : ''}></th><th scope="col">ID</th><th scope="col">USERNAME</th><th scope="col">ROLE</th><th scope="col">DATE CREATED</th><th scope="col">LAST LOGIN</th><th scope="col">STATUS</th><th scope="col">PORT</th>`;
    $('rows').innerHTML = rows.map(a => `<tr><td><input class="chk" type="checkbox" data-id="${a.id}" aria-label="Select ${UI.esc(a.username)}" ${sel.has(a.id) ? 'checked' : ''}></td>
      <td class="rn">${a.id}</td><td>${UI.esc(a.username)}</td><td>${a.role}</td><td>${a.createdAt ? dateOnly(a.createdAt) : '—'}</td><td>${a.lastLogin ? when(a.lastLogin) : 'Never'}</td>
      <td class="${a.status === 'Active' ? 'st-active' : 'st-disabled'}">${a.status}</td><td>${UI.esc(a.port || '—')}</td></tr>`).join('');
    const s = $('state'); s.hidden = rows.length > 0;
    s.innerHTML = !all.length ? '<b>No staff accounts yet</b>Use “Add new account” to create one.' : '<b>No accounts match your search or filters</b>Try a different search.';
    $('count').textContent = `Showing ${rows.length} of ${all.length}`;
    $('del').disabled = sel.size === 0; $('upd').disabled = sel.size !== 1;
  }

  /* ---------- dialog ---------- */
  const f = $('f'), dlg = $('dlg'); let mode = 'add', cur = null;
  const rules = {
    username: v => mode === 'add' ? AccountStore.validateUsername(v, null) : '',
    password: v => !v && mode === 'edit' ? '' : AccountStore.validatePassword(v),
    confirm: (v, fm) => fm.elements.password.value && fm.elements.password.value !== v ? 'Passwords do not match.' : ''
  };
  V.live(f, rules);
  f.elements.password.addEventListener('input', () => { if (f.elements.confirm.value) V.setErr(f.elements.confirm.closest('.field'), rules.confirm(f.elements.confirm.value, f)); });
  function open(m, a) {
    mode = m; cur = a || null; V.clear(f); f.reset();
    $('dt').textContent = m === 'add' ? 'Add new account' : `Update ${a.username}`;
    $('save').textContent = m === 'add' ? 'Create account' : 'Save changes';
    f.elements.username.readOnly = m === 'edit';
    $('pwl').innerHTML = m === 'add' ? 'Password <i>*</i>' : 'New password (optional)';
    $('pwhint').textContent = m === 'add' ? 'Use at least 8 characters. The password is stored only as a salted hash.' : 'Leave the password blank to keep it. Entering one resets the account password.';
    if (a) { f.elements.username.value = a.username; f.elements.port.value = a.port; f.elements.status.value = a.status; }
    dlg.showModal(); (m === 'add' ? f.elements.username : f.elements.password).focus();
  }
  f.onsubmit = async e => {
    e.preventDefault(); if (!V.run(f, rules)) return;
    const btn = $('save'); btn.disabled = true;
    try {
      const v = f.elements;
      if (mode === 'add') { const a = await AccountStore.create({ username: v.username.value, password: v.password.value, port: v.port.value, status: v.status.value }); UI.toast(`Account ${a.id} created.`, 'ok'); }
      else { await AccountStore.update(cur.id, { port: v.port.value, status: v.status.value, password: v.password.value }); UI.toast(`${cur.username} updated.`, 'ok'); }
      dlg.close(); render();
    } catch (err) { UI.toast(err.message || 'Could not save the account.', 'warn'); }
    finally { btn.disabled = false; }
  };
  $('add').onclick = () => open('add');
  $('upd').onclick = () => { if (sel.size === 1) open('edit', AccountStore.list().find(a => a.id === [...sel][0])); else UI.toast('Select exactly one account to update.', 'warn'); };
  $('del').onclick = async () => {
    if (!sel.size) return;
    const n = sel.size;
    if (!await UI.confirm(`Delete ${n} account${n > 1 ? 's' : ''}?`, 'This permanently removes the selected Staff account' + (n > 1 ? 's' : '') + ' and blocks their access.')) return;
    try { AccountStore.remove([...sel]); sel.clear(); UI.toast(`${n} account${n > 1 ? 's' : ''} deleted.`, 'ok'); } catch (err) { UI.toast(err.message, 'warn'); }
    render();
  };
  $('x').onclick = $('cancel').onclick = () => dlg.close();

  /* ---------- list events ---------- */
  $('rows').onchange = e => { const c = e.target.closest('[data-id]'); if (!c) return; c.checked ? sel.add(c.dataset.id) : sel.delete(c.dataset.id); render(); };
  $('thead').onchange = e => { if (e.target.id !== 'all') return; visible().forEach(a => e.target.checked ? sel.add(a.id) : sel.delete(a.id)); render(); };
  $('q').oninput = e => { st.q = e.target.value; render(); };
  $('fs').onchange = e => { st.status = e.target.value; render(); };
  $('fp').onchange = e => { st.port = e.target.value; render(); };
  render();
})();
