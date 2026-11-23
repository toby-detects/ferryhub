# FerryHub Staff System (front-end prototype)
HTML5 + CSS3 + vanilla JS. No backend, no database, no real authentication.
Run: `python3 -m http.server 8000` in this folder, then open http://localhost:8000
Mock logins (testing only, not secure): Staff `admin` / `12345678`; Admin `toby` / `11111111`. Each works only on its own login tab. See ADMIN-README.md for the Admin system.
Sample data persists in the browser (localStorage) only. It is not a database. Reset: DevTools > Application > Clear storage.
Backend hooks: replace the `DB` and `ScheduleAPI` objects in js/sample-data.js. Reserved modules: pages/trip-records.html, pages/register-passenger.html.
Hero/sidebar photos: assets/images/hero-login.jpg and sidebar-bg.jpg. Announcement placeholder: assets/images/announcement-placeholder.svg (replace later).
