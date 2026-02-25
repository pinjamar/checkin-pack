-- Track whether checkout reminder email has been sent to guest
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkout_reminder_sent boolean NOT NULL DEFAULT false;
