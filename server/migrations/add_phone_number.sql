-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Adds a phone_number column to the patients table and updates Anita's number.

-- Step 1: Add the phone_number column (text, nullable)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Step 2: Update Anita's phone number
UPDATE patients
SET phone_number = '+917982404800'
WHERE name ILIKE '%Anita%';

-- Verify the update
SELECT id, name, phone_number FROM patients WHERE name ILIKE '%Anita%';
