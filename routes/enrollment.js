const express = require('express');
const db      = require('../config/db');
const router  = express.Router();

// Auth guard middleware
function requireLogin(req, res, next) {
  if (!req.session.student) {
    return res.json({ success: false, message: 'Please log in first.' });
  }
  next();
}

// ── ENROL IN A COURSE ────────────────────────────────────────
router.post('/enrol', requireLogin, async (req, res) => {
  let connection;
  try {
    const studentID  = req.session.student.id;
    const { courseCode } = req.body;
    const semester   = 'Semester 1 2026';

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Check already enrolled
    const [existing] = await connection.query(
      `SELECT EnrollmentID FROM Enrollment
       WHERE StudentID = ? AND CourseCode = ? AND Semester = ? AND Status = 'Active'`,
      [studentID, courseCode, semester]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.json({ success: false, message: 'You are already enrolled in this course.' });
    }

    // 2. Check capacity
    const [capRows] = await connection.query(
      `SELECT c.MaxCapacity,
              COUNT(e.EnrollmentID) AS enrolled
       FROM Course c
       LEFT JOIN Enrollment e ON c.CourseCode = e.CourseCode AND e.Status = 'Active'
       WHERE c.CourseCode = ?
       GROUP BY c.MaxCapacity
       FOR UPDATE`,
      [courseCode]
    );
    if (capRows.length === 0) {
      await connection.rollback();
      return res.json({ success: false, message: 'Course not found.' });
    }
    if (capRows[0].enrolled >= capRows[0].MaxCapacity) {
      await connection.rollback();
      return res.json({ success: false, message: 'This course is full. No seats available.' });
    }

    // 3. Check prerequisites
    const [prereqs] = await connection.query(
      `SELECT cp.PrerequisiteCode
       FROM CoursePrerequisite cp
       WHERE cp.CourseCode = ?`,
      [courseCode]
    );

    for (const prereq of prereqs) {
      const [done] = await connection.query(
        `SELECT EnrollmentID FROM Enrollment
         WHERE StudentID = ? AND CourseCode = ? AND Status = 'Completed'`,
        [studentID, prereq.PrerequisiteCode]
      );
      if (done.length === 0) {
        await connection.rollback();
        return res.json({
          success: false,
          message: `You must complete ${prereq.PrerequisiteCode} before enrolling in this course.`
        });
      }
    }

    // 4. Enrol
    await connection.query(
      `INSERT INTO Enrollment (StudentID, CourseCode, EnrollDate, Status, Semester)
       VALUES (?, ?, CURRENT_DATE, 'Active', ?)`,
      [studentID, courseCode, semester]
    );

    await connection.commit();

    res.json({ success: true, message: `Successfully enrolled in ${courseCode}!` });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error(err);
    res.json({ success: false, message: 'Server error during enrolment.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ── GET MY ENROLLMENTS ────────────────────────────────────────
router.get('/my', requireLogin, async (req, res) => {
  try {
    const studentID = req.session.student.id;
    const [rows] = await db.query(`
      SELECT
        e.EnrollmentID,
        e.CourseCode,
        c.CourseName,
        c.CreditHours,
        c.Description,
        c.MaxCapacity,
        c.Semester AS CourseDay,
        d.DepartmentName,
        CONCAT(l.FirstName, ' ', l.LastName) AS LecturerName,
        e.Status,
        e.Grade,
        e.EnrollDate,
        e.Semester
      FROM Enrollment e
      JOIN Course     c ON e.CourseCode  = c.CourseCode
      JOIN Department d ON c.DepartmentID = d.DepartmentID
      LEFT JOIN Lecturer l ON c.LecturerID = l.LecturerID
      WHERE e.StudentID = ?
      ORDER BY e.Semester, c.CourseCode
    `, [studentID]);
    res.json({ success: true, enrollments: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Could not load enrollments.' });
  }
});

// ── DROP A COURSE ─────────────────────────────────────────────
router.post('/drop', requireLogin, async (req, res) => {
  try {
    const studentID = req.session.student.id;
    const { enrollmentID } = req.body;

    const [result] = await db.query(
      `UPDATE Enrollment SET Status = 'Dropped'
       WHERE EnrollmentID = ? AND StudentID = ? AND Status = 'Active'`,
      [enrollmentID, studentID]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Could not drop this course.' });
    }
    res.json({ success: true, message: 'Course dropped successfully.' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
