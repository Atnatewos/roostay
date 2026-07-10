-- packages/database/schema.sql
-- ============================================================================
-- ROOSTAY Complete Database Schema
-- ============================================================================
-- Ethiopian Home Rental Platform
-- Author: Theron (Atnatewos Getasew Sahlu)
-- Version: 3.0.0 
-- ============================================================================
--
-- DESIGN PRINCIPLES:
-- - All tables use IF NOT EXISTS for idempotent migrations
-- - UUIDs as primary keys for distributed-friendliness
-- - Timestamps with timezone for proper internationalization
-- - Parameterized constraints for data integrity
-- - Partial indexes for query optimization
-- - Includes payment expiry tracking for automated booking expiry
-- - Includes host application fields for guest-to-host upgrades
--
-- TABLE OVERVIEW (15 tables):
-- 1. users                    - User accounts (guest, host, admin)
-- 2. refresh_tokens           - JWT refresh token storage
-- 3. user_verifications       - ID verification & host applications
-- 4. listings                 - Property listings
-- 5. listing_images           - Property photos
-- 6. listing_amenities        - Property amenities
-- 7. listing_availability     - Date-level availability tracking
-- 8. bookings                 - Reservation records
-- 9. payments                 - Payment records with transaction tracking
-- 10. withdrawals             - Host payout requests
-- 11. reviews                 - Guest reviews with 5-category ratings
-- 12. favorites               - Saved listings (wishlist)
-- 13. notifications           - User notifications
-- 14. messages                - Guest-host messaging
-- 15. audit_logs              - Admin action audit trail
--
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Users table: stores all platform users (guests, hosts, admins)
-- Supports both email and phone authentication
-- Includes account lockout protection for brute-force prevention
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'guest'
        CHECK (role IN ('guest', 'host', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens: stores JWT refresh tokens for silent session renewal
-- Supports token revocation and device tracking
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User verifications: ID verification for trust & safety
-- Stores ID document images and verification status
-- Extended to support host applications with experience and motivation data
-- Guests submit applications here; admins review and approve/reject
-- When approved, the user's role is updated to 'host' in the users table
CREATE TABLE IF NOT EXISTS user_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    id_type VARCHAR(50) NOT NULL
        CHECK (id_type IN ('kebele_id', 'passport', 'drivers_license', 'national_id')),
    id_number VARCHAR(100) NOT NULL,
    id_front_image_url TEXT NOT NULL,
    id_back_image_url TEXT,
    selfie_image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    -- Host application fields (Phase 3 - Bucket 1)
    -- These fields capture the guest's intent to become a host
    hosting_experience VARCHAR(20)
        CHECK (hosting_experience IN ('yes', 'no')),
    property_count VARCHAR(20)
        CHECK (property_count IN ('1-2', '3-5', '5+')),
    motivation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LISTINGS
-- ============================================================================

-- Listings: property listings with full details and pricing
-- Supports short-term (per night), long-term (per month), or both
-- Includes location data, amenities, and approval workflow
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    listing_type VARCHAR(20) NOT NULL
        CHECK (listing_type IN ('short_term', 'long_term', 'both')),
    property_type VARCHAR(50) NOT NULL
        CHECK (property_type IN ('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment')),
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms INTEGER NOT NULL DEFAULT 1,
    max_guests INTEGER NOT NULL DEFAULT 1,
    beds_count INTEGER NOT NULL DEFAULT 1,
    price_per_night DECIMAL(10, 2),
    price_per_month DECIMAL(12, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    cleaning_fee DECIMAL(10, 2) DEFAULT 0,
    security_deposit DECIMAL(10, 2) DEFAULT 0,
    weekly_discount_percent INTEGER DEFAULT 0,
    monthly_discount_percent INTEGER DEFAULT 0,
    street_address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    subcity VARCHAR(100),
    wereda VARCHAR(50),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    nearby_landmarks TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    instant_book BOOLEAN NOT NULL DEFAULT false,
    min_nights INTEGER NOT NULL DEFAULT 1,
    max_nights INTEGER,
    check_in_time VARCHAR(5) DEFAULT '14:00',
    check_out_time VARCHAR(5) DEFAULT '11:00',
    house_rules TEXT,
    cancellation_policy VARCHAR(20) NOT NULL DEFAULT 'flexible'
        CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    approved_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listing images: property photos with sort order and primary flag
-- Supports Cloudinary URLs with optional thumbnails
CREATE TABLE IF NOT EXISTS listing_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listing amenities: property amenities with categorization
-- Unique constraint prevents duplicate amenities per listing
CREATE TABLE IF NOT EXISTS listing_amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    icon_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(listing_id, amenity_name)
);

-- Listing availability: date-level availability tracking
-- Status can be 'available', 'booked', or 'blocked'
-- Supports custom pricing for specific dates
CREATE TABLE IF NOT EXISTS listing_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'booked', 'blocked')),
    custom_price DECIMAL(10, 2),
    blocked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(listing_id, date)
);

