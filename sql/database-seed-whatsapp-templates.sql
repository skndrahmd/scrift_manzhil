-- ============================================
-- Manzhil by Scrift - WhatsApp Templates Seed Data
-- ============================================
-- Idempotent: Uses ON CONFLICT DO NOTHING
-- Run after creating the whatsapp_templates table
-- ============================================

-- Account Templates (3)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('welcome_message', 'Welcome Message', 'Static welcome message sent to new residents when their profile is created', 'account', 'TWILIO_WELCOME_TEMPLATE_SID', '[]'::jsonb, 'Sent automatically when a new resident profile is created via admin panel or bulk import', 'lib/twilio/notifications/account.ts', E'Hello, welcome to Manzhil by Scrift.\n\nManzhil is a smart Whatsapp Powered Building Management system.\n\nEnter 0 (Zero) to begin.', 1),

  ('account_blocked_maintenance', 'Account Blocked', 'Notification sent when a resident account is blocked due to overdue maintenance payments', 'account', 'TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Reason","description":"Reason for blocking","example":"Overdue maintenance payments"},{"key":"3","label":"Overdue Months","description":"List of overdue months","example":"Jan, Feb, Mar 2026"},{"key":"4","label":"Total Due","description":"Formatted total amount due","example":"15,000"}]'::jsonb, 'Sent when admin blocks a resident account from the resident detail page', 'lib/twilio/notifications/account.ts', NULL, 2),

  ('account_reactivated', 'Account Reactivated', 'Notification sent when a blocked resident account is reactivated', 'account', 'TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"}]'::jsonb, 'Sent when admin reactivates a blocked resident account', 'lib/twilio/notifications/account.ts', NULL, 3)
ON CONFLICT (template_key) DO NOTHING;

-- Maintenance Templates (3)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('maintenance_invoice', 'Maintenance Invoice', 'Monthly invoice sent to residents with payment details and invoice link', 'maintenance', 'TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID', '[{"key":"1","label":"Month/Year","description":"Invoice month and year","example":"January 2026"},{"key":"2","label":"Amount","description":"Formatted maintenance amount","example":"5,000"},{"key":"3","label":"Due Date","description":"Payment due date","example":"10/01/2026"},{"key":"4","label":"Invoice URL","description":"Link to the invoice PDF","example":"https://app.manzhil.com/maintenance-invoice/abc123"}]'::jsonb, 'Sent automatically on 1st of each month via maintenance-reminder cron job', 'lib/twilio/notifications/maintenance.ts', NULL, 1),

  ('maintenance_payment_reminder', 'Maintenance Payment Reminder', 'Reminder sent to residents with overdue maintenance payments', 'maintenance', 'TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID', '[{"key":"1","label":"Months List","description":"List of unpaid months","example":"January, February 2026"},{"key":"2","label":"Total Amount","description":"Formatted total due amount","example":"10,000"},{"key":"3","label":"Invoice URL","description":"Link to the invoice PDF","example":"https://app.manzhil.com/maintenance-invoice/abc123"}]'::jsonb, 'Sent daily from the 3rd of each month for unpaid invoices via maintenance-reminder cron job', 'lib/twilio/notifications/maintenance.ts', NULL, 2),

  ('maintenance_payment_confirmed', 'Maintenance Payment Confirmed', 'Confirmation sent when a maintenance payment is marked as paid', 'maintenance', 'TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Month/Year","description":"Payment month and year","example":"January 2026"},{"key":"3","label":"Amount","description":"Formatted payment amount","example":"5,000"},{"key":"4","label":"Receipt URL","description":"Link to the payment receipt","example":"https://app.manzhil.com/maintenance-invoice/abc123"}]'::jsonb, 'Sent when admin marks a maintenance payment as paid from the unit detail page or maintenance management', 'lib/twilio/notifications/maintenance.ts', NULL, 3)
ON CONFLICT (template_key) DO NOTHING;

