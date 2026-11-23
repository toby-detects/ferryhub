/* Staff account store, shared by the login page and Admin > Account Management.
   PROTOTYPE: localStorage stands in for a server. Passwords are stored only as salted PBKDF2 hashes,
   but a browser-only store can never be truly secure. To connect a backend, replace the methods of
   AccountStore and Audit with API calls; the page scripts only call these two objects. */
const PORTS = ['Mabini', 'Tingloy', 'Anilao'];
const RESERVED_USERNAMES = ['toby']; // belongs to the Admin login, never creatable as Staff

const PW = {
  ITER: 100000,
  hex: b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''),
  fromHex: h => new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16))),
  async hash(password, saltHex) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: PW.fromHex(saltHex), iterations: PW.ITER }, key, 256);
    return PW.hex(bits);
  },
  newSalt() { return PW.hex(crypto.getRandomValues(new Uint8Array(16))); }
};

// Seeded from the existing prototype Staff login (username admin). Port is unassigned until an Admin sets it.
const SEED_ACCOUNTS = [
  { id: 'S-001', username: 'admin', role: 'Staff', status: 'Active', port: '', lastLogin: null, createdAt: null,
    salt: '7a1f3c9e5b2d48a6c0e4917d2b8f6a35', hash: 'b2dcde46293790ff53c40f90d1c16edadbd45e6f00afab74848068d49549b2a2' }
];

const AccountStore = {
  list() { return DB.get('accounts', SEED_ACCOUNTS).map(a => ({ ...a })); },
  _save(all) { return DB.set('accounts', all); },
  find(username) { const u = String(username).trim().toLowerCase(); return AccountStore.list().find(a => a.username.toLowerCase() === u) || null; },
  nextId() { const n = AccountStore.list().reduce((m, a) => Math.max(m, parseInt(a.id.slice(2), 10) || 0), 0) + 1; return 'S-' + String(n).padStart(3, '0'); },

  validateUsername(v, ignoreId) {
    v = String(v).trim();
    if (!v) return 'Enter a username.';
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(v)) return 'Use 3 to 30 letters, numbers, dots, dashes or underscores.';
    if (RESERVED_USERNAMES.includes(v.toLowerCase())) return 'This username is reserved.';
    const hit = AccountStore.find(v);
    return hit && hit.id !== ignoreId ? 'This username is already taken.' : '';
  },
  validatePassword: v => v.length < 8 ? 'Use at least 8 characters.' : '',

  /* Staff login check. Returns { ok, account, reason }. Wrong user and wrong password are not distinguished. */
  async verify(username, password) {
    const a = AccountStore.find(username);
    if (!a) return { ok: false, reason: 'bad' };
    if (await PW.hash(password, a.salt) !== a.hash) return { ok: false, reason: 'bad' };
    if (a.status !== 'Active') return { ok: false, reason: 'disabled' };
    return { ok: true, account: a };
  },
  touchLogin(id) { const all = AccountStore.list(), a = all.find(x => x.id === id); if (a) { a.lastLogin = new Date().toISOString(); AccountStore._save(all); } },
  isActive(username) { const a = AccountStore.find(username); return !!a && a.status === 'Active'; },

  async create({ username, password, port, status }) {
    const all = AccountStore.list(), salt = PW.newSalt();
    const a = { id: AccountStore.nextId(), username: username.trim(), role: 'Staff', status, port, lastLogin: null, createdAt: new Date().toISOString(), salt, hash: await PW.hash(password, salt) };
    all.push(a); if (!AccountStore._save(all)) throw new Error('Could not save to browser storage.');
    Audit.add('account.create', a.id + ' ' + a.username); return a;
  },
  async update(id, { port, status, password }) {
    const all = AccountStore.list(), a = all.find(x => x.id === id); if (!a) throw new Error('Account not found.');
    const changes = [];
    if (port !== undefined && port !== a.port) { a.port = port; changes.push('port'); }
    if (status !== undefined && status !== a.status) { a.status = status; changes.push('status'); }
    if (password) { a.salt = PW.newSalt(); a.hash = await PW.hash(password, a.salt); changes.push('password reset'); }
    if (!AccountStore._save(all)) throw new Error('Could not save to browser storage.');
    Audit.add('account.update', a.id + ' ' + a.username + ': ' + (changes.join(', ') || 'no changes')); return a;
  },
  remove(ids) {
    const all = AccountStore.list(), gone = all.filter(a => ids.includes(a.id));
    if (!AccountStore._save(all.filter(a => !ids.includes(a.id)))) throw new Error('Could not save to browser storage.');
    gone.forEach(a => Audit.add('account.delete', a.id + ' ' + a.username)); return gone.length;
  }
};

const Audit = {
  list() { return DB.get('audit', []); },
  add(action, detail) {
    const log = Audit.list(); log.unshift({ at: new Date().toISOString(), by: 'Admin', action, detail });
    DB.set('audit', log.slice(0, 500));
  }
};
