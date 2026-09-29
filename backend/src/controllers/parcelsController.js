const pool = require('../config/database');

const getParcels = async (req, res) => {
  try {
    let query = `SELECT p.*, u.name as resident_name, u.flat_number, u.email FROM parcels p
      LEFT JOIN users u ON p.resident_id = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'resident') {
      query += ' AND p.resident_id = $1'; params.push(req.user.id);
    }
    query += ' ORDER BY p.received_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, parcels: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const addParcel = async (req, res) => {
  try {
    const { resident_id, tracking_number, sender_name, courier, notes } = req.body;
    if (!resident_id || !tracking_number) {
      return res.status(400).json({ success: false, message: 'Resident and tracking number are required.' });
    }
    const result = await pool.query(
      "INSERT INTO parcels (resident_id, tracking_number, sender_name, courier, notes, status) VALUES ($1, $2, $3, $4, $5, 'notified') RETURNING *",
      [resident_id, tracking_number, sender_name, courier, notes]
    );
    // Notify resident
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [resident_id, 'Parcel Arrived', `A parcel from ${sender_name || 'Unknown Sender'} via ${courier || 'Unknown Courier'} is waiting at the front desk. Tracking: ${tracking_number}`, 'parcel', result.rows[0].id, 'parcel']
    );
    res.status(201).json({ success: true, parcel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const markCollected = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE parcels SET status = 'collected', collected_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Parcel not found.' });
    res.json({ success: true, parcel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getParcels, addParcel, markCollected };
