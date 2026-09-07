const pool = require('../config/database');

const getAnalytics = async (req, res) => {
  try {
    const [complaints, payments, bookings, users, monthly] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
        FROM complaints`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as outstanding
        FROM payments`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM bookings`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE role = 'resident') as residents,
        COUNT(*) FILTER (WHERE role = 'staff') as staff,
        COUNT(*) FILTER (WHERE role = 'admin') as admins
        FROM users`),
      pool.query(`SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as amount
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)`)
    ]);

    const complaintsByCategory = await pool.query(
      `SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC`
    );

    res.json({
      success: true,
      analytics: {
        complaints: complaints.rows[0],
        payments: payments.rows[0],
        bookings: bookings.rows[0],
        users: users.rows[0],
        monthly_payments: monthly.rows,
        complaints_by_category: complaintsByCategory.rows,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getResidents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, phone, flat_number, avatar_url, is_active, created_at FROM users WHERE role != 'admin' ORDER BY flat_number"
    );
    res.json({ success: true, residents: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, name, is_active',
      [id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAnalytics, getResidents, toggleUserStatus, getNotifications, markNotificationRead, markAllNotificationsRead };
