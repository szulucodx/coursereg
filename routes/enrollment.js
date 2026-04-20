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
    const sectionID = Number(req.body.section_id ?? req.body.sectionID);
    const semester   = 'Semester 1 2026';

    if (!sectionID) {
      return res.json({ success: false, message: 'Section ID is required.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Check already enrolled
    const [existing] = await connection.query(
      `SELECT EnrollmentID FROM Enrollment
       WHERE Student_ID = ? AND Section_ID = ? AND Status = 'Active'`,
      [studentID, sectionID]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.json({ success: false, message: 'You are already enrolled in this section.' });
    }

    // 2. Check capacity
    const [capRows] = await connection.query(
      `SELECT s.Section_ID,
              s.Course_ID,
              s.MaxCapacity,
              COUNT(e.EnrollmentID) AS enrolled
       FROM Section s
       LEFT JOIN Enrollment e ON s.Section_ID = e.Section_ID AND e.Status = 'Active'
       WHERE s.Section_ID = ? AND s.IsActive = 1
       GROUP BY s.Section_ID, s.Course_ID, s.MaxCapacity
       FOR UPDATE`,
      [sectionID]
    );
    if (capRows.length === 0) {
      await connection.rollback();
      return res.json({ success: false, message: 'Section not found.' });
    }
    if (capRows[0].enrolled >= capRows[0].MaxCapacity) {
      await connection.rollback();
      return res.json({ success: false, message: 'This section is full. No seats available.' });
    }

    // 3. Check prerequisites
    const [prereqs] = await connection.query(
      `SELECT cp.PrerequisiteCode
       FROM CoursePrerequisite cp
       WHERE cp.CourseCode = ?`,
      [capRows[0].Course_ID]
    );

    for (const prereq of prereqs) {
      const [done] = await connection.query(
        `SELECT e.EnrollmentID
         FROM Enrollment e
         JOIN Section s ON e.Section_ID = s.Section_ID
         WHERE e.Student_ID = ? AND s.Course_ID = ? AND e.Status = 'Completed'`,
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
      `INSERT INTO Enrollment (Student_ID, Section_ID, EnrollmentDate, Status)
       VALUES (?, ?, CURRENT_DATE, 'Active')`,
      [studentID, sectionID]
    );

    await connection.commit();

    res.json({ success: true, message: `Successfully enrolled in section ${sectionID}!` });
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
        e.Section_ID,
        c.CourseCode,
        c.CourseName,
        c.CreditHours,
        c.Description,
        s.MaxCapacity,
        s.Semester,
        s.Year,
        s.TimeSlot,
        s.Room_No,
        d.DepartmentName,
        CONCAT(l.FirstName, ' ', l.LastName) AS LecturerName,
        e.Status,
        e.Grade,
        e.EnrollmentDate
      FROM Enrollment e
      JOIN Section   s ON e.Section_ID = s.Section_ID
      JOIN Course     c ON s.Course_ID = c.CourseCode
      JOIN Department d ON c.DepartmentID = d.DepartmentID
      LEFT JOIN Lecturer l ON s.Instructor_ID = l.LecturerID
      WHERE e.Student_ID = ?
      ORDER BY s.Year DESC, s.Semester, c.CourseCode, s.Section_ID
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
       WHERE EnrollmentID = ? AND Student_ID = ? AND Status = 'Active'`,
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
