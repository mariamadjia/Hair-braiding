# API Standardization Guide

## ✅ What's Been Done

### 1. Console.log Statements - FIXED
Wrapped all console statements in `lib/api/client.ts` with development checks:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('API Request:', url);
}
```

**Impact:** Console logs only appear in development, not production.

---

### 2. Created Centralized API Modules

New API service modules created in `/lib/api/`:

#### **`appointments.ts`** ✅
```typescript
import { appointmentsApi } from '@/lib/api';

// Get settings
const settings = await appointmentsApi.getSettings();

// Update settings
await appointmentsApi.updateSettings(newSettings);

// Get appointments
const appointments = await appointmentsApi.getAll();
const pending = await appointmentsApi.getByStatus('PENDING');

// Create appointment
await appointmentsApi.create(appointmentData);

// Approve/Deny
await appointmentsApi.approve(id, notes);
await appointmentsApi.deny(id, reason);
```

#### **`availability.ts`** ✅
```typescript
import { availabilityApi } from '@/lib/api';

// Business hours
const hours = await availabilityApi.getBusinessHours();
await availabilityApi.saveBusinessHours(hoursData);

// Time slots
const slots = await availabilityApi.getTimeSlots('MONDAY');
await availabilityApi.saveTimeSlots('MONDAY', slotsData);

// Available slots
const available = await availabilityApi.getAvailableSlots('2026-05-20');

// Blocked times
const blocked = await availabilityApi.getBlockedTimes();
await availabilityApi.saveBlockedTime(blockedData);
await availabilityApi.deleteBlockedTime(id);
```

#### **`customers.ts`** ✅
```typescript
import { customersApi } from '@/lib/api';

// Get all customers
const customers = await customersApi.getAll();

// Get customer details
const customer = await customersApi.getById(123);

// Search
const results = await customersApi.search('john');
```

#### **`index.ts`** ✅
Centralized export file - import everything from one place:
```typescript
import { 
  authApi, 
  appointmentsApi, 
  availabilityApi, 
  customersApi, 
  galleryApi 
} from '@/lib/api';
```

---

## 📋 Migration Guide

### Before (3 Different Patterns):

**Pattern 1: Direct fetch**
```typescript
const response = await fetch(`${API_BASE_URL}/api/appointments/settings`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

**Pattern 2: Using apiClient**
```typescript
const data = await apiClient<Settings>('/api/appointments/settings');
```

**Pattern 3: Using specific API**
```typescript
const data = await authApi.login({ email, password });
```

### After (Standardized):

**✅ Use API modules everywhere:**
```typescript
import { appointmentsApi } from '@/lib/api';

const settings = await appointmentsApi.getSettings();
```

---

## 🔄 How to Migrate Components

### Example: AppointmentSettingsTab.tsx

**Before:**
```typescript
const fetchSettings = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/appointments/settings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  setSettings(data);
};
```

**After:**
```typescript
import { appointmentsApi, availabilityApi } from '@/lib/api';

const fetchSettings = async () => {
  try {
    const settings = await appointmentsApi.getSettings();
    setSettings(settings);
    
    const hours = await availabilityApi.getBusinessHours();
    setBusinessHours(hours);
  } catch (error) {
    // Error handling is built into apiClient
    setError('Failed to load settings');
  }
};
```

---

## 📊 Benefits

### 1. **Type Safety**
All API calls now have proper TypeScript interfaces:
```typescript
// Before: any
const data = await response.json();

// After: typed
const settings: AppointmentSettings = await appointmentsApi.getSettings();
```

### 2. **Consistent Error Handling**
All errors go through `ApiError` class with status codes.

### 3. **No More Token Management**
`apiClient` automatically adds auth tokens - no manual handling needed.

### 4. **Single Source of Truth**
Change an endpoint in one place, updates everywhere.

### 5. **Easier Testing**
Mock API modules instead of fetch calls.

### 6. **Better Developer Experience**
Autocomplete for all API methods and their parameters.

---

## 🎯 Next Steps

### High Priority:
1. ✅ Migrate `AppointmentManagement.tsx` to use `appointmentsApi`
2. ✅ Migrate `AppointmentSettingsTab.tsx` to use `appointmentsApi` + `availabilityApi`
3. ✅ Migrate `AvailabilitySchedule.tsx` to use `availabilityApi`
4. ✅ Migrate `CustomerTable.tsx` to use `customersApi`
5. ✅ Migrate `CustomerDetails.tsx` to use `customersApi`

### Medium Priority:
6. Migrate `BookingCalendar.tsx` to use `appointmentsApi` + `availabilityApi`
7. Migrate `BlockTimeModal.tsx` to use `availabilityApi`
8. Migrate admin components to use appropriate APIs

### Low Priority:
9. Remove remaining console.log statements in other files
10. Add request/response logging service
11. Add retry logic for failed requests
12. Add request caching

---

## 📝 Quick Reference

### Import Statement:
```typescript
import { 
  authApi,           // Authentication
  appointmentsApi,   // Appointments & settings
  availabilityApi,   // Business hours, slots, blocked times
  customersApi,      // Customer management
  galleryApi,        // Gallery images
  categoriesApi      // Service categories
} from '@/lib/api';
```

### Common Operations:

```typescript
// Login
await authApi.login({ email, password });

// Get appointments
const all = await appointmentsApi.getAll();
const pending = await appointmentsApi.getByStatus('PENDING');

// Manage availability
const hours = await availabilityApi.getBusinessHours();
await availabilityApi.saveBusinessHours(data);

// Customer management
const customers = await customersApi.getAll();
const customer = await customersApi.getById(123);
```

---

## 🚀 Production Ready

All API modules are:
- ✅ Type-safe with TypeScript
- ✅ Centralized error handling
- ✅ Automatic authentication
- ✅ Development-only logging
- ✅ Consistent patterns
- ✅ Well-documented

**Ready to use in production!**
