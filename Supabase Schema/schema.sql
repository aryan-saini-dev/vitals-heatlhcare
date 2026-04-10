-- 1
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PATIENTS TABLE
create table if not exists patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  docuuid uuid not null, -- Links to auth.users.id
  name text not null,
  date_of_birth date, 
  contact_number text, -- Maps to contactNumber
  condition text,
  assigned_agent text, -- Name of the agent
  assigned_agent_id uuid, -- Foreign Key to agents.id
  email text,
  address text,
  medical_history text[] default '{}',
  current_medications text[] default '{}',
  recent_appointments jsonb default '[]',
  upcoming_appointments jsonb default '[]',
  status text check (status in ('stable', 'critical', 'improving', 'Stable', 'Needs Attention', 'Critical')),
  last_contact timestamp with time zone
);

-- AGENTS TABLE
create table if not exists agents (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  docuuid uuid not null,
  name text not null,
  type text,
  description text,
  capabilities text[] default '{}',
  assigned_patients int default 0,
  calls_made int default 0
);

-- ALERTS TABLE
create table if not exists alerts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  agent_id uuid references agents(id),
  patient_id uuid references patients(id),
  patient_name text, -- De-normalized for easier display
  type text,
  severity text check (severity in ('Low', 'Medium', 'High')),
  status text check (status in ('Open', 'Resolved'))
);

-- ACTIVITIES TABLE
create table if not exists activities (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  agent_id uuid references agents(id),
  type text check (type in ('Call', 'Alert', 'Update')),
  description text,
  date timestamp with time zone default timezone('utc'::text, now()),
  patient_name text
);

-- Enable Row Level Security (RLS)
alter table patients enable row level security;
alter table agents enable row level security;
alter table alerts enable row level security;
alter table activities enable row level security;

-- Policies (Allow everything for authenticated users for now - Simplified for Hackathon)
create policy "Allow all actions for authenticated users" on patients for all using (auth.role() = 'authenticated');
create policy "Allow all actions for authenticated users" on agents for all using (auth.role() = 'authenticated');
create policy "Allow all actions for authenticated users" on alerts for all using (auth.role() = 'authenticated');
create policy "Allow all actions for authenticated users" on activities for all using (auth.role() = 'authenticated');



-- 2
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;


-- 3
-- 1. Create the calls table
CREATE TABLE IF NOT EXISTS calls (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  docuuid uuid not null, -- Links to auth.users.id
  patient_id uuid references patients(id),
  patient_name text,
  agent_id uuid references agents(id),
  agent_name text,
  duration text, -- e.g., "5:23"
  status text check (status in ('ongoing', 'completed', 'Ongoing', 'Completed')),
  call_sid text, -- Twilio Call SID for reference
  transcript text, 
  summary text 
);

-- 2. Enable Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 3. Add Access Policy
CREATE POLICY "Allow all actions for authenticated users" ON calls 
FOR ALL USING (auth.role() = 'authenticated');


-- 4
-- Migration Script: Add missing columns to agents table
-- Run this in your Supabase SQL Editor if you've already created the agents table

-- Add active column (tracks if agent is currently active)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Add configuration column (stores agent personality, bio, knowledge, etc.)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS configuration jsonb DEFAULT '{}'::jsonb;

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;




-- 5
-- Ensure the Agents table is fully established
ALTER TABLE agents ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure Patients has its full tracking columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Complete the Alerts tracing 
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Complete the Calls logging system
ALTER TABLE calls ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS vitals_data JSONB;


-- 6
ALTER TABLE alerts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 7
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS docuuid UUID;


-- 8
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

-- 9
-- Step 2: Set the same number for all patients
UPDATE patients
SET phone_number = '+917982404800';

-- Step 3: Verify
SELECT id, name, phone_number 
FROM patients;