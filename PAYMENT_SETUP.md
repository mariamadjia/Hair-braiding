# Payment Integration Setup Guide

## ✅ What Was Implemented

Your booking system now has a complete Stripe payment integration with **4-step checkout**:

1. **Select Date** → Customer picks appointment date
2. **Select Time** → Customer picks time slot
3. **Your Details** → Customer enters contact info
4. **Payment** → Customer authorizes $50 deposit (NEW!)

## 🚀 Setup Instructions

### Step 1: Install Dependencies

Run this command in your project directory:

```bash
npm install
```

This will install:
- `@stripe/stripe-js` - Stripe JavaScript SDK
- `@stripe/react-stripe-js` - Stripe React components

### Step 2: Add Stripe Publishable Key

You already created `.env.local`. Make sure it contains:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**Get your key from:** [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)

### Step 3: Update Backend Configuration

In your backend at `/Users/gloriadjonret/Desktop/Backend-Braiding/src/main/resources/application.properties`:

```properties
stripe.api.key=sk_test_YOUR_SECRET_KEY_HERE
stripe.public.key=pk_test_YOUR_PUBLISHABLE_KEY_HERE
stripe.webhook.secret=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Step 4: Start Your Servers

**Backend (Spring Boot):**
```bash
cd /Users/gloriadjonret/Desktop/Backend-Braiding
./mvnw spring-boot:run
```

**Frontend (Next.js):**
```bash
cd "/Users/gloriadjonret/Documents/Mariam's website/braiding-shop"
npm run dev
```

## 📋 How It Works

### Customer Experience

1. Customer fills out booking form (date, time, contact info)
2. Clicks "Confirm Booking" → Appointment created in database
3. **NEW:** Payment form appears with Stripe card input
4. Customer enters card details (or uses Apple Pay/Google Pay)
5. Clicks "Authorize $50" → Card is authorized (funds held, NOT charged)
6. Success message: "Card authorized, awaiting admin approval"

### Admin Experience

**When Admin Approves:**
- Payment automatically captured
- Customer charged $50
- SMS notification sent

**When Admin Denies:**
- Payment automatically cancelled
- Funds released back to customer
- SMS notification sent

## 🎨 UI Components Created

### 1. `lib/stripe.ts`
Stripe initialization utility

### 2. `components/PaymentForm.tsx`
Complete payment form with:
- Stripe Payment Element (handles cards, Apple Pay, Google Pay)
- Authorization notice
- Error handling
- Loading states
- Security badges

### 3. `components/BookingCalendar.tsx` (Updated)
Added Step 4 (Payment) to existing booking flow

## 🧪 Testing

### Test Cards

Use these in **test mode** (keys starting with `pk_test_` and `sk_test_`):

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0002` | Card declined |

**Any future expiry date, any 3-digit CVC, any ZIP code**

### Test Flow

1. Go to checkout page
2. Select date, time, enter details
3. Enter test card: `4242 4242 4242 4242`
4. Expiry: `12/28`, CVC: `123`
5. Click "Authorize $50"
6. Check Stripe Dashboard → Payments (should show "Uncaptured")
7. In admin panel, approve appointment
8. Check Stripe Dashboard → Payment should now be "Succeeded"

## 🔍 Verify Integration

### Check Frontend
```bash
# Make sure no TypeScript errors
npm run build
```

### Check Backend
```bash
# Test payment endpoint
curl -X POST http://localhost:8080/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "usd",
    "paymentMethodId": "pm_card_visa",
    "customerEmail": "test@example.com",
    "customerName": "Test User"
  }'
```

## 📱 Payment Methods Supported

- ✅ **Credit/Debit Cards** (Visa, Mastercard, Amex, Discover)
- ✅ **Apple Pay** (automatic on Safari/iOS)
- ✅ **Google Pay** (automatic on Chrome/Android)

## ⚠️ Important Notes

### Security
- ✅ Card data never touches your server
- ✅ All handled by Stripe (PCI-compliant)
- ✅ Only store: last 4 digits, brand, payment intent ID

### Authorization Hold
- **Duration:** ~7 days
- **Action Required:** Admin must approve/deny within 7 days
- **After 7 days:** Funds automatically released

### Amount
- **Fixed at $50** (5000 cents)
- To change: Update `amount: 5000` in `BookingCalendar.tsx` line 664 and 680

## 🐛 Troubleshooting

### "Cannot find module @stripe/stripe-js"
**Solution:** Run `npm install`

### "Stripe publishable key is not set"
**Solution:** Check `.env.local` has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Payment form doesn't appear
**Solution:** 
1. Check browser console for errors
2. Verify Stripe key is valid
3. Make sure backend is running on port 8080

### Backend returns 401 Unauthorized
**Solution:** Payment endpoints are public - check `SecurityConfig.java` lines 40-42

### Card authorization fails
**Solution:**
1. Check Stripe Dashboard logs
2. Verify secret key in backend `application.properties`
3. Try test card `4242 4242 4242 4242`

## 📚 Documentation

- **Backend API:** See `/Users/gloriadjonret/Desktop/Backend-Braiding/STRIPE_PAYMENT_INTEGRATION.md`
- **Stripe Docs:** https://stripe.com/docs
- **Test Cards:** https://stripe.com/docs/testing

## 🎯 Next Steps

1. ✅ Run `npm install`
2. ✅ Add Stripe keys to `.env.local`
3. ✅ Test the booking flow
4. ✅ Test admin approval (payment capture)
5. ✅ Test admin denial (payment cancel)
6. 🔄 Set up webhooks (optional but recommended)
7. 🚀 Go live with production keys

---

## Summary

Your booking system now has a professional payment flow:
- Customer enters card → Authorized but NOT charged
- Admin approves → Payment captured automatically
- Admin denies → Payment cancelled automatically

All while maintaining your beautiful UI design! 🎨
