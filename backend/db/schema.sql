-- OsonBooking Database Schema
-- M8 fix: Wrap in transaction for atomicity

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (both clients and barbers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('client', 'barber')),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    language VARCHAR(10) NOT NULL DEFAULT 'uz' CHECK (language IN ('uz', 'ru', 'kz', 'uz_cyrl')),
    status VARCHAR(15) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations (cities/districts)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255),
    name_kz VARCHAR(255),
    name_uz_cyrl VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershops
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255),
    name_kz VARCHAR(255),
    name_uz_cyrl VARCHAR(255),
    address VARCHAR(500),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbers (linked to a user and a shop)
CREATE TABLE barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255),
    name_kz VARCHAR(255),
    name_uz_cyrl VARCHAR(255),
    bio_uz TEXT,
    bio_ru TEXT,
    bio_kz TEXT,
    bio_uz_cyrl TEXT,
    photo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Services (each barber defines their own)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255),
    name_kz VARCHAR(255),
    name_uz_cyrl VARCHAR(255),
    price INTEGER NOT NULL CHECK (price >= 0),
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking services (many-to-many: one booking can have multiple services)
CREATE TABLE booking_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price INTEGER NOT NULL CHECK (price >= 0),
    UNIQUE(booking_id, service_id)
);

-- Admin users (for web panel)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_shops_location_id ON shops(location_id);
CREATE INDEX idx_barbers_shop_id ON barbers(shop_id);
CREATE INDEX idx_barbers_user_id ON barbers(user_id);
CREATE INDEX idx_services_barber_id ON services(barber_id);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_booking_services_booking_id ON booking_services(booking_id);

COMMIT;
