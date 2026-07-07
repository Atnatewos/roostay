// scripts/test-all.js
// Complete API test suite for ROOSTAY
// Tests all major endpoints: health, auth, listings, bookings, payments

require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';
let ACCESS_TOKEN = '';
let LISTING_ID = '';
let BOOKING_ID = '';

function request(method, path, body = null, token = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const msg = status === 'PASS' ? detail : status === 'FAIL' ? detail : '';
  console.log(`  ${icon} ${test}${msg ? ' — ' + msg : ''}`);
}

async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ROOSTAY — Full API Test Suite');
  console.log('═══════════════════════════════════════════');
  console.log('');

  // ========================================
  // 1. HEALTH & PUBLIC ENDPOINTS
  // ========================================
  console.log('[1] HEALTH & PUBLIC ENDPOINTS');
  console.log('───────────────────────────────────────────');

  let res = await request('GET', '/api/health');
  log('Health Check', res.status === 200 ? 'PASS' : 'FAIL', res.body?.message);

  res = await request('GET', '/api/listings?limit=3');
  log('Public Listings', res.status === 200 ? 'PASS' : 'FAIL', `${res.body?.data?.length || 0} listings returned`);

  // ========================================
  // 2. AUTHENTICATION
  // ========================================
  console.log('');
  console.log('[2] AUTHENTICATION');
  console.log('───────────────────────────────────────────');

  // Register
  const testEmail = `test${Date.now()}@roostay.com`;
  res = await request('POST', '/api/auth/register', {
    email: testEmail,
    password: 'Roostay123!',
    firstName: 'Test',
    lastName: 'User',
  });
  if (res.status === 201 && res.body?.data?.tokens?.accessToken) {
    ACCESS_TOKEN = res.body.data.tokens.accessToken;
    log('Register', 'PASS', testEmail);
  } else if (res.body?.error?.details?.email) {
    log('Register', 'PASS', 'Email already exists (trying login)');
    res = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'Roostay123!',
    });
    if (res.status === 200 && res.body?.data?.tokens?.accessToken) {
      ACCESS_TOKEN = res.body.data.tokens.accessToken;
      log('Login fallback', 'PASS');
    } else {
      log('Login fallback', 'FAIL', res.body?.error?.message || 'Unknown error');
    }
  } else {
    log('Register', 'FAIL', res.body?.error?.message || res.body?.error?.details ? JSON.stringify(res.body.error.details) : 'Unknown');
  }

  // Get Me (authenticated)
  res = await request('GET', '/api/auth/me', null, ACCESS_TOKEN);
  log('Get Profile', res.status === 200 ? 'PASS' : 'FAIL', res.body?.data?.user?.email);

  // ========================================
  // 3. LISTINGS
  // ========================================
  console.log('');
  console.log('[3] LISTINGS');
  console.log('───────────────────────────────────────────');

  // Create listing
  res = await request('POST', '/api/listings', {
    title: 'Test Apartment Bole',
    description: 'A beautiful test apartment in the heart of Bole with amazing views.',
    listingType: 'short_term',
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    bedsCount: 2,
    pricePerNight: 3500,
    streetAddress: 'Bole Road, Near Edna Mall',
    city: 'Addis Ababa',
    amenities: [
      { name: 'WiFi', category: 'connectivity', iconName: 'wifi' },
      { name: 'Kitchen', category: 'facilities', iconName: 'kitchen' },
    ],
  }, ACCESS_TOKEN);
  if (res.status === 201 && res.body?.data?.listing?.id) {
    LISTING_ID = res.body.data.listing.id;
    log('Create Listing', 'PASS', LISTING_ID);
  } else if (res.status === 403) {
    log('Create Listing', 'SKIP', 'User is guest, not host. Skipping listing tests.');
  } else {
    log('Create Listing', 'FAIL', res.body?.error?.message || 'Unknown');
  }

  if (LISTING_ID) {
    res = await request('GET', `/api/listings/${LISTING_ID}`);
    log('Get Listing Detail', res.status === 200 ? 'PASS' : 'FAIL', res.body?.data?.listing?.title);

    res = await request('PUT', `/api/listings/${LISTING_ID}`, { title: 'Updated Test Apartment' }, ACCESS_TOKEN);
    log('Update Listing', res.status === 200 ? 'PASS' : 'FAIL');
  }

  // Search
  res = await request('GET', '/api/listings?city=Addis%20Ababa&limit=5');
  log('Search Listings', res.status === 200 ? 'PASS' : 'FAIL', `${res.body?.data?.length || 0} found`);

  // ========================================
  // 4. BOOKINGS
  // ========================================
  console.log('');
  console.log('[4] BOOKINGS');
  console.log('───────────────────────────────────────────');

  if (LISTING_ID) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const checkout = new Date(tomorrow);
    checkout.setDate(checkout.getDate() + 3);

    res = await request('POST', '/api/bookings', {
      listingId: LISTING_ID,
      checkInDate: tomorrow.toISOString().split('T')[0],
      checkOutDate: checkout.toISOString().split('T')[0],
      guestCount: 2,
      bookingType: 'short_term',
    }, ACCESS_TOKEN);
    if (res.status === 201) {
      BOOKING_ID = res.body?.data?.booking?.id;
      log('Create Booking', 'PASS', BOOKING_ID);
    } else if (res.status === 400 && res.body?.error?.message?.includes('own listing')) {
      log('Create Booking', 'SKIP', 'Cannot book own listing');
    } else {
      log('Create Booking', 'FAIL', res.body?.error?.message || 'Unknown');
    }
  } else {
    log('Create Booking', 'SKIP', 'No listing available');
  }

  if (BOOKING_ID) {
    res = await request('GET', `/api/bookings/${BOOKING_ID}`, null, ACCESS_TOKEN);
    log('Get Booking', res.status === 200 ? 'PASS' : 'FAIL');
  }

  // Guest bookings list
  res = await request('GET', '/api/bookings/guest', null, ACCESS_TOKEN);
  log('My Bookings', res.status === 200 ? 'PASS' : 'FAIL', `${res.body?.data?.length || 0} bookings`);

  // ========================================
  // 5. FAVORITES & REVIEWS
  // ========================================
  console.log('');
  console.log('[5] FAVORITES & REVIEWS');
  console.log('───────────────────────────────────────────');

  if (LISTING_ID) {
    res = await request('POST', `/api/favorites/${LISTING_ID}`, null, ACCESS_TOKEN);
    log('Toggle Favorite', res.status === 200 ? 'PASS' : 'FAIL', res.body?.data?.action);

    res = await request('GET', '/api/favorites', null, ACCESS_TOKEN);
    log('Get Favorites', res.status === 200 ? 'PASS' : 'FAIL', `${res.body?.data?.length || 0} favorites`);
  }

  res = await request('GET', '/api/notifications', null, ACCESS_TOKEN);
  log('Get Notifications', res.status === 200 ? 'PASS' : 'FAIL', `${res.body?.data?.notifications?.length || 0} notifications`);

  // ========================================
  // 6. PAYMENTS & WITHDRAWALS
  // ========================================
  console.log('');
  console.log('[6] PAYMENTS & WITHDRAWALS');
  console.log('───────────────────────────────────────────');

  if (BOOKING_ID) {
    res = await request('POST', '/api/payments', { bookingId: BOOKING_ID, paymentMethod: 'bank_transfer' }, ACCESS_TOKEN);
    if (res.status === 201) {
      log('Create Payment', 'PASS', res.body?.data?.payment?.id);
    } else {
      log('Create Payment', 'FAIL', res.body?.error?.message || 'Booking must be confirmed first');
    }
  } else {
    log('Create Payment', 'SKIP', 'No booking available');
  }

  res = await request('POST', '/api/withdrawals', {
    amount: 500,
    method: 'bank_transfer',
    bankName: 'CBE',
    accountNumber: '1000000000',
    accountHolder: 'Test Host',
  }, ACCESS_TOKEN);
  if (res.status === 201) {
    log('Request Withdrawal', 'PASS');
  } else {
    log('Request Withdrawal', 'FAIL', res.body?.error?.message || 'Insufficient balance (expected)');
  }

  // ========================================
  // 7. EDGE CASES
  // ========================================
  console.log('');
  console.log('[7] EDGE CASES');
  console.log('───────────────────────────────────────────');

  res = await request('GET', '/api/auth/me');
  log('Unauthenticated Request', res.status === 401 ? 'PASS' : 'FAIL', 'Returns 401 as expected');

  res = await request('GET', '/api/admin/dashboard', null, ACCESS_TOKEN);
  log('Admin Access (guest)', res.status === 403 ? 'PASS' : 'FAIL', 'Returns 403 as expected');

  res = await request('GET', '/api/nonexistent');
  log('404 Route', res.status === 404 ? 'PASS' : 'FAIL', 'Returns 404 as expected');

  res = await request('POST', '/api/auth/login', { email: 'fake@fake.com', password: 'wrong' });
  log('Invalid Login', res.status === 401 ? 'PASS' : 'FAIL', 'Returns 401 as expected');

  // ========================================
  // SUMMARY
  // ========================================
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  TEST SUITE COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('Base URL:', BASE_URL);
  console.log('Test Email:', testEmail);
  if (ACCESS_TOKEN) console.log('Token:', ACCESS_TOKEN.substring(0, 30) + '...');
  if (LISTING_ID) console.log('Listing ID:', LISTING_ID);
  if (BOOKING_ID) console.log('Booking ID:', BOOKING_ID);
  console.log('');
}

runTests().catch((err) => {
  console.error('');
  console.error('TEST SUITE ERROR:', err.message);
  console.error('Make sure Next.js is running: cd frontend && npx next dev -p 3000');
  process.exit(1);
});
