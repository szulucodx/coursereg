const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const router  = express.Router();

// ── REGISTER ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { nationalID, firstName, lastName, email, phone,
            dateOfBirth, programme, yearOfStudy, password } = req.body;

    // Check duplicate email or nationalID
    const [existing] = await db.query(
      'SELECT StudentID FROM Student WHERE Email = ? OR NationalID = ?',
      [email, nationalID]
    );
    if (existing.length > 0) {
      return res.json({ success: false, message: 'Email or National ID already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO Student
       (NationalID, FirstName, LastName, Email, Phone, DateOfBirth, Programme, YearOfStudy, PasswordHash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nationalID, firstName, lastName, email, phone, dateOfBirth, programme, yearOfStudy, hash]
    );

    res.json({ success: true, message: 'Registration successful! Please login.' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── LOGIN ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM Student WHERE Email = ?', [email]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }

    const student = rows[0];
    const match   = await bcrypt.compare(password, student.PasswordHash);

    if (!match) {
      return res.json({ success: false, message: 'Invalid email or password.' });
    }

    // Store session
    req.session.student = {
      id:        student.StudentID,
      firstName: student.FirstName,
      lastName:  student.LastName,
      email:     student.Email,
      programme: student.Programme,
      year:      student.YearOfStudy
    };

    res.json({ success: true, student: req.session.student });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── LOGOUT ──────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── GET SESSION ─────────────────────────────────────────────
router.get('/session', (req, res) => {
  if (req.session.student) {
    res.json({ loggedIn: true, student: req.session.student });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
