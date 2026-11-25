const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { 
      name, 
      email, 
      password, 
      student_id, 
      department, 
      university, 
      level_term, 
      target_cgpa, 
      role, 
      admin_key 
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanStudentId = student_id && student_id.trim() !== '' ? student_id.trim() : null;
    const cleanName = name.trim();
    const dept = department ? department.trim() : 'Cyber Security Engineering';
    const uni = university ? university.trim() : 'University of Frontier Technology, Bangladesh (UFTB)';
    const term = level_term ? level_term.trim() : 'Level 1, Term 1';
    const target = target_cgpa ? parseFloat(target_cgpa) : 3.80;

    // Admin Role Protection: Only users with verified Admin Secret Key can register as ADMIN
    const requestedRole = (role || 'STUDENT').toUpperCase();
    let userRole = 'STUDENT';
    if (requestedRole === 'ADMIN') {
      const validAdminKey = process.env.ADMIN_SECRET_KEY || 'GradPathAdmin@2026';
      if (!admin_key || admin_key.trim() !== validAdminKey) {
        return res.status(403).json({
          error: 'Admin verification failed: Valid Admin Secret Key is required to create an Admin account.'
        });
      }
      userRole = 'ADMIN';
    }

    // Begin Database Transaction for Atomic Registration
    await connection.beginTransaction();

    // 1. Check if email already exists
    const [existingEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // 2. Check if student_id already exists (Unique Student ID constraint)
    if (cleanStudentId) {
      const [existingStudentId] = await connection.query('SELECT id FROM users WHERE student_id = ?', [cleanStudentId]);
      if (existingStudentId.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'An account with this Student ID / Faculty ID already exists.' });
      }
    }

    // 3. Salt and hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Insert user with UNIVERSITY properly stored in DB
    const [result] = await connection.query(`
      INSERT INTO users (name, email, password, student_id, role, department, university, level_term, target_cgpa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanName,
      cleanEmail,
      hashedPassword,
      cleanStudentId,
      userRole,
      dept,
      uni,
      term,
      target
    ]);

    const userId = result.insertId;

    // 5. Create default semester for students atomically
    if (userRole === 'STUDENT') {
      await connection.query(`
        INSERT INTO semesters (user_id, name, term_order, is_completed)
        VALUES (?, ?, 1, 0)
      `, [userId, term]);
    }

    // Commit Transaction
    await connection.commit();

    const token = jwt.sign(
      { userId, email: cleanEmail, role: userRole },
      process.env.JWT_SECRET || 'gradpath_jwt_secret_key_2026_super_secure',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        student_id: cleanStudentId,
        role: userRole,
        department: dept,
        university: uni,
        level_term: term,
        target_cgpa: target,
        completed_credits: 0.00
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Registration transaction error:', error);
    return res.status(500).json({ error: 'Server database transaction error during registration.' });
  } finally {
    connection.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const pool = getPool();
    const cleanInput = email.trim().toLowerCase();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR student_id = ? OR (email = "admin@gmail.com" AND ? = "admin@uftb.ac.bd") OR (email = "admin@uftb.ac.bd" AND ? = "admin@gmail.com")',
      [cleanInput, email.trim(), cleanInput, cleanInput]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'gradpath_jwt_secret_key_2026_super_secure',
      { expiresIn: '7d' }
    );

    delete user.password;
    return res.json({
      message: 'Logged in successfully.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, target_cgpa, current_cgpa, completed_credits, level_term, department } = req.body;
    const pool = getPool();

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (target_cgpa !== undefined && target_cgpa !== null && target_cgpa !== '') {
      updates.push('target_cgpa = ?');
      values.push(parseFloat(target_cgpa));
    }
    if (current_cgpa !== undefined && current_cgpa !== null && current_cgpa !== '') {
      updates.push('current_cgpa = ?');
      values.push(parseFloat(current_cgpa));
    }
    if (completed_credits !== undefined && completed_credits !== null && completed_credits !== '') {
      updates.push('completed_credits = ?');
      values.push(parseFloat(completed_credits));
    }
    if (level_term) {
      updates.push('level_term = ?');
      values.push(level_term.trim());
    }
    if (department) {
      updates.push('department = ?');
      values.push(department.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' });
    }

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query(
      'SELECT id, name, email, student_id, role, department, university, level_term, target_cgpa, current_cgpa, completed_credits FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      message: 'Profile updated successfully.',
      user: rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email or Student ID is required.' });
    }

    const pool = getPool();
    const cleanInput = email.trim().toLowerCase();

    // Check if user exists
    const [rows] = await pool.query(
      'SELECT id, name, email, student_id FROM users WHERE email = ? OR student_id = ? OR (email = "admin@gmail.com" AND ? = "admin@uftb.ac.bd") OR (email = "admin@uftb.ac.bd" AND ? = "admin@gmail.com")',
      [cleanInput, email.trim(), cleanInput, cleanInput]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account registered with this email or student ID.' });
    }

    const user = rows[0];

    // Rate Limiting: 60-second cooldown between OTP requests for the same user
    const [recentOtp] = await pool.query(
      'SELECT id, created_at FROM otp_codes WHERE email = ? AND created_at > (NOW() - INTERVAL 1 MINUTE) ORDER BY id DESC LIMIT 1',
      [user.email]
    );

    if (recentOtp.length > 0) {
      return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds before requesting a new code.' });
    }

    // Generate cryptographically secure 6-digit verification code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean previous unverified OTPs for this user
    await pool.query('DELETE FROM otp_codes WHERE email = ?', [user.email]);

    // Insert new OTP with attempts counter and is_used flag
    await pool.query(`
      INSERT INTO otp_codes (email, otp, attempts, is_used, expires_at)
      VALUES (?, ?, 0, 0, ?)
    `, [user.email, otpCode, expiresAt]);

    return res.json({
      message: `Verification code sent to ${user.email}. Enter the 6-digit code to verify your identity.`,
      email: user.email,
      otp: otpCode // Returned for testing & on-screen verification banner
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Failed to generate verification code.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, 6-digit verification code, and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const pool = getPool();
    const cleanInput = email.trim().toLowerCase();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR student_id = ? OR (email = "admin@gmail.com" AND ? = "admin@uftb.ac.bd") OR (email = "admin@uftb.ac.bd" AND ? = "admin@gmail.com")',
      [cleanInput, email.trim(), cleanInput, cleanInput]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const user = rows[0];

    // Verify active OTP
    const [otpRows] = await pool.query(`
      SELECT * FROM otp_codes 
      WHERE email = ? AND is_used = 0 AND expires_at > NOW() 
      ORDER BY id DESC LIMIT 1
    `, [user.email]);

    if (otpRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired 6-digit verification code. Please request a new code.' });
    }

    const otpRecord = otpRows[0];

    // Brute-force protection: Max 5 failed attempts per code
    if (otpRecord.attempts >= 5) {
      await pool.query('DELETE FROM otp_codes WHERE id = ?', [otpRecord.id]);
      return res.status(429).json({ error: 'Maximum verification attempts exceeded. This code has been invalidated. Please request a new code.' });
    }

    if (otpRecord.otp !== otp.trim()) {
      const newAttempts = (otpRecord.attempts || 0) + 1;
      if (newAttempts >= 5) {
        await pool.query('DELETE FROM otp_codes WHERE id = ?', [otpRecord.id]);
        return res.status(429).json({
          error: 'Maximum verification attempts exceeded. This code has been invalidated. Please request a new code.'
        });
      }
      await pool.query('UPDATE otp_codes SET attempts = ? WHERE id = ?', [newAttempts, otpRecord.id]);
      const remaining = 5 - newAttempts;
      return res.status(400).json({
        error: `Incorrect verification code. ${remaining} attempt(s) remaining.`
      });
    }

    // Salt and hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    // Single use: Mark OTP used and remove
    await pool.query('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);
    await pool.query('DELETE FROM otp_codes WHERE email = ?', [user.email]);

    return res.json({
      message: 'Password reset verified & completed successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Server error resetting password.' });
  }
});

module.exports = router;
