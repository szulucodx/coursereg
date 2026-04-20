const mysql = require('mysql2');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'BrightFutureUniversity';

// Create connection (without specifying database)
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL\n');

  const sql = `
    -- Create database if not exists
    CREATE DATABASE IF NOT EXISTS ${DB_NAME};
    USE ${DB_NAME};

    -- Drop existing tables (if restarting)
    DROP TABLE IF EXISTS Enrollment;
    DROP TABLE IF EXISTS Section;
    DROP TABLE IF EXISTS CoursePrerequisite;
    DROP TABLE IF EXISTS Course;
    DROP TABLE IF EXISTS Lecturer;
    DROP TABLE IF EXISTS Department;
    DROP TABLE IF EXISTS Student;

    -- ===== STUDENT TABLE =====
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
    );

    -- ===== DEPARTMENT TABLE =====
    CREATE TABLE Department (
      DepartmentID INT AUTO_INCREMENT PRIMARY KEY,
      DepartmentName VARCHAR(100) NOT NULL UNIQUE,
      DepartmentCode VARCHAR(10) NOT NULL UNIQUE
    );

    -- ===== LECTURER TABLE =====
    CREATE TABLE Lecturer (
      LecturerID INT AUTO_INCREMENT PRIMARY KEY,
      FirstName VARCHAR(100) NOT NULL,
      LastName VARCHAR(100) NOT NULL,
      Email VARCHAR(100) UNIQUE,
      DepartmentID INT,
      FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID)
    );

    -- ===== COURSE TABLE =====
    CREATE TABLE Course (
      CourseCode VARCHAR(10) PRIMARY KEY,
      CourseName VARCHAR(150) NOT NULL,
      CreditHours INT NOT NULL,
      Description TEXT,
      DepartmentID INT NOT NULL,
      IsActive BOOLEAN DEFAULT TRUE,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (CreditHours > 0),
      FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID)
    );

    -- ===== SECTION TABLE =====
    CREATE TABLE Section (
      Section_ID INT AUTO_INCREMENT PRIMARY KEY,
      Course_ID VARCHAR(10) NOT NULL,
      Semester VARCHAR(50) NOT NULL,
      Year INT NOT NULL,
      TimeSlot VARCHAR(100) NOT NULL,
      Room_No VARCHAR(50) NOT NULL,
      MaxCapacity INT NOT NULL,
      Instructor_ID INT UNIQUE,
      IsActive BOOLEAN DEFAULT TRUE,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (MaxCapacity > 0),
      CHECK (Year >= 2000),
      FOREIGN KEY (Course_ID) REFERENCES Course(CourseCode),
      FOREIGN KEY (Instructor_ID) REFERENCES Lecturer(LecturerID)
    );

    -- ===== COURSE PREREQUISITE TABLE =====
    CREATE TABLE CoursePrerequisite (
      CourseCode VARCHAR(10) NOT NULL,
      PrerequisiteCode VARCHAR(10) NOT NULL,
      PRIMARY KEY (CourseCode, PrerequisiteCode),
      FOREIGN KEY (CourseCode) REFERENCES Course(CourseCode),
      FOREIGN KEY (PrerequisiteCode) REFERENCES Course(CourseCode)
    );

    -- ===== ENROLLMENT TABLE =====
    CREATE TABLE Enrollment (
      EnrollmentID INT AUTO_INCREMENT PRIMARY KEY,
      Student_ID INT NOT NULL,
      Section_ID INT NOT NULL,
      EnrollmentDate DATE NOT NULL,
      Grade VARCHAR(2),
      Status ENUM('Active', 'Completed', 'Dropped') DEFAULT 'Active',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (Student_ID) REFERENCES Student(StudentID),
      FOREIGN KEY (Section_ID) REFERENCES Section(Section_ID)
    );

    -- Indexes tuned for app queries
    CREATE INDEX idx_enrollment_student_status_section
      ON Enrollment (Student_ID, Status, Section_ID);
    CREATE INDEX idx_enrollment_section_status
      ON Enrollment (Section_ID, Status);
    CREATE INDEX idx_enrollment_student_section_status
      ON Enrollment (Student_ID, Section_ID, Status);
    CREATE UNIQUE INDEX uq_enrollment_student_section_active
      ON Enrollment (Student_ID, Section_ID, Status);

    -- ===== SAMPLE DATA =====

    -- Insert Departments
    INSERT INTO Department (DepartmentName, DepartmentCode) VALUES
    ('Computer Science', 'CS'),
    ('Business Administration', 'BA'),
    ('Engineering', 'ENG'),
    ('Information Technology', 'IT'),
    ('Data Science', 'DS');

    -- Insert Lecturers
    INSERT INTO Lecturer (FirstName, LastName, Email, DepartmentID) VALUES
    ('John', 'Smith', 'john.smith@bfu.edu', 1),
    ('Sarah', 'Johnson', 'sarah.johnson@bfu.edu', 1),
    ('Michael', 'Brown', 'michael.brown@bfu.edu', 2),
    ('Emily', 'Davis', 'emily.davis@bfu.edu', 3),
    ('David', 'Wilson', 'david.wilson@bfu.edu', 4);

    -- Insert Courses
    INSERT INTO Course (CourseCode, CourseName, CreditHours, Description, DepartmentID, IsActive) VALUES
    ('CS101', 'Introduction to Computer Science', 3,
     'Learn the fundamentals of computer science, algorithms, and problem-solving techniques. This course covers basic programming concepts and computational thinking.', 1, TRUE),
    ('CS201', 'Data Structures', 4,
     'Master essential data structures including arrays, linked lists, trees, and graphs. Understand time and space complexity analysis and optimize your code.', 1, TRUE),
    ('CS301', 'Algorithms & Complexity', 4,
     'Explore advanced algorithms including sorting, searching, dynamic programming, and graph algorithms. Learn big-O notation and computational complexity theory.', 1, TRUE),
    ('BA101', 'Introduction to Business', 3,
     'Explore fundamental business concepts, organizational structure, and economic principles. Foundation for all business management courses.', 2, TRUE),
    ('BA201', 'Financial Management', 4,
     'Study financial statements, budgeting, capital budgeting, and investment analysis. Essential knowledge for business leaders and entrepreneurs.', 2, TRUE),
    ('IT101', 'Web Development Basics', 3,
     'Learn HTML, CSS, and JavaScript to build responsive websites. Understand web standards and best practices for modern web development.', 4, TRUE),
    ('IT201', 'Database Design', 4,
     'Design and implement relational databases using SQL. Learn normalization, indexing, and query optimization for efficient data management.', 4, TRUE),
    ('DS101', 'Introduction to Data Science', 3,
     'Discover data analysis, visualization, and statistical methods. Learn Python libraries for data manipulation and exploratory data analysis.', 5, TRUE),
    ('ENG101', 'Engineering Fundamentals', 3,
     'Introduction to engineering disciplines, design thinking, and technical problem-solving. Explore different engineering specializations.', 3, TRUE);

    -- Insert Sections
    INSERT INTO Section (Course_ID, Semester, Year, TimeSlot, Room_No, MaxCapacity, Instructor_ID) VALUES
    ('CS101', 'Semester 1', 2026, 'Mon 08:00-10:00', 'A101', 40, 1),
    ('CS201', 'Semester 1', 2026, 'Tue 10:00-12:00', 'A201', 35, 2),
    ('CS301', 'Semester 1', 2026, 'Wed 13:00-15:00', 'A301', 30, 3),
    ('BA101', 'Semester 1', 2026, 'Thu 09:00-11:00', 'B101', 50, 4),
    ('IT101', 'Semester 1', 2026, 'Fri 08:00-10:00', 'C105', 45, 5),
    ('BA201', 'Semester 1', 2026, 'Fri 11:00-13:00', 'B204', 40, NULL),
    ('IT201', 'Semester 1', 2026, 'Mon 13:00-15:00', 'C210', 38, NULL),
    ('DS101', 'Semester 1', 2026, 'Tue 14:00-16:00', 'D110', 35, NULL),
    ('ENG101', 'Semester 1', 2026, 'Wed 08:00-10:00', 'E120', 40, NULL);

    -- Insert Course Prerequisites
    INSERT INTO CoursePrerequisite (CourseCode, PrerequisiteCode) VALUES
    ('CS201', 'CS101'),
    ('CS301', 'CS201'),
    ('IT201', 'IT101'),
    ('BA201', 'BA101'),
    ('DS101', 'CS101');

    -- Insert Sample Student (for testing)
    INSERT INTO Student (NationalID, FirstName, LastName, Email, Phone, DateOfBirth, Programme, YearOfStudy, PasswordHash) 
    VALUES ('1234567890', 'Test', 'Student', 'test@student.com', '0123456789', '2000-01-15', 'Computer Science', 1, '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/tSe');
    -- Password: password

    -- Insert Sample Enrollments
    INSERT INTO Enrollment (Student_ID, Section_ID, EnrollmentDate, Status) VALUES
    (1, 1, '2026-01-10', 'Active'),
    (1, 5, '2026-01-10', 'Active'),
    (1, 4, '2026-01-10', 'Active');
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error initializing database:', err.message);
      connection.end();
      process.exit(1);
    }

    console.log('✅ Database initialized successfully!');
    console.log(`✅ Database: ${DB_NAME}`);
    console.log('✅ Tables created: Student, Department, Lecturer, Course, Section, CoursePrerequisite, Enrollment');
    console.log('\n📋 Sample Data Added:');
    console.log('   - 5 Departments');
    console.log('   - 5 Lecturers');
    console.log('   - 9 Courses');
    console.log('   - 1 Test Student (email: test@student.com, password: password)');
    console.log('   - 3 Sample Enrollments');
    console.log('\n🚀 Ready to start the server!\n');

    connection.end();
  });
});
