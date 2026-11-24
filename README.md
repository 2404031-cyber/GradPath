# 🎓 GradPath: Smart CGPA Planner & Academic Tracker

**University of Frontier Technology, Bangladesh (UFTB)**  
**Department of Cyber Security Engineering**  
**Course Name:** Android and Web Application Development Sessional  
**Course Code:** PROG212  
**Course Instructor:** Md. Abdullah, Lecturer, Dept. of Cyber Security Engineering  

---

## 👥 Project Team Members
| Student Name | Student ID | Email | Level / Term |
| :--- | :--- | :--- | :--- |
| **Md. Mobinur Mustofa Kawsar** | 2404031 | 2404031@uftb.ac.bd | Level 2, Term 1 |
| **Md. Manjarul Islam Tamim** | 2404026 | 2404026@uftb.ac.bd | Level 2, Term 1 |

---

## 🚀 Quick Start (Running the Project)

You can run the entire system with one double-click on **`run_project.bat`** in this folder, or run individually:

### 1. Database (MySQL / XAMPP)
- The project connects directly to your XAMPP MySQL server running on port `3306` with user `root` and default empty password.
- The backend automatically creates the database `gradpath_db`, creates all relational tables, and seeds demonstration students, admin, courses, and focus logs.

### 2. Demo Check Accounts (One-Click Login available on UI):
* **Student 1 (Md. Mobinur Mustofa Kawsar):**
  * Email: `2404031@uftb.ac.bd`
  * Password: `Student@12345`
  * Role: Student (ID: 2404031, Level 2 Term 1, Target CGPA: 3.80)
* **Student 2 (Md. Manjarul Islam Tamim):**
  * Email: `2404026@uftb.ac.bd`
  * Password: `Student@12345`
  * Role: Student (ID: 2404026, Level 2 Term 1, Target CGPA: 3.75)
* **Faculty & Admin (Md. Abdullah):**
  * Email: `admin@uftb.ac.bd`
  * Password: `Admin@12345`
  * Role: Admin (Full Department Oversight, Student Directory & Live CGPA Monitoring)

### 3. Application URLs:
* **Frontend UI (Desktop & Android phone):** [http://localhost:5173](http://localhost:5173)  
  *(On Android phone on same WiFi, access via `http://<your-ip>:5173`)*
* **Backend REST API:** [http://localhost:5000](http://localhost:5000)
* **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🌟 Core Features & Modules

1. **Academic Dashboard & Official Bangladeshi 4.00 CGPA Engine:**
   * Accurate cumulative CGPA and semester SGPA calculation:
     $$\text{SGPA / CGPA} = \frac{\sum (\text{credits} \times \text{grade point})}{\sum \text{credits}}$$
   * Official Bangladeshi grading scale: A+ (4.00), A (3.75), A- (3.50), B+ (3.25), B (3.00), B- (2.75), C+ (2.50), C (2.25), D (2.00), F (0.00).
   * Interactive course and semester management.

2. **CGPA Target Predictor:**
   * Calculates the exact average GPA required in remaining credits to achieve a student's graduation CGPA goal:
     $$\text{Required GPA} = \frac{T \times (C_d + C_n) - (\text{CGPA} \times C_d)}{C_n}$$
   * Feasibility detection (flags mathematically unreachable goals when required GPA exceeds 4.00) and recommends term-by-term target distributions.

3. **What-If Simulator:**
   * Allows students to simulate hypothetical courses, credits, and grades to see immediate projected CGPA impact with real-time delta badges before registration.

4. **Retake Course Planner:**
   * Scans completed courses with grades $\le 3.25$ (C, C+, B-, B).
   * Ranks candidates by maximum CGPA gain per credit:
     $$\text{CGPA Gain} = \frac{\text{Credit} \times (\text{New Point} - \text{Old Point})}{\text{Total Credits}}$$

5. **Final Examination Marks Calculator:**
   * Computes the exact score needed in the semester final exam based on continuous assessment marks earned to secure target grades.

6. **Safe-Bunk Calculator & Attendance Guardian:**
   * Calculates how many classes a student can safely miss while keeping attendance $\ge 75\%$ (UFTB requirement):
     $$\text{Safe Bunks} = \lfloor \frac{\text{Attended}}{0.75} - \text{Held} \rfloor$$
   * For debarred students, computes the exact number of consecutive classes required to restore eligibility.

7. **Smart Study Planner:**
   * Dynamically allocates study hours based on credit weight, student difficulty rating, and days left:
     $$\text{Priority Score} = \frac{\text{Credits} \times \text{Difficulty}}{\text{Days Left}}$$

8. **Pomodoro Focus Timer:**
   * Built-in 25-minute study intervals, audio chime alerts, task tagging, and focus session logging into MySQL database.

9. **PDF Export:**
   * Official academic audit sheet and semester grade report formatted with UFTB branding.

10. **Bilingual Support (Bangla & English):**
    * Complete instant toggle between English and বাংলা across every page.

11. **Dark & Light Themes:**
    * Modern glassmorphism UI designed for comfortable use day and night.

12. **Admin & Faculty Oversight Panel:**
    * Monitored students list, live CGPA calculation, department average performance, and attendance debarment alerts.
