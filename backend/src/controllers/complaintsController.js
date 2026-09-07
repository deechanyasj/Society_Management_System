const pool = require('../config/database');

const getComplaints = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT c.*, u.name as user_name, u.flat_number, u.email as user_email,
      a.name as assigned_name FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users a ON c.assigned_to = a.id WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (req.user.role === 'resident') {
      paramCount++;
      query += ` AND c.user_id = $${paramCount}`;
      params.push(req.user.id);
    }
    if (status) { paramCount++; query += ` AND c.status = $${paramCount}`; params.push(status); }
    if (category) { paramCount++; query += ` AND c.category = $${paramCount}`; params.push(category); }
    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM complaints WHERE ' + (req.user.role === 'resident' ? `user_id = '${req.user.id}'` : '1=1'));
    res.json({ success: true, complaints: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority = 'medium' } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description, and category are required.' });
    }
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      'INSERT INTO complaints (user_id, title, description, category, priority, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, title, description, category, priority, image_url]
    );
    // Create notification for admin
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
       SELECT id, 'New Complaint Filed', $1, 'complaint', $2, 'complaint' FROM users WHERE role = 'admin' LIMIT 1`,
      [`${req.user.name} filed a new complaint: ${title}`, result.rows[0].id]
    );
    res.status(201).json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, assigned_to, priority } = req.body;
    const updates = [];
    const params = [];
    let count = 0;

    if (status) { count++; updates.push(`status = $${count}`); params.push(status); }
    if (admin_notes !== undefined) { count++; updates.push(`admin_notes = $${count}`); params.push(admin_notes); }
    if (assigned_to) { count++; updates.push(`assigned_to = $${count}`); params.push(assigned_to); }
    if (priority) { count++; updates.push(`priority = $${count}`); params.push(priority); }
    if (status === 'resolved') { count++; updates.push(`resolved_at = $${count}`); params.push(new Date()); }
    updates.push(`updated_at = NOW()`);
    count++;
    params.push(id);

    const result = await pool.query(
      `UPDATE complaints SET ${updates.join(', ')} WHERE id = $${count} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    // Notify resident of status change
    if (status) {
      const complaint = result.rows[0];
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [complaint.user_id, 'Complaint Status Updated', `Your complaint "${complaint.title}" is now ${status}`, 'complaint', complaint.id, 'complaint']
      );
    }
    res.json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM complaints WHERE id = $1', [id]);
    res.json({ success: true, message: 'Complaint deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getComplaints, createComplaint, updateComplaint, deleteComplaint };
