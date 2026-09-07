const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone, flat_number, role = 'resident' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const allowedRole = ['admin', 'staff', 'resident'].includes(role) ? role : 'resident';
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, phone, flat_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, phone, flat_number',
      [name, email, hashedPassword, allowedRole, phone, flat_number]
    );
    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ success: true, message: 'Registered successfully', token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, message: 'Login successful', token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : req.user.avatar_url;
    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, email, role, phone, flat_number, avatar_url',
      [name || req.user.name, phone || req.user.phone, avatar_url, req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
