/* Admin data access layer. The ONLY place the Admin pages get booking records from.
   Until the real database is connected this returns an empty list, so every chart and table shows its empty state.
   To connect: make getBookings() fetch from your backend and return records in the shape documented below
   (see ADMIN-README.md). Everything else (KPIs, charts, forecast, Booking Records) updates automatically.

   Booking record shape (one object per booking / registration):
   {
     regNo:        'RN2601',                      // unique Booking / Registration No.
     pax:          4,                             // number of passengers in the booking (integer >= 1)
     port:         'Mabini',                      // port
     departDate:   '2026-11-10',                  // schedule date, YYYY-MM-DD (Manila date)
     departTime:   '09:00',                       // schedule time, 24h HH:MM
     registeredAt: '2026-11-09T09:00:00+08:00',   // registration timestamp, ISO 8601 with offset
     totalFee:     840,                           // total fee paid in PHP
     status:       'Verified',                    // 'Confirmed' | 'Verified' | 'Cancelled'
     passengers:   [{ category: 'Student', fare: 210 }, ...]   // optional but needed for revenue-by-category
   }
*/
const BOOKING_STATUSES = ['Confirmed', 'Verified', 'Cancelled'];
const COUNTED_STATUSES = ['Confirmed', 'Verified']; // statuses counted in KPIs and charts (Cancelled is excluded)

const AdminAPI = {
  async getBookings() {
    return (await Staff.api('admin.bookings')).bookings;
  }
};
