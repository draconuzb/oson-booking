-- OsonBooking Seed Data

-- Default admin user (password: admin123 — change in production!)
INSERT INTO admins (username, password_hash, full_name) VALUES
('admin', '$2a$10$OKigsxmQlKK/uxVxJNyS9esy8iEqrt2rByE9Pv./svw3Vyj9CjfYe', 'Admin');

-- Sample locations
INSERT INTO locations (name_uz, name_ru, name_kz, name_uz_cyrl) VALUES
('Yuqori Chirchiq', 'Верхний Чирчик', 'Жоғарғы Шыршық', 'Юқори Чирчиқ');

-- Sample shops
INSERT INTO shops (location_id, name_uz, name_ru, name_kz, name_uz_cyrl, address, phone) VALUES
((SELECT id FROM locations WHERE name_uz = 'Yuqori Chirchiq'),
 'Premium Barbershop', 'Премиум Барбершоп', 'Премиум Барбершоп', 'Премиум Барбершоп',
 'Yuqori Chirchiq, Markaziy ko''cha 15', '+998 90 123 45 67');
