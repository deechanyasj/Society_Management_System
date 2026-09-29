const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT p.*, u.name as user_name, u.flat_number, u.email FROM payments p
      LEFT JOIN users u ON p.user_id = u.id WHERE 1=1`;
    const params = [];
    let count = 0;

    if (req.user.role === 'resident') {
      count++; query += ` AND p.user_id = $${count}`; params.push(req.user.id);
    }
    if (status) { count++; query += ` AND p.status = $${count}`; params.push(status); }
    query += ` ORDER BY p.created_at DESC LIMIT $${count + 1} OFFSET $${count + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, payments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createPayment = async (req, res) => {
  try {
    const { amount, payment_month, payment_year, due_date } = req.body;
    // Admin/staff creates payment records for residents
    const { resident_id } = req.body;
    const user_id = resident_id || req.user.id;

    const result = await pool.query(
      'INSERT INTO payments (user_id, amount, payment_month, payment_year, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, amount, payment_month, payment_year, due_date]
    );
    res.status(201).json({ success: true, payment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method = 'qr' } = req.body;
    const transaction_id = 'TXN' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 12);

    const result = await pool.query(
      `UPDATE payments SET status = 'paid', payment_method = $1, transaction_id = $2,
       paid_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *`,
      [payment_method, transaction_id, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found or unauthorized.' });
    }
    // Notify admin
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
       SELECT id, 'Payment Received', $1, 'payment', $2, 'payment' FROM users WHERE role = 'admin' LIMIT 1`,
      [`Payment received from Flat ${req.user.flat_number} - ₹${result.rows[0].amount}`, result.rows[0].id]
    );
    res.json({ success: true, payment: result.rows[0], transaction_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getPaymentStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as total_pending
      FROM payments
    `);
    res.json({ success: true, stats: stats.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getPayments, createPayment, processPayment, getPaymentStats };
