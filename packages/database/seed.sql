-- packages/database/seed.sql
-- Development seed data for ROOSTAY
-- Creates test users, listings, and other sample data
-- All passwords are "Password123!" hashed with bcrypt

-- ============================================================================
-- SEED USERS
-- Passwords: "Password123!" (bcrypt hash for development only)
-- ============================================================================

-- Admin user
INSERT INTO users (id, email, first_name, last_name, role, is_verified, is_active, password_hash)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@roostay.com',
    'Admin',
    'User',
    'admin',
    true,
    true,
    '$2b$12$LJ3m4ys3Lk0TSwHCpNqrUOZGVRWBxj5gGWHMQJBHFf0KJBX9H4gHy'
) ON CONFLICT (email) DO NOTHING;

-- Host user
INSERT INTO users (id, email, first_name, last_name, role, is_verified, is_active, password_hash)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'host@roostay.com',
    'Abebe',
    'Kebede',
    'host',
    true,
    true,
    '$2b$12$LJ3m4ys3Lk0TSwHCpNqrUOZGVRWBxj5gGWHMQJBHFf0KJBX9H4gHy'
) ON CONFLICT (email) DO NOTHING;

-- Guest user
INSERT INTO users (id, email, first_name, last_name, role, is_verified, is_active, password_hash)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'guest@roostay.com',
    'Tigist',
    'Alemu',
    'guest',
    true,
    true,
    '$2b$12$LJ3m4ys3Lk0TSwHCpNqrUOZGVRWBxj5gGWHMQJBHFf0KJBX9H4gHy'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SEED LISTINGS
-- ============================================================================

INSERT INTO listings (
    id, host_id, title, description, listing_type, property_type,
    bedrooms, bathrooms, max_guests, beds_count,
    price_per_night, price_per_month,
    cleaning_fee, security_deposit,
    weekly_discount_percent, monthly_discount_percent,
    street_address, city, subcity, wereda,
    latitude, longitude,
    is_active, is_approved, instant_book,
    min_nights, max_nights,
    check_in_time, check_out_time,
    house_rules, cancellation_policy,
    approval_status
) VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Modern Apartment in Bole with City View',
    'Beautiful 2-bedroom apartment in the heart of Bole. Walking distance to Edna Mall, restaurants, and cafes. Fully furnished with modern amenities including high-speed WiFi, fully equipped kitchen, and 24/7 security.',
    'both',
    'apartment',
    2, 1, 4, 2,
    4500.00, 85000.00,
    500.00, 5000.00,
    10, 20,
    'Bole Road, near Edna Mall', 'Addis Ababa', 'Bole', 'Wereda 03',
    9.005401, 38.793463,
    true, true, false,
    1, 30,
    '14:00', '11:00',
    'No smoking indoors. Quiet hours after 10 PM. No parties or events.',
    'moderate',
    'approved'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Cozy Studio in Sarbet - Perfect for Long Stays',
    'A cozy and well-maintained studio apartment in the quiet neighborhood of Sarbet. Close to supermarkets, pharmacies, and public transport. Ideal for professionals and students looking for long-term accommodation.',
    'long_term',
    'apartment',
    0, 1, 2, 1,
    NULL, 25000.00,
    0, 2500.00,
    0, 15,
    'Sarbet, behind St. Maryam Church', 'Addis Ababa', 'Kirkos', 'Wereda 08',
    9.010793, 38.761263,
    true, true, false,
    30, 365,
    '12:00', '10:00',
    'Respect neighbors. Maintain cleanliness. Monthly inspection allowed with 24-hour notice.',
    'strict',
    'approved'
),
(
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Luxury Villa in CMC - Pool & Garden',
    'Stunning 4-bedroom villa with private pool and garden in CMC area. Perfect for families or groups. Modern architecture with traditional Ethiopian touches. Full staff available on request.',
    'short_term',
    'villa',
    4, 3, 8, 5,
    15000.00, NULL,
    2000.00, 15000.00,
    5, 0,
    'CMC, near Sunshine Real Estate', 'Addis Ababa', 'Yeka', 'Wereda 11',
    9.032000, 38.829000,
    true, true, true,
    2, 14,
    '15:00', '12:00',
    'Pool rules apply. Garden parties allowed until 11 PM with prior notice. Pet-friendly with deposit.',
    'flexible',
    'approved'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED AMENITIES
-- ============================================================================

INSERT INTO listing_amenities (listing_id, amenity_name, category, icon_name) VALUES
('d0000000-0000-0000-0000-000000000001', 'WiFi', 'connectivity', 'wifi'),
('d0000000-0000-0000-0000-000000000001', 'Kitchen', 'facilities', 'kitchen'),
('d0000000-0000-0000-0000-000000000001', 'TV', 'entertainment', 'tv'),
('d0000000-0000-0000-0000-000000000001', 'Air Conditioning', 'comfort', 'ac'),
('d0000000-0000-0000-0000-000000000001', 'Security', 'safety', 'shield'),
('d0000000-0000-0000-0000-000000000001', 'Parking', 'facilities', 'car'),
('d0000000-0000-0000-0000-000000000002', 'WiFi', 'connectivity', 'wifi'),
('d0000000-0000-0000-0000-000000000002', 'Kitchen', 'facilities', 'kitchen'),
('d0000000-0000-0000-0000-000000000002', 'Laundry', 'facilities', 'washing-machine'),
('d0000000-0000-0000-0000-000000000003', 'Pool', 'luxury', 'pool'),
('d0000000-0000-0000-0000-000000000003', 'Garden', 'outdoor', 'tree'),
('d0000000-0000-0000-0000-000000000003', 'WiFi', 'connectivity', 'wifi'),
('d0000000-0000-0000-0000-000000000003', 'Kitchen', 'facilities', 'kitchen'),
('d0000000-0000-0000-0000-000000000003', 'Air Conditioning', 'comfort', 'ac'),
('d0000000-0000-0000-0000-000000000003', 'Security', 'safety', 'shield')
ON CONFLICT (listing_id, amenity_name) DO NOTHING;