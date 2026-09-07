const pool = require('../config/database');

const getBookings = async (req, res) => {
  try {
    const { status, amenity } = req.query;
    let query = `SELECT b.*, u.name as user_name, u.flat_number FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id WHERE 1=1`;
    const params = [];
    let count = 0;

    if (req.user.role === 'resident') {
      count++; query += ` AND b.user_id = $${count}`; params.push(req.user.id);
    }
    if (status) { count++; query += ` AND b.status = $${count}`; params.push(status); }
    if (amenity) { count++; query += ` AND b.amenity = $${count}`; params.push(amenity); }
    query += ' ORDER BY b.booking_date DESC, b.start_time DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createBooking = async (req, res) => {
  try {
    const { amenity, booking_date, start_time, end_time, guests_count, purpose } = req.body;
    if (!amenity || !booking_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Amenity, date, and times are required.' });
    }
    // Check for conflicts
    const conflict = await pool.query(
      `SELECT id FROM bookings WHERE amenity = $1 AND booking_date = $2 AND status != 'rejected' AND status != 'cancelled'
       AND (start_time < $4 AND end_time > $3)`,
      [amenity, booking_date, start_time, end_time]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This amenity is already booked for the selected time.' });
    }
    const result = await pool.query(
      'INSERT INTO bookings (user_id, amenity, booking_date, start_time, end_time, guests_count, purpose) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, amenity, booking_date, start_time, end_time, guests_count || 1, purpose]
    );
    res.status(201).json({ success: true, booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const result = await pool.query(
      'UPDATE bookings SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, admin_notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });
    
    const booking = result.rows[0];
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [booking.user_id, 'Booking Status Updated', `Your ${amenityName(booking.amenity)} booking on ${booking.booking_date} has been ${status}`, 'booking', booking.id, 'booking']
    );
    res.json({ success: true, booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const amenityName = (key) => ({
  party_hall: 'Party Hall', tennis_court: 'Tennis Court', swimming_pool: 'Swimming Pool', gym: 'Gym', clubhouse: 'Clubhouse'
}[key] || key);

module.exports = { getBookings, createBooking, updateBooking, cancelBooking };
