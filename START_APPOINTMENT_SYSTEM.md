# Quick Start Guide - Appointment Booking System

## Prerequisites
- Java 17+ installed
- Node.js 18+ installed
- PostgreSQL running
- Maven installed

## Step-by-Step Startup

### Terminal 1: Start Backend (Java Spring Boot)

```bash
# Navigate to backend directory
cd /Users/gloriadjonret/Desktop/Backend-Braiding

# Start the Spring Boot application
./mvnw spring-boot:run
```

**Expected Output:**
```
Started BackendBraidingApplication in X.XXX seconds
```

Backend will be available at: `http://localhost:8080`

---

### Terminal 2: Start Frontend (Next.js)

```bash
# Navigate to frontend directory
cd "/Users/gloriadjonret/Documents/Mariam's website/braiding-shop"

# Make sure .env.local exists with:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Start the development server
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.5.6
- Local:        http://localhost:3000
```

Frontend will be available at: `http://localhost:3000`

---

## Quick Test

### Test Customer Booking Flow

1. **Open browser:** `http://localhost:3000/booking`
2. **Select a date** from the calendar
3. **Choose a time slot**
4. **Fill in the form:**
   - First Name: Test
   - Last Name: Customer
   - Email: test@example.com
   - Phone: +1234567890
   - Notes: This is a test booking
5. **Click "Confirm Booking"**
6. **You should see:** Success message

### Test Admin Approval Flow

1. **Open browser:** `http://localhost:3000/admin/appointments`
2. **You should see:** The test booking in PENDING status
3. **Click "Approve"** button
4. **Add notes:** "Confirmed - see you soon!"
5. **Click OK**
6. **Status changes to:** APPROVED

---

## Verify Everything is Working

### Check Backend API Directly

```bash
# Get all appointments
curl http://localhost:8080/api/appointments

# Get pending appointments
curl http://localhost:8080/api/appointments/pending
```

### Check Database (PostgreSQL)

```bash
# Connect to database
psql -U your_username -d braiding_db

# View appointments
SELECT * FROM appointments;

# View customers
SELECT * FROM customers;
```

---

## Common Issues & Solutions

### Issue: Backend won't start

**Error:** `Port 8080 is already in use`

**Solution:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change port in application.properties:
# server.port=8081
```

---

### Issue: Frontend can't connect to backend

**Error:** `Failed to create appointment`

**Solution:**
1. Check backend is running: `curl http://localhost:8080/api/appointments`
2. Verify `.env.local` file exists with `NEXT_PUBLIC_BACKEND_URL=http://localhost:8080`
3. Restart frontend: `npm run dev`

---

### Issue: Database connection error

**Error:** `Connection to localhost:5432 refused`

**Solution:**
```bash
# Start PostgreSQL
brew services start postgresql@14
# or
sudo systemctl start postgresql

# Create database if it doesn't exist
createdb braiding_db
```

---

## Environment Variables

### Backend (`application.properties`)
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/braiding_db
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

---

## URLs Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main website |
| Customer Booking | http://localhost:3000/booking | Booking page |
| Admin Panel | http://localhost:3000/admin/appointments | Manage appointments |
| Backend API | http://localhost:8080 | REST API |
| API Docs | http://localhost:8080/api/appointments | Appointments endpoint |

---

## Stop Services

### Stop Backend
Press `Ctrl + C` in Terminal 1

### Stop Frontend
Press `Ctrl + C` in Terminal 2

---

## Need Help?

- **Full Documentation:** `APPOINTMENT_INTEGRATION.md`
- **Backend API Docs:** `/Users/gloriadjonret/Desktop/Backend-Braiding/APPOINTMENT_BOOKING_API.md`
- **Check Logs:** Look at terminal output for error messages