-- Booking Templates (3)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('booking_payment_confirmed', 'Booking Payment Confirmed', 'Confirmation sent when a hall booking payment is received', 'booking', 'TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Booking Date","description":"Formatted booking date","example":"January 15, 2026"},{"key":"3","label":"Start Time","description":"Formatted start time","example":"10:00 AM"},{"key":"4","label":"End Time","description":"Formatted end time","example":"2:00 PM"},{"key":"5","label":"Amount","description":"Formatted booking charges","example":"500"},{"key":"6","label":"Booking ID","description":"Unique booking identifier","example":"BK-001"},{"key":"7","label":"Invoice URL","description":"Link to booking invoice","example":"https://app.manzhil.com/booking-invoice/abc123"}]'::jsonb, 'Sent inline when admin marks a booking payment as paid from the bookings page', 'lib/twilio/notifications/booking.ts', NULL, 1),

  ('booking_payment_reminder', 'Booking Reminder', 'Reminder sent before a scheduled hall booking', 'booking', 'TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Booking Date","description":"Formatted booking date","example":"January 15, 2026"},{"key":"3","label":"Start Time","description":"Formatted start time","example":"10:00 AM"},{"key":"4","label":"End Time","description":"Formatted end time","example":"2:00 PM"}]'::jsonb, 'Sent as a reminder before scheduled bookings via the send-reminder endpoint on the bookings page', 'lib/twilio/notifications/booking.ts', NULL, 2),

  ('booking_cancelled', 'Booking Cancelled', 'Notification sent when a hall booking is cancelled', 'booking', 'TWILIO_BOOKING_CANCELLED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Booking Date","description":"Formatted booking date","example":"January 15, 2026"},{"key":"3","label":"Start Time","description":"Formatted start time","example":"10:00 AM"},{"key":"4","label":"End Time","description":"Formatted end time","example":"2:00 PM"}]'::jsonb, 'Sent when admin cancels a booking from the bookings page', 'lib/twilio/notifications/booking.ts', NULL, 3)
ON CONFLICT (template_key) DO NOTHING;

-- Complaint Templates (4)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('complaint_registered', 'Complaint Registered', 'Acknowledgment sent when a new complaint is submitted by a resident', 'complaint', 'TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"}]'::jsonb, 'Sent when a resident submits a complaint via WhatsApp bot or admin creates one', 'lib/twilio/notifications/complaint.ts', NULL, 1),

  ('complaint_in_progress', 'Complaint In Progress', 'Status update sent when a complaint is being worked on', 'complaint', 'TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Admin Comment","description":"Explanation from admin for the status change","example":"Issue has been escalated to the maintenance team"}]'::jsonb, 'Sent when admin changes complaint status to in-progress', 'lib/twilio/notifications/complaint.ts', NULL, 2),

  ('complaint_completed', 'Complaint Completed', 'Resolution notification sent when a complaint is resolved', 'complaint', 'TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Resolved Time","description":"Time when complaint was resolved","example":"January 16, 2026 3:00 PM"},{"key":"6","label":"Admin Comment","description":"Explanation from admin for the status change","example":"Pipe repaired and water restored"}]'::jsonb, 'Sent when admin changes complaint status to completed', 'lib/twilio/notifications/complaint.ts', NULL, 3),

  ('complaint_rejected', 'Complaint Rejected', 'Notification sent when a complaint is rejected or cancelled', 'complaint', 'TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"3","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"4","label":"Registered Time","description":"Time when complaint was registered","example":"January 15, 2026 10:30 AM"},{"key":"5","label":"Admin Comment","description":"Explanation from admin for the status change","example":"Duplicate complaint, already resolved under CMP-099"}]'::jsonb, 'Sent when admin changes complaint status to cancelled/rejected', 'lib/twilio/notifications/complaint.ts', NULL, 4)
ON CONFLICT (template_key) DO NOTHING;

