# Bright Future University — Course Registration System
## Setup Guide (Python + Flask + XAMPP)

This version keeps the existing HTML/CSS/JS frontend and replaces the backend with Python.

---

## Step 1 — Start XAMPP
- Open XAMPP Control Panel
- Start **Apache** and **MySQL**

You only need Apache if you want to serve the static files through XAMPP. The Flask app itself runs on Python.

---

## Step 2 — Create the Database
Run the Python initializer:

  python init_db.py

This creates the database, tables, and sample data automatically.

---

## Step 3 — Install Python
- Install Python 3.10 or newer
- Verify with:

  python --version

---

## Step 4 — Install Dependencies
Install the Python packages:

  pip install -r requirements.txt

---

## Step 5 — Configure Environment Variables
Copy `.env.example` to `.env` and update the values for your machine.

Supported variables:
- `PORT` (default: `3000`)
- `SESSION_SECRET` (default: `bfu-secret-key-2026`)
- `CURRENT_SEMESTER` (default: `Semester 1 2026`)
- `DB_HOST` (default: `localhost`)
- `DB_PORT` (default: `3306`)
- `DB_USER` (default: `root`)
- `DB_PASSWORD` (default: empty)
- `DB_NAME` (default: `BrightFutureUniversity`)

---

## Step 6 — Run the Server

  python app.py

You should see the app running at:

  http://localhost:3000

---

## Step 7 — Open the Website
Go to:

  http://localhost:3000

---

## Pages Available
| URL | Page |
|---|---|
| http://localhost:3000 | Login |
| http://localhost:3000/register | Student Registration |
| http://localhost:3000/dashboard | Dashboard |
| http://localhost:3000/courses | Browse Courses |
| http://localhost:3000/my-courses | My Courses & Grades |

---

## Troubleshooting
- **Cannot connect to database**: Make sure MySQL is running in XAMPP
- **Port 3000 already in use**: Set `PORT=3001` in `.env`
- **Missing Python package**: Run `pip install -r requirements.txt`
- **Database password error**: Set `DB_PASSWORD=yourpassword` in `.env`

---

## Project Structure
```
courseReg/
├── app.py             ← Flask server
├── db.py              ← MySQL helper functions
├── init_db.py         ← Database initializer
├── requirements.txt   ← Python dependencies
└── public/
  ├── css/style.css
  ├── js/app.js
  ├── frontend/pages/
  │   ├── login.html
  │   ├── register.html
  │   ├── courses.html
  │   └── my-courses.html
  └── admin/pages/
    └── dashboard.html
```
