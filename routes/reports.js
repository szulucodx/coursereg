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
        s.Section_ID,
        s.Semester,
        s.Year,
        s.TimeSlot,
        s.Room_No,
        d.DepartmentName,
        s.MaxCapacity,
        COUNT(e.EnrollmentID)                          AS ActiveEnrolments,
        ROUND(COUNT(e.EnrollmentID) * 100.0
              / s.MaxCapacity, 1)                       AS FillRatePct
      FROM Section s
      JOIN Course c ON s.Course_ID = c.CourseCode
      JOIN Department d ON c.DepartmentID = d.DepartmentID
      LEFT JOIN Enrollment e
             ON s.Section_ID = e.Section_ID AND e.Status = 'Active'
      GROUP BY c.CourseCode, c.CourseName,
               s.Section_ID, s.Semester, s.Year, s.TimeSlot, s.Room_No,
               d.DepartmentName, s.MaxCapacity
      ORDER BY FillRatePct DESC
    `);
    res.json({ success: true, report: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Could not generate report.' });
  }
});

module.exports = router;