-- Parcel Templates (2)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('parcel_arrival', 'Parcel Arrival', 'Notification sent to residents when a parcel/delivery arrives at reception', 'parcel', 'TWILIO_PARCEL_ARRIVAL_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Description","description":"Parcel description or Package","example":"Amazon Delivery"},{"key":"3","label":"Image URL","description":"Photo of the parcel","example":"https://storage.supabase.co/parcels/img.jpg"}]'::jsonb, 'Sent when admin registers a new parcel from the parcels page', 'lib/twilio/notifications/parcel.ts', NULL, 1),
  ('parcel_collection', 'Parcel Collection', 'Notification sent to residents when someone collects their parcel at reception', 'parcel', 'TWILIO_PARCEL_COLLECTION_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Collector Name","description":"Name of the person who collected the parcel","example":"Ali Khan"},{"key":"3","label":"Collector CNIC","description":"CNIC of the collector","example":"42101-1234567-1"},{"key":"4","label":"Collector Phone","description":"Phone number of the collector","example":"+923001234567"}]'::jsonb, 'Sent when admin records parcel collection via the Collect & Notify flow', 'lib/twilio/notifications/parcel.ts', NULL, 2)
ON CONFLICT (template_key) DO NOTHING;

-- Visitor Templates (1)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('visitor_arrival', 'Visitor Arrival', 'Notification sent to residents when their visitor arrives at the entrance', 'visitor', 'TWILIO_VISITOR_ARRIVAL_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Apartment Number","description":"Resident apartment number","example":"A-101"},{"key":"3","label":"Visit Date","description":"Formatted visit date","example":"January 15, 2026"}]'::jsonb, 'Sent when admin marks a visitor as arrived from the visitors page', 'lib/twilio/notifications/visitor.ts', NULL, 1)
ON CONFLICT (template_key) DO NOTHING;

-- Broadcast Templates (1)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('broadcast_announcement', 'Broadcast Announcement', 'General announcement template used for broadcast messages to multiple residents', 'broadcast', 'TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID', '[{"key":"1","label":"Title","description":"Announcement title (newlines replaced with spaces)","example":"Important Notice"},{"key":"2","label":"Body","description":"Announcement body text (newlines replaced with spaces)","example":"Please note that maintenance work will be done on Saturday."}]'::jsonb, 'Sent from the broadcast page when admin sends an announcement to selected recipients', 'lib/twilio/notifications/broadcast.ts', NULL, 1)
ON CONFLICT (template_key) DO NOTHING;

-- Auth Templates (2)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('otp_message', 'OTP Message', 'One-time password sent for admin login authentication via WhatsApp', 'auth', 'TWILIO_OTP_TEMPLATE_SID', '[{"key":"1","label":"OTP Code","description":"6-digit one-time password","example":"123456"}]'::jsonb, 'Sent when an admin requests login via the /login page', 'lib/twilio/notifications/account.ts', NULL, 1),

  ('staff_invitation', 'Staff Invitation', 'Invitation message sent when a new admin/staff member is created', 'auth', 'TWILIO_STAFF_INVITATION_TEMPLATE_SID', '[{"key":"1","label":"Staff Name","description":"Name of the new staff member","example":"Ali Hassan"},{"key":"2","label":"Login URL","description":"URL to the admin login page","example":"https://app.manzhil.com/login"}]'::jsonb, 'Sent when super admin creates a new staff member from the settings page', 'lib/twilio/notifications/account.ts', NULL, 2)
ON CONFLICT (template_key) DO NOTHING;

