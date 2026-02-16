-- ============================================
-- Manzhil by Scrift - Seed Suggested Template Bodies
-- ============================================
-- Run this once in Supabase SQL Editor.
-- Safe for existing data: only updates rows where message_body_draft IS NULL.
-- ============================================

-- Account Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, welcome to Manzhil by Scrift.\n\nManzhil is a smart WhatsApp-powered Building Management System.\n\nEnter 0 (Zero) to begin.'
WHERE template_key = 'welcome_message' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your account has been temporarily restricted.\n\nReason: {{2}}\nOverdue months: {{3}}\nTotal due: Rs. {{4}}\n\nPlease clear your dues to restore full access. Contact your building management for assistance.'
WHERE template_key = 'account_blocked_maintenance' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, great news! Your account has been reactivated.\n\nYou now have full access to all building services. Thank you for clearing your dues.'
WHERE template_key = 'account_reactivated' AND message_body_draft IS NULL;

-- Maintenance Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nYour maintenance invoice for {{1}} is ready.\n\nAmount: Rs. {{2}}\nDue Date: {{3}}\n\nView & download your invoice:\n{{4}}\n\nPlease ensure timely payment. Thank you.'
WHERE template_key = 'maintenance_invoice' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nThis is a reminder for your pending maintenance payments.\n\nUnpaid months: {{1}}\nTotal due: Rs. {{2}}\n\nView your invoice:\n{{3}}\n\nPlease clear your dues at the earliest. Thank you.'
WHERE template_key = 'maintenance_payment_reminder' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your maintenance payment has been confirmed.\n\nMonth: {{2}}\nAmount: Rs. {{3}}\n\nView your receipt:\n{{4}}\n\nThank you for your timely payment.'
WHERE template_key = 'maintenance_payment_confirmed' AND message_body_draft IS NULL;

-- Booking Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your hall booking has been confirmed!\n\nDate: {{2}}\nTime: {{3}} - {{4}}\nAmount: Rs. {{5}}\nBooking ID: {{6}}\n\nView your invoice:\n{{7}}\n\nEnjoy your event!'
WHERE template_key = 'booking_payment_confirmed' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, this is a reminder for your upcoming hall booking.\n\nDate: {{2}}\nTime: {{3}} - {{4}}\n\nPlease ensure everything is arranged for your event.'
WHERE template_key = 'booking_payment_reminder' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your hall booking has been cancelled.\n\nDate: {{2}}\nTime: {{3}} - {{4}}\n\nIf you have any questions, please contact your building management.'
WHERE template_key = 'booking_cancelled' AND message_body_draft IS NULL;

-- Complaint Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been registered successfully.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\n\nOur team will look into this and update you on the progress.'
WHERE template_key = 'complaint_registered' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint is now being worked on.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\n\nOur team is actively addressing this issue. We will notify you once resolved.'
WHERE template_key = 'complaint_in_progress' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been resolved.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\nResolved: {{5}}\n\nIf you have any further concerns, feel free to reach out.'
WHERE template_key = 'complaint_completed' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been cancelled.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\n\nIf you believe this was done in error, please contact your building management.'
WHERE template_key = 'complaint_rejected' AND message_body_draft IS NULL;

-- Parcel Template
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a parcel has arrived for you at reception.\n\nDescription: {{2}}\n\nPhoto: {{3}}\n\nPlease collect it at your earliest convenience.'
WHERE template_key = 'parcel_arrival' AND message_body_draft IS NULL;

-- Visitor Template
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a visitor has arrived for you.\n\nApartment: {{2}}\nDate: {{3}}\n\nPlease confirm at reception.'
WHERE template_key = 'visitor_arrival' AND message_body_draft IS NULL;

-- Broadcast Template
UPDATE whatsapp_templates SET message_body_draft = E'{{1}}\n\n{{2}}'
WHERE template_key = 'broadcast_announcement' AND message_body_draft IS NULL;

-- Auth Templates
UPDATE whatsapp_templates SET message_body_draft = E'Your Manzhil login code is: {{1}}\n\nThis code expires in 5 minutes. Do not share it with anyone.'
WHERE template_key = 'otp_message' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, you have been added as an admin to the Manzhil building management system.\n\nLogin here to get started:\n{{2}}'
WHERE template_key = 'staff_invitation' AND message_body_draft IS NULL;

-- Admin Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nDaily Report for {{1}}\n\nLast 24 Hours:\n- New complaints: {{2}}\n- New bookings: {{3}}\n\nOpen Complaints Overview:\n- Total open: {{4}}\n- Pending: {{5}}\n- In progress: {{6}}\n\nView full reports:\n- Activity Report: {{7}}\n- Complaints Report: {{8}}\n\nGenerated at {{9}}'
WHERE template_key = 'daily_report' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nPending Complaint Alert\n\nComplaint ID: {{1}}\nResident: {{2}} (Apt {{3}})\nCategory: {{4}}\nType: {{5}}\nDescription: {{6}}\n\nRegistered: {{7}}\nPending for: {{8}} hours\n\nView in admin panel:\n{{9}}'
WHERE template_key = 'pending_complaint' AND message_body_draft IS NULL;
