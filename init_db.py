import os

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

import db


load_dotenv()


def execute_statements(connection, statements):
    with connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)
    connection.commit()


def main():
    db.ensure_database_exists()
    connection = db.get_connection()

    try:
        statements = [
            'DROP TABLE IF EXISTS Enrollment',
            'DROP TABLE IF EXISTS CoursePrerequisite',
            'DROP TABLE IF EXISTS Course',
            'DROP TABLE IF EXISTS Lecturer',
            'DROP TABLE IF EXISTS Department',
            'DROP TABLE IF EXISTS Admin',
            'DROP TABLE IF EXISTS Student',
            '''
            CREATE TABLE Student (
              StudentID INT AUTO_INCREMENT PRIMARY KEY,
              NationalID VARCHAR(20) UNIQUE NOT NULL,
              FirstName VARCHAR(100) NOT NULL,
              LastName VARCHAR(100) NOT NULL,
              Email VARCHAR(100) UNIQUE NOT NULL,
              Phone VARCHAR(20),
              DateOfBirth DATE,
              Programme VARCHAR(100),
              YearOfStudy INT,
              PasswordHash VARCHAR(255) NOT NULL,
              CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CHECK (YearOfStudy IS NULL OR YearOfStudy >= 1)
            )
            ''',
            '''
            CREATE TABLE Admin (
              AdminID INT AUTO_INCREMENT PRIMARY KEY,
              FullName VARCHAR(150) NOT NULL,
              Email VARCHAR(100) UNIQUE NOT NULL,
              PasswordHash VARCHAR(255) NOT NULL,
              IsActive BOOLEAN DEFAULT TRUE,
              CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''',
            '''
            CREATE TABLE Department (
              DepartmentID INT AUTO_INCREMENT PRIMARY KEY,
              DepartmentName VARCHAR(100) NOT NULL UNIQUE,
              DepartmentCode VARCHAR(10) NOT NULL UNIQUE
            )
            ''',
            '''
            CREATE TABLE Lecturer (
              LecturerID INT AUTO_INCREMENT PRIMARY KEY,
              FirstName VARCHAR(100) NOT NULL,
              LastName VARCHAR(100) NOT NULL,
              Email VARCHAR(100) UNIQUE,
              DepartmentID INT,
              FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID)
            )
            ''',
            '''
            CREATE TABLE Course (
              CourseCode VARCHAR(10) PRIMARY KEY,
              CourseName VARCHAR(150) NOT NULL,
              CreditHours INT NOT NULL,
              MaxCapacity INT NOT NULL,
              Semester VARCHAR(50),
              Description TEXT,
              DepartmentID INT NOT NULL,
              LecturerID INT,
              IsActive BOOLEAN DEFAULT TRUE,
              CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CHECK (CreditHours > 0),
              CHECK (MaxCapacity > 0),
              FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID),
              FOREIGN KEY (LecturerID) REFERENCES Lecturer(LecturerID)
            )
            ''',
            '''
            CREATE TABLE CoursePrerequisite (
              CourseCode VARCHAR(10) NOT NULL,
              PrerequisiteCode VARCHAR(10) NOT NULL,
              PRIMARY KEY (CourseCode, PrerequisiteCode),
              FOREIGN KEY (CourseCode) REFERENCES Course(CourseCode),
              FOREIGN KEY (PrerequisiteCode) REFERENCES Course(CourseCode)
            )
            ''',
            '''
            CREATE TABLE Enrollment (
              EnrollmentID INT AUTO_INCREMENT PRIMARY KEY,
              StudentID INT NOT NULL,
              CourseCode VARCHAR(10) NOT NULL,
              EnrollDate DATE NOT NULL,
              Grade VARCHAR(2),
              Status ENUM('Active', 'Completed', 'Dropped') DEFAULT 'Active',
              Semester VARCHAR(50),
              CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (StudentID) REFERENCES Student(StudentID),
              FOREIGN KEY (CourseCode) REFERENCES Course(CourseCode)
            )
            ''',
            'CREATE INDEX idx_enrollment_student_status_semester ON Enrollment (StudentID, Status, Semester)',
            'CREATE INDEX idx_enrollment_course_status ON Enrollment (CourseCode, Status)',
            'CREATE INDEX idx_enrollment_student_course_status ON Enrollment (StudentID, CourseCode, Status)',
            '''
            INSERT INTO Department (DepartmentName, DepartmentCode) VALUES
            ('Computer Science', 'CS'),
            ('Business Administration', 'BA'),
            ('Engineering', 'ENG'),
            ('Information Technology', 'IT'),
            ('Data Science', 'DS')
            ''',
            '''
            INSERT INTO Lecturer (FirstName, LastName, Email, DepartmentID) VALUES
            ('John', 'Smith', 'john.smith@bfu.edu', 1),
            ('Sarah', 'Johnson', 'sarah.johnson@bfu.edu', 1),
            ('Michael', 'Brown', 'michael.brown@bfu.edu', 2),
            ('Emily', 'Davis', 'emily.davis@bfu.edu', 3),
            ('David', 'Wilson', 'david.wilson@bfu.edu', 4)
            ''',
            '''
            INSERT INTO Course (CourseCode, CourseName, CreditHours, MaxCapacity, Semester, Description, DepartmentID, LecturerID, IsActive) VALUES
            ('CS101', 'Introduction to Computer Science', 3, 40, 'Semester 1 2026',
             'Learn the fundamentals of computer science, algorithms, and problem-solving techniques. This course covers basic programming concepts and computational thinking.', 1, 1, TRUE),
            ('CS201', 'Data Structures', 4, 35, 'Semester 1 2026',
             'Master essential data structures including arrays, linked lists, trees, and graphs. Understand time and space complexity analysis and optimize your code.', 1, 2, TRUE),
            ('CS301', 'Algorithms & Complexity', 4, 30, 'Semester 1 2026',
             'Explore advanced algorithms including sorting, searching, dynamic programming, and graph algorithms. Learn big-O notation and computational complexity theory.', 1, 1, TRUE),
            ('BA101', 'Introduction to Business', 3, 50, 'Semester 1 2026',
             'Explore fundamental business concepts, organizational structure, and economic principles. Foundation for all business management courses.', 2, 3, TRUE),
            ('BA201', 'Financial Management', 4, 40, 'Semester 1 2026',
             'Study financial statements, budgeting, capital budgeting, and investment analysis. Essential knowledge for business leaders and entrepreneurs.', 2, 3, TRUE),
            ('IT101', 'Web Development Basics', 3, 45, 'Semester 1 2026',
             'Learn HTML, CSS, and JavaScript to build responsive websites. Understand web standards and best practices for modern web development.', 4, 5, TRUE),
            ('IT201', 'Database Design', 4, 38, 'Semester 1 2026',
             'Design and implement relational databases using SQL. Learn normalization, indexing, and query optimization for efficient data management.', 4, 5, TRUE),
            ('DS101', 'Introduction to Data Science', 3, 35, 'Semester 1 2026',
             'Discover data analysis, visualization, and statistical methods. Learn Python libraries for data manipulation and exploratory data analysis.', 5, 2, TRUE),
            ('ENG101', 'Engineering Fundamentals', 3, 40, 'Semester 1 2026',
             'Introduction to engineering disciplines, design thinking, and technical problem-solving. Explore different engineering specializations.', 3, 4, TRUE)
            ''',
            '''
            INSERT INTO CoursePrerequisite (CourseCode, PrerequisiteCode) VALUES
            ('CS201', 'CS101'),
            ('CS301', 'CS201'),
            ('IT201', 'IT101'),
            ('BA201', 'BA101'),
            ('DS101', 'CS101')
            ''',
        ]

        execute_statements(connection, statements)

        sample_hash = generate_password_hash('password')
        admin_hash = generate_password_hash('admin123')
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO Admin (FullName, Email, PasswordHash)
                VALUES (%s, %s, %s)
                ''',
                (
                    'System Administrator',
                    'admin@bfu.ac.zm',
                    admin_hash,
                ),
            )

            cursor.execute(
                '''
                INSERT INTO Student (NationalID, FirstName, LastName, Email, Phone, DateOfBirth, Programme, YearOfStudy, PasswordHash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    '1234567890',
                    'Test',
                    'Student',
                    'test@student.com',
                    '0123456789',
                    '2000-01-15',
                    'Computer Science',
                    1,
                    sample_hash,
                ),
            )

            cursor.execute(
                '''
                INSERT INTO Enrollment (StudentID, CourseCode, EnrollDate, Status, Semester) VALUES
                (1, 'CS101', '2026-01-10', 'Active', 'Semester 1 2026'),
                (1, 'IT101', '2026-01-10', 'Active', 'Semester 1 2026'),
                (1, 'BA101', '2026-01-10', 'Active', 'Semester 1 2026')
                '''
            )
        connection.commit()

        print('✅ Database initialized successfully!')
        print(f'✅ Database: {os.getenv("DB_NAME", "BrightFutureUniversity")}')
        print('✅ Tables created: Student, Admin, Department, Lecturer, Course, CoursePrerequisite, Enrollment')
        print('\n📋 Sample Data Added:')
        print('   - 1 Admin (email: admin@bfu.ac.zm, password: admin123)')
        print('   - 5 Departments')
        print('   - 5 Lecturers')
        print('   - 9 Courses')
        print('   - 1 Test Student (email: test@student.com, password: password)')
        print('   - 3 Sample Enrollments')
        print('\n🚀 Ready to start the server!\n')
    finally:
        connection.close()


if __name__ == '__main__':
    main()
