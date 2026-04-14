from datetime import timedelta
from functools import wraps
from pathlib import Path
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, session, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

import db


load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / 'public'
PAGE_DIR = PUBLIC_DIR / 'frontend' / 'pages'
ADMIN_PAGE_DIR = PUBLIC_DIR / 'admin' / 'pages'


app = Flask(__name__, static_folder=str(PUBLIC_DIR), static_url_path='')
app.secret_key = os.getenv('SESSION_SECRET', 'bfu-secret-key-2026')
app.permanent_session_lifetime = timedelta(hours=2)
db.ensure_database_exists()


def _json_error(message, status=200):
    return jsonify({'success': False, 'message': message}), status


def require_authenticated_session(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if 'student' not in session and 'admin' not in session:
            if request.path.startswith('/api/'):
                return _json_error('Please log in first.')
            return redirect('/')
        return view(*args, **kwargs)

    return wrapped


def require_student_session(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if 'student' not in session:
            if request.path.startswith('/api/'):
                return _json_error('Please log in first.')
            return redirect('/')
        return view(*args, **kwargs)

    return wrapped


def require_admin_session(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if 'admin' not in session:
            if request.path.startswith('/api/'):
                return _json_error('Admin login required.')
            return redirect('/')
        return view(*args, **kwargs)

    return wrapped


def redirect_if_logged_in(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if 'student' in session or 'admin' in session:
            return redirect('/dashboard')
        return view(*args, **kwargs)

    return wrapped


def _current_student():
    return session.get('student')


def _current_admin():
    return session.get('admin')


def _current_user():
    return _current_admin() or _current_student()


@app.get('/')
@app.get('/login')
@app.get('/login.php')
@app.get('/courseReg/public/frontend/pages/login.php')
@redirect_if_logged_in
def login_page():
    return send_from_directory(PAGE_DIR, 'login.html')


@app.get('/register')
@app.get('/signup')
@app.get('/register.php')
@app.get('/courseReg/public/frontend/pages/register.php')
@redirect_if_logged_in
def register_page():
    return send_from_directory(PAGE_DIR, 'register.html')


@app.get('/courses')
@app.get('/courseReg/public/frontend/pages/courses.php')
@require_student_session
def courses_page():
    return send_from_directory(PAGE_DIR, 'courses.html')


@app.get('/my-courses')
@app.get('/my-courses.php')
@app.get('/courseReg/public/frontend/pages/my-courses.php')
@require_student_session
def my_courses_page():
    return send_from_directory(PAGE_DIR, 'my-courses.html')


@app.get('/dashboard')
@require_authenticated_session
def dashboard_page():
    return send_from_directory(ADMIN_PAGE_DIR, 'dashboard.html')


@app.post('/api/auth/register')
def register():
    try:
        payload = request.get_json(silent=True) or request.form
        national_id = (payload.get('nationalID') or '').strip()
        first_name = (payload.get('firstName') or '').strip()
        last_name = (payload.get('lastName') or '').strip()
        email = (payload.get('email') or '').strip().lower()
        phone = (payload.get('phone') or '').strip()
        date_of_birth = (payload.get('dateOfBirth') or '').strip() or None
        programme = (payload.get('programme') or '').strip()
        year_of_study_raw = (payload.get('yearOfStudy') or '').strip()
        password = payload.get('password') or ''

        if not all([national_id, first_name, last_name, email, programme, password]):
            return _json_error('Please fill in all required fields.')

        year_of_study = int(year_of_study_raw) if year_of_study_raw else None

        existing = db.query(
            'SELECT StudentID FROM Student WHERE Email = %s OR NationalID = %s',
            (email, national_id),
        )
        if existing:
            return jsonify({
                'success': False,
                'message': 'Email or National ID already registered.'
            })

        password_hash = generate_password_hash(password)
        db.execute(
            '''
            INSERT INTO Student
            (NationalID, FirstName, LastName, Email, Phone, DateOfBirth, Programme, YearOfStudy, PasswordHash)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            (
                national_id,
                first_name,
                last_name,
                email,
                phone or None,
                date_of_birth,
                programme,
                year_of_study,
                password_hash,
            ),
        )

        return jsonify({
            'success': True,
            'message': 'Registration successful! Please login.'
        })
    except Exception as exc:
        print(exc)
        return _json_error('Server error. Please try again.')


@app.post('/api/auth/login')
def login():
    try:
        payload = request.get_json(silent=True) or request.form
        email = (payload.get('email') or '').strip().lower()
        password = payload.get('password') or ''

        admin_rows = db.query(
            'SELECT * FROM Admin WHERE Email = %s AND IsActive = 1',
            (email,),
        )
        if admin_rows:
            admin = admin_rows[0]
            if not check_password_hash(admin['PasswordHash'], password):
                return jsonify({'success': False, 'message': 'Invalid email or password.'})

            session.clear()
            session.permanent = True
            session['admin'] = {
                'id': admin['AdminID'],
                'fullName': admin['FullName'],
                'email': admin['Email'],
                'role': 'admin',
            }

            return jsonify({'success': True, 'user': session['admin']})

        rows = db.query('SELECT * FROM Student WHERE Email = %s', (email,))
        if not rows:
            return jsonify({'success': False, 'message': 'Invalid email or password.'})

        student = rows[0]
        if not check_password_hash(student['PasswordHash'], password):
            return jsonify({'success': False, 'message': 'Invalid email or password.'})

        session.clear()
        session.permanent = True
        session['student'] = {
            'id': student['StudentID'],
            'firstName': student['FirstName'],
            'lastName': student['LastName'],
            'email': student['Email'],
            'programme': student['Programme'],
            'year': student['YearOfStudy'],
            'role': 'student',
        }

        return jsonify({'success': True, 'user': session['student']})
    except Exception as exc:
        print(exc)
        return _json_error('Server error. Please try again.')


@app.post('/api/auth/logout')
def logout():
    session.clear()
    return jsonify({'success': True})


@app.get('/api/auth/session')
def auth_session():
    user = _current_user()
    if user:
        payload = {'loggedIn': True, 'user': user}
        if user.get('role') == 'student':
            payload['student'] = user
        return jsonify(payload)
    return jsonify({'loggedIn': False})


@app.get('/api/courses')
def get_courses():
    try:
        courses = db.query(
            '''
            SELECT
              c.CourseCode,
              c.CourseName,
              c.CreditHours,
              c.MaxCapacity,
              c.Semester,
              c.Description,
              d.DepartmentName,
              CONCAT(l.FirstName, ' ', l.LastName) AS LecturerName,
              COUNT(e.EnrollmentID) AS EnrolledCount,
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
            '''
        )
        return jsonify({'success': True, 'courses': courses})
    except Exception as exc:
        print(exc)
        return _json_error('Could not load courses.')


@app.get('/api/courses/<code>/prerequisites')
def get_prerequisites(code):
    try:
        prereqs = db.query(
            '''
            SELECT cp.PrerequisiteCode, c.CourseName
            FROM CoursePrerequisite cp
            JOIN Course c ON cp.PrerequisiteCode = c.CourseCode
            WHERE cp.CourseCode = %s
            ''',
            (code,),
        )
        return jsonify({'success': True, 'prerequisites': prereqs})
    except Exception as exc:
        print(exc)
        return _json_error('Could not load prerequisites.')


@app.post('/api/enrollment/enrol')
@require_student_session
def enrol_course():
    connection = None
    try:
        student = _current_student()
        payload = request.get_json(silent=True) or request.form
        course_code = (payload.get('courseCode') or '').strip()
        semester = os.getenv('CURRENT_SEMESTER', 'Semester 1 2026')

        if not course_code:
            return _json_error('Course code is required.')

        connection = db.get_connection()
        with connection.cursor() as cursor:
            connection.begin()

            cursor.execute(
                '''
                SELECT EnrollmentID
                FROM Enrollment
                WHERE StudentID = %s AND CourseCode = %s AND Semester = %s AND Status = 'Active'
                ''',
                (student['id'], course_code, semester),
            )
            if cursor.fetchone():
                connection.rollback()
                return jsonify({
                    'success': False,
                    'message': 'You are already enrolled in this course.'
                })

            cursor.execute(
                'SELECT MaxCapacity FROM Course WHERE CourseCode = %s FOR UPDATE',
                (course_code,),
            )
            course = cursor.fetchone()
            if not course:
                connection.rollback()
                return jsonify({'success': False, 'message': 'Course not found.'})

            cursor.execute(
                '''
                SELECT COUNT(*) AS enrolled
                FROM Enrollment
                WHERE CourseCode = %s AND Status = 'Active'
                ''',
                (course_code,),
            )
            enrolled = cursor.fetchone()['enrolled']
            if enrolled >= course['MaxCapacity']:
                connection.rollback()
                return jsonify({
                    'success': False,
                    'message': 'This course is full. No seats available.'
                })

            cursor.execute(
                'SELECT PrerequisiteCode FROM CoursePrerequisite WHERE CourseCode = %s',
                (course_code,),
            )
            prereqs = cursor.fetchall()
            for prereq in prereqs:
                cursor.execute(
                    '''
                    SELECT EnrollmentID
                    FROM Enrollment
                    WHERE StudentID = %s AND CourseCode = %s AND Status = 'Completed'
                    ''',
                    (student['id'], prereq['PrerequisiteCode']),
                )
                if not cursor.fetchone():
                    connection.rollback()
                    return jsonify({
                        'success': False,
                        'message': f"You must complete {prereq['PrerequisiteCode']} before enrolling in this course."
                    })

            cursor.execute(
                '''
                INSERT INTO Enrollment (StudentID, CourseCode, EnrollDate, Status, Semester)
                VALUES (%s, %s, CURDATE(), 'Active', %s)
                ''',
                (student['id'], course_code, semester),
            )
            connection.commit()

        return jsonify({'success': True, 'message': f'Successfully enrolled in {course_code}!'})
    except Exception as exc:
        if connection:
            connection.rollback()
        print(exc)
        return _json_error('Server error during enrolment.')
    finally:
        if connection:
            connection.close()


@app.get('/api/enrollment/my')
@require_student_session
def my_enrollments():
    try:
        student = _current_student()
        rows = db.query(
            '''
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
            JOIN Course c ON e.CourseCode = c.CourseCode
            JOIN Department d ON c.DepartmentID = d.DepartmentID
            LEFT JOIN Lecturer l ON c.LecturerID = l.LecturerID
            WHERE e.StudentID = %s
            ORDER BY e.Semester, c.CourseCode
            ''',
            (student['id'],),
        )
        return jsonify({'success': True, 'enrollments': rows})
    except Exception as exc:
        print(exc)
        return _json_error('Could not load enrollments.')


@app.post('/api/enrollment/drop')
@require_student_session
def drop_enrollment():
    try:
        student = _current_student()
        payload = request.get_json(silent=True) or request.form
        enrollment_id = payload.get('enrollmentID')

        if not enrollment_id:
            return _json_error('Enrollment ID is required.')

        affected = db.execute(
            '''
            UPDATE Enrollment
            SET Status = 'Dropped'
            WHERE EnrollmentID = %s AND StudentID = %s AND Status = 'Active'
            ''',
            (enrollment_id, student['id']),
        )

        if affected == 0:
            return jsonify({'success': False, 'message': 'Could not drop this course.'})

        return jsonify({'success': True, 'message': 'Course dropped successfully.'})
    except Exception as exc:
        print(exc)
        return _json_error('Server error.')


@app.get('/api/reports/enrolment')
@require_admin_session
def enrolment_report():
    try:
        rows = db.query(
            '''
            SELECT
              c.CourseCode,
              c.CourseName,
              d.DepartmentName,
              c.MaxCapacity,
              COUNT(e.EnrollmentID) AS ActiveEnrolments,
              ROUND(COUNT(e.EnrollmentID) * 100.0 / c.MaxCapacity, 1) AS FillRatePct
            FROM Course c
            JOIN Department d ON c.DepartmentID = d.DepartmentID
            LEFT JOIN Enrollment e
                   ON c.CourseCode = e.CourseCode AND e.Status = 'Active'
            GROUP BY c.CourseCode, c.CourseName, d.DepartmentName, c.MaxCapacity
            ORDER BY FillRatePct DESC
            '''
        )
        return jsonify({'success': True, 'report': rows})
    except Exception as exc:
        print(exc)
        return _json_error('Could not generate report.')


if __name__ == '__main__':
    db.ensure_database_exists()
    port = int(os.getenv('PORT', '3000'))
    app.run(host='0.0.0.0', port=port, debug=True)
