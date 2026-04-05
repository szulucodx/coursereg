const express = require('express');
const db      = require('../config/db');
const router  = express.Router();

// ── GET ALL ACTIVE COURSES ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT
        c.CourseCode,
        c.CourseName,
        c.CreditHours,
        c.MaxCapacity,
        c.Semester,
        c.Description,
        d.DepartmentName,
        CONCAT(l.FirstName, ' ', l.LastName) AS LecturerName,
        COUNT(e.EnrollmentID)                AS EnrolledCount,
        (c.MaxCapacity - COUNT(e.EnrollmentID)) AS SeatsLeft
      FROM Course c
      JOIN Department d ON c.DepartmentID = d.DepartmentID
      LEFT JOIN Lecturer l ON c.LecturerID = l.LecturerID
      LEFT JOIN Enrollment e
             ON c.CourseCode = e.CourseCode AND e.Status = 'Active'
      WHERE c.IsActive = 1
      GROUP BY c.CourseCode, c.CourseName, c.CreditHours,
               c.MaxCapacity, c.Semester, c.Description,
               d.DepartmentName, l.FirstName, l.LastName
      ORDER BY c.CourseCode
    `);
    res.json({ success: true, courses });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Could not load courses.' });
  }
});

// ── GET PREREQUISITES FOR A COURSE ──────────────────────────
router.get('/:code/prerequisites', async (req, res) => {
  try {
    const [prereqs] = await db.query(`
      SELECT cp.PrerequisiteCode, c.CourseName
      FROM CoursePrerequisite cp
      JOIN Course c ON cp.PrerequisiteCode = c.CourseCode
      WHERE cp.CourseCode = ?
    `, [req.params.code]);
    res.json({ success: true, prerequisites: prereqs });
  } catch (err) {
    res.json({ success: false, message: 'Could not load prerequisites.' });
  }
});

module.exports = router;
