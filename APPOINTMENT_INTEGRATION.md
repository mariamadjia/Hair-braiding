# Appointment Booking System Integration

This document explains how the frontend (Next.js) connects to the backend (Java Spring Boot) for the appointment booking system.

## Architecture Overview

```
Customer → Next.js Frontend → Next.js API Routes → Java Spring Boot Backend → PostgreSQL
                                                           ↓
Admin → Next.js Admin Panel → Next.js API Routes → Java Spring Boot Backend
```

## Setup Instructions

### 1. Backend Setup (Java Spring Boot)

The backend is located at: `/Users/gloriadjonret/Desktop/Backend-Braiding`

**Start the backend:**
```bash
cd /Users/gloriadjonret/Desktop/Backend-Braiding
./mvnw spring-boot:run
```

The backend will run on `http://localhost:8080`

### 2. Frontend Setup (Next.js)

The frontend is located at: `/Users/gloriadjonret/Documents/Mariam's website/braiding-shop`

**Install dependencies (if needed):**
```bash
cd "/Users/gloriadjonret/Documents/Mariam's website/braiding-shop"
npm install
```

**Create/Update `.env.local` file:**
```bash
# Add this line to your .env.local file
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

**Start the frontend:**
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features Implemented

### Customer Features

1. **Book Appointment** (`/booking` or `/book-now`)
   - Select date from calendar
   - Choose available time slot
   - Enter personal information:
     - First Name
     - Last Name
     - Email
     - Phone Number
     - Additional Notes (optional)
   - Submit booking request

### Admin Features

1. **View Appointments** (`/admin/appointments`)
   - Filter by status: ALL, PENDING, APPROVED, DENIED
   - View customer details
   - See appointment date/time
   - Read customer notes

2. **Approve Appointments**
   - Click "Approve" button
   - Add optional approval notes
   - Customer receives APPROVED status

3. **Deny Appointments**
   - Click "Deny" button
   - Add required denial reason
   - Customer receives DENIED status

## API Endpoints

### Frontend API Routes (Next.js)

#### Create Appointment
```
POST /api/bookings
```
**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "appointmentDateTime": "2026-05-15T14:30:00",
  "serviceId": 1,
  "notes": "Optional notes"
}
```

#### Get Appointments
```
GET /api/bookings?status=PENDING
```

#### Approve Appointment
```
PUT /api/appointments/{id}/approve
```
**Request Body:**
```json
{
  "adminNotes": "Confirmed for 2:30 PM"
}
```

#### Deny Appointment
```
PUT /api/appointments/{id}/deny
```
**Request Body:**
```json
{
  "adminNotes": "Time slot no longer available"
}
```

### Backend API Endpoints (Java Spring Boot)

All backend endpoints are documented in:
`/Users/gloriadjonret/Desktop/Backend-Braiding/APPOINTMENT_BOOKING_API.md`

**Base URL:** `http://localhost:8080/api/appointments`

## Database Schema

### Tables Created

1. **customers**
   - id (Primary Key)
   - first_name
   - last_name
   - email (unique)
   - phone_number
   - created_at
   - updated_at

2. **appointments**
   - id (Primary Key)
   - customer_id (Foreign Key → customers)
   - service_id (Foreign Key → service_items, optional)
   - appointment_date_time
   - status (PENDING, APPROVED, DENIED, CANCELLED, COMPLETED)
   - notes (customer notes)
   - admin_notes
   - approved_by (Foreign Key → admin)
   - approved_at
   - created_at
   - updated_at

## File Structure

### Frontend Files

```
braiding-shop/
├── app/
│   ├── api/
│   │   ├── bookings/
│   │   │   └── route.ts                    # Main booking API
│   │   └── appointments/
│   │       └── [id]/
│   │           ├── approve/
│   │           │   └── route.ts            # Approve endpoint
│   │           └── deny/
│   │               └── route.ts            # Deny endpoint
│   ├── admin/
│   │   └── appointments/
│   │       └── page.tsx                    # Admin appointments page
│   └── booking/
│       └── BookingPageClient.tsx           # Customer booking page
├── components/
│   ├── BookingCalendar.tsx                 # Booking calendar component
│   └── AppointmentManagement.tsx           # Admin management component
└── .env.local                              # Environment variables
```

### Backend Files

```
Backend-Braiding/
└── src/main/java/org/example/backendbraiding/
    ├── model/
    │   ├── Customer.java
    │   └── Appointment.java
    ├── dto/
    │   ├── AppointmentRequestDTO.java
    │   ├── AppointmentResponseDTO.java
    │   └── AppointmentActionDTO.java
    ├── repository/
    │   ├── CustomerRepository.java
    │   └── AppointmentRepository.java
    ├── service/
    │   └── AppointmentService.java
    └── controller/
        └── AppointmentController.java
```

## Testing the Integration

### 1. Test Customer Booking

1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000/booking`
3. Select a date and time
4. Fill in customer information
5. Submit the booking
6. Check backend console for confirmation

### 2. Test Admin Approval

1. Navigate to `http://localhost:3000/admin/appointments`
2. You should see the pending appointment
3. Click "Approve" or "Deny"
4. Add notes
5. Verify status changes

### 3. Verify Database

Check PostgreSQL database to see the created records:

```sql
-- View all appointments
SELECT * FROM appointments;

-- View all customers
SELECT * FROM customers;

-- View pending appointments with customer details
SELECT a.*, c.first_name, c.last_name, c.email 
FROM appointments a 
JOIN customers c ON a.customer_id = c.id 
WHERE a.status = 'PENDING';
```

## Troubleshooting

### Backend Not Connecting

**Error:** `Failed to create appointment`

**Solution:**
1. Verify backend is running: `curl http://localhost:8080/api/appointments`
2. Check `.env.local` has correct `NEXT_PUBLIC_BACKEND_URL`
3. Check backend console for errors

### CORS Issues

If you see CORS errors, ensure the backend has CORS configuration:

```java
// In SecurityConfig or WebConfig
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.addAllowedOrigin("http://localhost:3000");
    configuration.addAllowedMethod("*");
    configuration.addAllowedHeader("*");
    // ... rest of config
}
```

### Database Connection Issues

**Error:** `Connection refused` or `Database not found`

**Solution:**
1. Verify PostgreSQL is running
2. Check `application.properties` database credentials
3. Ensure database exists: `createdb braiding_db`

## Next Steps & Enhancements

1. **Email Notifications**
   - Send confirmation email when appointment is created
   - Send approval/denial notifications to customers

2. **SMS Notifications**
   - Integrate Twilio for SMS reminders

3. **Calendar Sync**
   - Export approved appointments to Google Calendar

4. **Availability Management**
   - Admin interface to block time slots
   - Set business hours

5. **Payment Integration**
   - Require deposit for bookings
   - Integrate Stripe payment

6. **Customer Portal**
   - Allow customers to view their appointments
   - Enable appointment cancellation

## Support

For issues or questions:
- Backend API Documentation: `Backend-Braiding/APPOINTMENT_BOOKING_API.md`
- Frontend Components: Check component files for inline documentation
