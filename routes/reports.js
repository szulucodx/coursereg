const express = require('express');
const db      = require('../config/db');
const router  = express.Router();

// ── ENROLMENT REPORT: fill rate per course ───────────────────
router.get('/enrolment', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.CourseCode,
        c.CourseName,
        d.DepartmentName,
        c.MaxCapacity,
        COUNT(e.EnrollmentID)                          AS ActiveEnrolments,
        ROUND(COUNT(e.EnrollmentID) * 100.0
              / c.MaxCapacity, 1)                       AS FillRatePct
      FROM Course c
      JOIN Department d ON c.DepartmentID = d.DepartmentID
      LEFT JOIN Enrollment e
             ON c.CourseCode = e.CourseCode AND e.Status = 'Active'
      GROUP BY c.CourseCode, c.CourseName,
               d.DepartmentName, c.MaxCapacity
      ORDER BY FillRatePct DESC
    `);
    res.json({ success: true, report: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Could not generate report.' });
  }
});

module.exports = router;