-- ============================================================================
-- BOOKINGS
-- ============================================================================

-- Bookings: reservation records with full pricing breakdown
-- Includes payment_expires_at for automated expiry of unpaid bookings
-- Status transitions: pending → confirmed → completed
--                   pending → cancelled / rejected / expired
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    guest_id UUID NOT NULL REFERENCES users(id),
    host_id UUID NOT NULL REFERENCES users(id),
    booking_type VARCHAR(20) NOT NULL
        CHECK (booking_type IN ('short_term', 'long_term')),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired')),
    base_amount DECIMAL(12, 2) NOT NULL,
    cleaning_fee DECIMAL(10, 2) DEFAULT 0,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    security_deposit DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    special_requests TEXT,
    guest_message TEXT,
    payment_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

-- Payments: payment records with transaction tracking
-- Supports manual bank transfer and Telebirr payment methods
-- Status transitions:
--   pending → processing → completed (verified by admin)
--   pending → processing → failed (rejected by admin)
--   pending → processing → pending_review (flagged for manual review)
--   pending → cancelled (booking expired or cancelled)
-- Includes transaction_reference for duplicate prevention
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    payment_method VARCHAR(30) NOT NULL
        CHECK (payment_method IN ('bank_transfer', 'telebirr', 'cash', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'pending_review')),
    transaction_reference VARCHAR(255),
    proof_image_url TEXT,
    proof_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    refund_amount DECIMAL(12, 2),
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WITHDRAWALS (Host Payouts)
-- ============================================================================

-- Withdrawals: host payout requests with bank/Telebirr details
-- Status transitions: pending → processing → completed / failed / cancelled
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(12, 2) NOT NULL,
    fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer'
        CHECK (method IN ('bank_transfer', 'telebirr')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    account_holder VARCHAR(255),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    transaction_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- REVIEWS
-- ============================================================================

-- Reviews: guest reviews with 5-category rating system
-- Automatically calculates overall rating via trigger
-- Supports host responses
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
    listing_id UUID NOT NULL REFERENCES listings(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating_cleanliness INTEGER NOT NULL CHECK (rating_cleanliness BETWEEN 1 AND 5),
    rating_accuracy INTEGER NOT NULL CHECK (rating_accuracy BETWEEN 1 AND 5),
    rating_communication INTEGER NOT NULL CHECK (rating_communication BETWEEN 1 AND 5),
    rating_location INTEGER NOT NULL CHECK (rating_location BETWEEN 1 AND 5),
    rating_value INTEGER NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
    rating_overall DECIMAL(3, 2) NOT NULL,
    review_text TEXT,
    host_response TEXT,
    host_response_at TIMESTAMPTZ,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FAVORITES
-- ============================================================================

-- Favorites: saved listings (wishlist)
-- Unique constraint prevents duplicate favorites per user
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notifications: user notifications with read status tracking
-- Supports various notification types (booking, payment, system)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MESSAGES
-- ============================================================================

-- Messages: guest-host messaging system
-- Supports booking-specific conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    message_text TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ADMIN AUDIT LOG
-- ============================================================================

-- Audit logs: admin action audit trail
-- Records all admin actions with old/new values for accountability
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_host ON listings(host_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price_night ON listings(price_per_night);
CREATE INDEX IF NOT EXISTS idx_listings_price_month ON listings(price_per_month);
CREATE INDEX IF NOT EXISTS idx_listings_active_approved ON listings(is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(latitude, longitude);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Partial index for efficient automated expiry queries
-- Only indexes pending bookings that have an expiry time set
-- Dramatically reduces index size and improves query performance
CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires 
    ON bookings(payment_expires_at) 
    WHERE status = 'pending' AND payment_expires_at IS NOT NULL;

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Partial index for fast transaction reference uniqueness checks
-- Only indexes rows where a transaction reference actually exists
-- Enables O(1) duplicate transaction detection
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_reference) 
    WHERE transaction_reference IS NOT NULL;

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites(listing_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Withdrawals indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- User verifications indexes (Phase 3 - Bucket 1)
-- Partial index for efficient admin review queries
-- Only indexes pending applications to speed up the admin dashboard
CREATE INDEX IF NOT EXISTS idx_user_verifications_status 
    ON user_verifications(status) 
    WHERE status = 'pending';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
-- Applied to all tables with an updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
            CREATE TRIGGER trg_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ language 'plpgsql';

-- Function to calculate overall rating from 5 category ratings
-- Automatically computes the average and rounds to 2 decimal places
CREATE OR REPLACE FUNCTION calculate_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
    NEW.rating_overall = ROUND(
        (NEW.rating_cleanliness + NEW.rating_accuracy + NEW.rating_communication +
         NEW.rating_location + NEW.rating_value) / 5.0,
        2
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply overall rating calculation trigger to reviews table
DROP TRIGGER IF EXISTS trg_reviews_overall ON reviews;
CREATE TRIGGER trg_reviews_overall
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION calculate_overall_rating();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================