-- Admin Templates (4)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('daily_report', 'Daily Report', 'Daily summary report sent to admins with 24-hour activity and open complaints overview', 'admin', 'TWILIO_DAILY_REPORT_TEMPLATE_SID', '[{"key":"1","label":"Report Date","description":"Formatted report date","example":"January 15, 2026"},{"key":"2","label":"New Complaints","description":"Number of complaints in last 24h","example":"3"},{"key":"3","label":"New Bookings","description":"Number of bookings in last 24h","example":"2"},{"key":"4","label":"Open Complaints","description":"Total open complaints count","example":"5"},{"key":"5","label":"Pending Count","description":"Number of pending complaints","example":"3"},{"key":"6","label":"In Progress Count","description":"Number of in-progress complaints","example":"2"},{"key":"7","label":"Activity Report Link","description":"URL to 24-hour activity report PDF","example":"https://app.manzhil.com/daily-report/abc123"},{"key":"8","label":"Complaints Report Link","description":"URL to open complaints report PDF","example":"https://app.manzhil.com/daily-report/def456"},{"key":"9","label":"Generation Time","description":"Time when report was generated","example":"5:00 AM"}]'::jsonb, 'Sent daily at 5 AM via daily-reports cron job to admins with receive_daily_reports enabled', 'app/api/cron/daily-reports/route.ts', NULL, 1),

  ('pending_complaint', 'Pending Complaint Alert', 'Alert sent to admin recipients for complaints pending more than 24 hours', 'admin', 'TWILIO_PENDING_COMPLAINT_TEMPLATE_SID', '[{"key":"1","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"2","label":"Resident Name","description":"Name of the complaining resident","example":"Ahmed Khan"},{"key":"3","label":"Apartment","description":"Apartment number","example":"A-101"},{"key":"4","label":"Category","description":"Complaint category text","example":"Building Complaint"},{"key":"5","label":"Subcategory","description":"Formatted complaint type","example":"Water Leakage"},{"key":"6","label":"Description","description":"Sanitized complaint description (max 500 chars)","example":"Water leaking from ceiling in bathroom"},{"key":"7","label":"Registered Date","description":"Formatted registration date","example":"January 14, 2026"},{"key":"8","label":"Hours Pending","description":"Number of hours complaint has been pending","example":"36"},{"key":"9","label":"Admin URL","description":"Link to admin panel","example":"https://app.manzhil.com/admin"}]'::jsonb, 'Sent every 6 hours via pending-complaints cron job to admins with receive_reminder_notifications enabled', 'app/api/cron/pending-complaints/route.ts', NULL, 2),

  ('admin_complaint_status_update', 'Admin Complaint Status Update', 'Notification sent to admins when a complaint status is changed', 'admin', 'TWILIO_ADMIN_COMPLAINT_STATUS_UPDATE_TEMPLATE_SID', '[{"key":"1","label":"Admin Name","description":"Name of the admin receiving notification","example":"Ali Hassan"},{"key":"2","label":"Complaint ID","description":"Unique complaint identifier","example":"CMP-001"},{"key":"3","label":"Resident Name","description":"Name of the resident who submitted the complaint","example":"Ahmed Khan"},{"key":"4","label":"Apartment Number","description":"Apartment number of the resident","example":"A-101"},{"key":"5","label":"Complaint Type","description":"Formatted complaint type/subcategory","example":"Water Leakage"},{"key":"6","label":"Old Status","description":"Previous status of the complaint","example":"Pending"},{"key":"7","label":"New Status","description":"New status of the complaint","example":"In Progress"},{"key":"8","label":"Update Time","description":"Time when status was updated","example":"January 15, 2026 2:30 PM"}]'::jsonb, 'Sent when admin changes complaint status to admins with receive_complaint_status_updates enabled', 'lib/services/complaint.ts', NULL, 3),

  ('payment_received_admin', 'Payment Received Admin Notification', 'Notification sent to admins when a resident submits a payment receipt for verification', 'admin', 'TWILIO_PAYMENT_RECEIVED_ADMIN_TEMPLATE_SID', '[{"key":"1","label":"Admin Name","description":"Name of the admin receiving notification","example":"Ali Hassan"},{"key":"2","label":"Resident Name","description":"Name of the resident who submitted the payment","example":"Ahmed Khan"},{"key":"3","label":"Apartment Number","description":"Apartment number of the resident","example":"A-101"},{"key":"4","label":"Payment Description","description":"Description of the payment (e.g. Maintenance - January 2026)","example":"Maintenance - January 2026"},{"key":"5","label":"Amount","description":"Formatted payment amount","example":"5,000"},{"key":"6","label":"Admin URL","description":"Link to admin panel","example":"https://app.manzhil.com/admin"}]'::jsonb, 'Sent when a resident submits a payment receipt via WhatsApp bot to admins with receive_payment_notifications enabled', 'lib/webhook/handlers/payment.ts', E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a new payment receipt has been submitted.\n\nResident: {{2}} (Apt {{3}})\nPayment: {{4}}\nAmount: Rs. {{5}}\n\nPlease review and verify the payment.\n\nAdmin Panel: {{6}}', 4)
ON CONFLICT (template_key) DO NOTHING;


-- Payment Templates (2)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('payment_approved', 'Payment Approved', 'Confirmation sent to resident when admin approves a payment receipt', 'payment', 'TWILIO_PAYMENT_APPROVED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Description","description":"Payment description (e.g. Maintenance - January 2026)","example":"Maintenance - January 2026"},{"key":"3","label":"Amount","description":"Formatted payment amount","example":"5,000"}]'::jsonb, 'Sent when admin approves a payment receipt from the Accounting > Verifications tab', 'lib/services/payment-verification.ts', E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your payment for {{2}} (Rs. {{3}}) has been verified and marked as paid.\n\nThank you for your timely payment.', 1),

  ('payment_rejected', 'Payment Rejected', 'Notification sent to resident when admin rejects a payment receipt', 'payment', 'TWILIO_PAYMENT_REJECTED_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Description","description":"Payment description (e.g. Maintenance - January 2026)","example":"Maintenance - January 2026"},{"key":"3","label":"Reason","description":"Reason for rejection provided by admin","example":"Receipt image is unclear"}]'::jsonb, 'Sent when admin rejects a payment receipt from the Accounting > Verifications tab', 'lib/services/payment-verification.ts', E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your receipt for {{2}} was not accepted.\n\nReason: {{3}}\n\nPlease submit a valid receipt again.', 2)
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- Suggested Template Bodies (message_body_draft)
-- ============================================
-- Safe for existing installs: only updates rows where message_body_draft IS NULL
-- These are the suggested message bodies admins can copy when creating
-- templates in the Twilio Console for Meta approval.
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

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint is now being worked on.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\nNote: {{5}}\n\nOur team is actively addressing this issue. We will notify you once resolved.'
WHERE template_key = 'complaint_in_progress' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been resolved.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\nResolved: {{5}}\nNote: {{6}}\n\nIf you have any further concerns, feel free to reach out.'
WHERE template_key = 'complaint_completed' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your complaint has been cancelled.\n\nType: {{2}}\nComplaint ID: {{3}}\nRegistered: {{4}}\nNote: {{5}}\n\nIf you believe this was done in error, please contact your building management.'
WHERE template_key = 'complaint_rejected' AND message_body_draft IS NULL;

-- Parcel Template
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a parcel has arrived for you at reception.\n\nDescription: {{2}}\n\nPhoto: {{3}}\n\nPlease collect it at your earliest convenience.'
WHERE template_key = 'parcel_arrival' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your parcel has been collected by {{2}} (CNIC: {{3}}, Phone: {{4}}).\n\nIf you did not authorize this collection, please contact building management immediately.'
WHERE template_key = 'parcel_collection' AND message_body_draft IS NULL;

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

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a complaint status has been updated.\n\nComplaint ID: {{2}}\nResident: {{3}} (Apt {{4}})\nType: {{5}}\n\nStatus: {{6}} → {{7}}\nUpdated: {{8}}'
WHERE template_key = 'admin_complaint_status_update' AND message_body_draft IS NULL;

-- Payment Received Admin Template
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, a new payment receipt has been submitted.\n\nResident: {{2}} (Apt {{3}})\nPayment: {{4}}\nAmount: Rs. {{5}}\n\nPlease review and verify the payment.\n\nAdmin Panel: {{6}}'
WHERE template_key = 'payment_received_admin' AND message_body_draft IS NULL;

-- Payment Templates
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your payment for {{2}} (Rs. {{3}}) has been verified and marked as paid.\n\nThank you for your timely payment.'
WHERE template_key = 'payment_approved' AND message_body_draft IS NULL;

UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your receipt for {{2}} was not accepted.\n\nReason: {{3}}\n\nPlease submit a valid receipt again.'
WHERE template_key = 'payment_rejected' AND message_body_draft IS NULL;
