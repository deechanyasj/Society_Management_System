const pool = require('../config/database');

const getAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as created_by_name FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.is_active = true ORDER BY a.created_at DESC`
    );
    res.json({ success: true, announcements: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, priority, expires_at } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }
    const result = await pool.query(
      'INSERT INTO announcements (title, content, category, priority, created_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, content, category || 'general', priority || 'normal', req.user.id, expires_at]
    );
    res.status(201).json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, priority, is_active } = req.body;
    const result = await pool.query(
      'UPDATE announcements SET title = $1, content = $2, category = $3, priority = $4, is_active = $5 WHERE id = $6 RETURNING *',
      [title, content, category, priority, is_active, id]
    );
    res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
