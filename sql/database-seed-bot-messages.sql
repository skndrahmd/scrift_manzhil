-- ============================================================
-- Bot Messages Seed Data
-- Populates bot_messages table with all default messages.
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- Run after creating the bot_messages table.
-- ============================================================

-- === Main Menu / General ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('menu.main_menu', 'main_menu', 'Main Menu Welcome', 'The greeting shown when the user opens the main menu', E'👋 Hello {name}!\n\nWelcome to *Manzhil*\n\n{options}\n\nReply 1-{max_option}', '["name", "options", "max_option"]'::jsonb, 1),
('menu.profile_info', 'main_menu', 'Profile Info', 'Displays the user''s profile details', E'👤 *Your Profile*\n\n📋 *Details*\n• Name: {name}\n• Apartment: {apartment_number}\n• Phone: {phone_number}\n• Building: {building_block}\n\n💰 *Maintenance*\n• Status: {payment_status}\n• Monthly: {maintenance_charges}\n• Last Payment: {last_payment}\n\nReply *0* for menu', '["name", "apartment_number", "phone_number", "building_block", "payment_status", "maintenance_charges", "last_payment"]'::jsonb, 2),
('menu.maintenance_status', 'main_menu', 'Maintenance Status', 'Shows maintenance payment status', E'💰 *Maintenance Status*\n\n• Apartment: {apartment_number}\n• Monthly: {maintenance_charges}\n• Status: {payment_status}\n• Last Payment: {last_payment}', '["apartment_number", "maintenance_charges", "payment_status", "last_payment"]'::jsonb, 3),
('menu.maintenance_payment_due', 'main_menu', 'Maintenance Payment Due', 'Warning shown when payment is overdue', E'⚠️ *Payment Due*\nPlease pay soon to avoid service interruptions.', '[]'::jsonb, 4),
('menu.emergency_contacts', 'main_menu', 'Emergency Contacts', 'Displays emergency contact numbers', E'🆘 *Emergency Contacts*\n\n{contacts}\n\nReply *0* for menu', '["contacts"]'::jsonb, 5),
('menu.invalid_selection', 'main_menu', 'Invalid Menu Selection', 'Shown when user enters invalid main menu option', E'❓ *Invalid Selection*\n\nPlease reply 1-{max_option}.\n\n{menu}', '["menu", "max_option"]'::jsonb, 6),
('menu.welcome_unregistered', 'main_menu', 'Unregistered User', 'Shown to unregistered phone numbers', E'👋 Hello! This is Manzhil.\n\n❌ This number is not registered. Please contact administration to register.\n\n📞 Contact Admin', '[]'::jsonb, 7),
('menu.account_inactive', 'main_menu', 'Account Inactive', 'Shown to deactivated accounts', E'⚠️ *Account Inactive*\n\nPlease contact administration if this is an error.\n\n📞 Contact Admin', '[]'::jsonb, 8),
('menu.session_expired', 'main_menu', 'Session Expired', 'Shown when a user''s session times out after 5 minutes of inactivity', E'⏳ *Session Expired*\n\nYour previous session has timed out due to inactivity.\n\nReply *0* to open the main menu.', '[]'::jsonb, 9)
ON CONFLICT (message_key) DO NOTHING;

-- === Complaint Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('complaint.category_menu', 'complaint', 'Category Menu', 'Complaint category selection (apartment vs building)', E'📝 *Register Complaint*\n\n1. {apartment_emoji} {apartment_label}\n2. {building_emoji} {building_label}\n\nReply *1* or *2*, or *0* for menu', '["apartment_emoji", "apartment_label", "building_emoji", "building_label"]'::jsonb, 1),
('complaint.apartment_subcategory', 'complaint', 'Apartment Subcategories', 'Apartment complaint subcategory selection', E'🏠 *Apartment Complaint*\n\n{subcategories}\n\nReply 1-{max}, or *B* to go back', '["subcategories", "max"]'::jsonb, 2),
('complaint.building_subcategory', 'complaint', 'Building Subcategories', 'Building complaint subcategory selection', E'🏢 *Building Complaint*\n\n{subcategories}\n\nReply 1-{max}, or *B* to go back', '["subcategories", "max"]'::jsonb, 3),
('complaint.description_prompt', 'complaint', 'Description Prompt', 'Asks user to describe the issue', E'📝 *Add Description*\n\nPlease describe the issue briefly.\n\nReply *B* to go back', '[]'::jsonb, 4),
('complaint.invalid_category', 'complaint', 'Invalid Category', 'Invalid complaint category selection', E'❓ *Invalid Selection*\n\nReply *1* for Apartment or *2* for Building\n\n*B* to go back, *0* for menu', '[]'::jsonb, 5),
('complaint.invalid_subcategory', 'complaint', 'Invalid Subcategory', 'Invalid subcategory selection', E'❓ *Invalid Selection*\n\nPlease choose {range}.\n\nReply *B* to go back', '["range"]'::jsonb, 6),
('complaint.registered', 'complaint', 'Complaint Registered', 'Confirmation after successful complaint registration', E'✅ *Complaint Registered*\n\n📋 ID: {complaint_id}\n🔧 Type: {subcategory}\n📝 {description}\n📅 Registered: {date_time}\n\nYour complaint has been forwarded to maintenance. We''ll notify you of updates.\n\nReply *0* for menu', '["complaint_id", "subcategory", "description", "date_time"]'::jsonb, 7),
('complaint.creation_error', 'complaint', 'Creation Error', 'Shown when complaint cannot be created', E'❌ *Unable to Register Complaint*\n\nWe couldn''t register your complaint. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 8),
('complaint.flow_error', 'complaint', 'Flow Error', 'Generic complaint flow error', E'❌ *Something Went Wrong*\n\nWe couldn''t process your request. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 9),
('complaint.notification_fallback', 'complaint', 'Staff Notification Fallback', 'Plain text notification sent to staff about new complaints', E'🆕 *New Complaint*\n\n📋 ID: {complaint_id}\n👤 {name} ({apartment_number})\n🔧 {category} - {subcategory}\n📝 {description}\n📅 {date} at {time}\n\n🔗 Admin: {admin_url}\n\n— Manzhil', '["complaint_id", "name", "apartment_number", "category", "subcategory", "description", "date", "time", "admin_url"]'::jsonb, 10)
ON CONFLICT (message_key) DO NOTHING;

-- === Booking Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('booking.date_prompt', 'booking', 'Date Prompt', 'Asks user to enter booking date', E'📅 *Community Hall Booking*\n\nEnter your booking date.\n\n*Formats:*\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow", "Dec 25"\n• Just the day (e.g., "15")\n\n*B* to go back, *0* for menu', '[]'::jsonb, 1),
('booking.invalid_date', 'booking', 'Invalid Date', 'Shown for invalid date format', E'❓ *Invalid Date*\n\nTry formats like:\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow"\n• Just the day (e.g., "15")\n\n*B* to go back, *0* for menu', '[]'::jsonb, 2),
('booking.invalid_date_format', 'booking', 'Invalid Date Format', 'Shown when date cannot be parsed', E'❓ *Invalid Date*\n\nPlease enter in DD-MM-YYYY format.\nExample: 25-12-2025\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('booking.date_past', 'booking', 'Date in Past', 'Shown when date is in the past', E'⚠️ *Invalid Date*\n\nDate is in the past. Please choose a future date.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 4),
('booking.hall_unavailable', 'booking', 'Hall Unavailable', 'Shown when hall is closed on selected day', E'⚠️ *Hall Unavailable*\n\nHall is closed on {day_name}s. Please choose another date.\n\n*B* to go back, *0* for menu', '["day_name"]'::jsonb, 5),
('booking.date_taken', 'booking', 'Date Taken', 'Shown when date is already booked', E'❌ *Date Already Booked*\n\nHall is reserved for {date}. Please choose another date.\n\n*B* to go back, *0* for menu', '["date"]'::jsonb, 6),
('booking.policies', 'booking', 'Terms & Conditions', 'Booking terms and conditions prompt', E'📋 *Terms & Conditions*\n\n📅 Date: {date}\n💰 Charges: {charges}\n\n📄 Policies: {policies_link}\n\nDo you agree to the terms?\n\n1. ✅ Yes, I Agree\n2. ❌ No, I Decline\n\nReply *1* or *2*', '["date", "charges", "policies_link"]'::jsonb, 7),
('booking.date_no_longer_available', 'booking', 'Date No Longer Available', 'Race condition: date was just booked', E'⚠️ *Date No Longer Available*\n\nJust booked by someone else. Please choose another date.\n\nReply *0* for menu', '[]'::jsonb, 8),
('booking.confirmed', 'booking', 'Booking Confirmed', 'Successful booking confirmation', E'✅ *Booking Confirmed*\n\n📅 {date} | ⏰ 9AM – 9PM\n💰 {charges} | ⏳ Payment Pending\n\n📌 Notes:\n• Pay before event date\n• 24hr cancellation notice required\n• Leave hall clean\n\n📄 Invoice: {invoice_url}\n\nReply *0* for menu', '["date", "charges", "invoice_url"]'::jsonb, 9),
('booking.failed', 'booking', 'Booking Failed', 'Shown when booking insert fails', E'❌ *Booking Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 10),
('booking.declined', 'booking', 'Booking Declined', 'Shown when user declines terms', E'❌ *Booking Cancelled*\n\nYou must agree to terms to book the hall. Contact management if you have concerns.\n\nReply *0* for menu', '[]'::jsonb, 11),
('booking.invalid_response', 'booking', 'Invalid Response', 'Invalid yes/no response to terms', E'❓ *Invalid Response*\n\nReply *1* (Yes) or *2* (No)\n\nReply *0* for menu', '[]'::jsonb, 12)
ON CONFLICT (message_key) DO NOTHING;

-- === Hall Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('hall.menu', 'hall', 'Hall Menu', 'Community hall main menu', E'🏛️ *Community Hall*\n\n{options}\n\nReply 1-4 or *0* for menu', '["options"]'::jsonb, 1),
('hall.new_booking_date', 'hall', 'New Booking Date', 'Date prompt for new hall booking', E'📅 *New Hall Booking*\n\nEnter your booking date.\n\n*Formats:*\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow", "Dec 25"\n\n*B* to go back, *0* for menu', '[]'::jsonb, 2),
('hall.invalid_date', 'hall', 'Invalid Date', 'Invalid date format in hall booking', E'❓ *Invalid Date*\n\nTry formats like:\n• DD-MM-YYYY (e.g., 25-12-2025)\n• "today", "tomorrow"\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('hall.invalid_date_parse', 'hall', 'Invalid Date Parse', 'Date could not be parsed', E'❓ *Invalid Date*\n\nWe couldn''t understand that. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 4),
('hall.date_past', 'hall', 'Date in Past', 'Hall booking date is in the past', E'⚠️ *Invalid Date*\n\nDate is in the past. Please choose a future date.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 5),
('hall.hall_unavailable', 'hall', 'Hall Unavailable', 'Hall closed on selected day', E'⚠️ *Hall Unavailable*\n\nHall is closed on {day_name}s. Please choose another date.\n\n*B* to go back, *0* for menu', '["day_name"]'::jsonb, 6),
('hall.date_taken', 'hall', 'Date Taken', 'Hall already booked', E'❌ *Date Already Booked*\n\nHall is reserved for {date}. Please choose another date.\n\n*B* to go back, *0* for menu', '["date"]'::jsonb, 7),
('hall.policies', 'hall', 'Terms & Conditions', 'Hall booking terms prompt', E'📋 *Terms & Conditions*\n\n📅 Date: {date}\n💰 Charges: {charges}\n\n📄 Policies: {policies_link}\n\nDo you agree to the terms?\n\n1. ✅ Yes, I Agree\n2. ❌ No, I Decline\n\nReply *1* or *2*', '["date", "charges", "policies_link"]'::jsonb, 8),
('hall.date_no_longer_available', 'hall', 'Date No Longer Available', 'Race condition in hall booking', E'⚠️ *Date No Longer Available*\n\nJust booked by someone else. Please choose another date.\n\nReply *0* for menu', '[]'::jsonb, 9),
('hall.booking_confirmed', 'hall', 'Booking Confirmed', 'Hall booking confirmation', E'✅ *Booking Confirmed*\n\n📅 {date} | ⏰ 9AM – 9PM\n💰 {charges} | ⏳ Payment Pending\n\n📌 Notes:\n• Pay within 3 days\n• 24hr cancellation notice\n• Leave hall clean\n\n📄 Invoice: {invoice_url}\n\nReply *0* for menu', '["date", "charges", "invoice_url"]'::jsonb, 10),
('hall.booking_failed', 'hall', 'Booking Failed', 'Hall booking insert failed', E'❌ *Booking Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 11),
('hall.booking_declined', 'hall', 'Booking Declined', 'User declined hall terms', E'❌ *Booking Cancelled*\n\nYou must agree to terms to book.\n\nReply *0* for menu', '[]'::jsonb, 12),
('hall.invalid_response', 'hall', 'Invalid Response', 'Invalid yes/no for hall terms', E'❓ *Invalid Response*\n\nReply *1* (Yes) or *2* (No)\n\nReply *0* for menu', '[]'::jsonb, 13),
('hall.invalid_menu_selection', 'hall', 'Invalid Menu Selection', 'Invalid hall menu choice', E'❓ *Invalid Selection*\n\nPlease choose 1-4.\n\nReply *0* for menu', '[]'::jsonb, 14),
('hall.no_bookings_cancel', 'hall', 'No Bookings to Cancel', 'No confirmed bookings for cancellation', E'📋 *No Bookings Found*\n\nYou don''t have any confirmed bookings to cancel.\n\nReply *0* for menu', '[]'::jsonb, 15),
('hall.cancel_list', 'hall', 'Cancel Booking List', 'List of bookings available to cancel', E'❌ *Cancel Booking*\n\n{list}\n\nReply with number to cancel, or *0* for menu', '["list"]'::jsonb, 16),
('hall.cancel_confirm', 'hall', 'Cancel Confirmation', 'Booking cancellation confirmation prompt', E'⚠️ *Confirm Cancellation*\n\n📅 Date: {date}\n💰 Charges: {charges}\n💳 Payment: {payment_status}', '["date", "charges", "payment_status"]'::jsonb, 17),
('hall.cancel_refund_note', 'hall', 'Cancel Refund Note', 'Note about refund for paid bookings', E'💡 Note: Refund per cancellation policy.', '[]'::jsonb, 18),
('hall.cancelled', 'hall', 'Booking Cancelled', 'Booking cancellation success', E'✅ *Booking Cancelled*\n\nYour booking for {date} has been cancelled.', '["date"]'::jsonb, 19),
('hall.cancelled_refund', 'hall', 'Cancelled Refund', 'Refund note after cancellation', E'Refund per cancellation policy.', '[]'::jsonb, 20),
('hall.cancel_aborted', 'hall', 'Cancel Aborted', 'User chose not to cancel', E'✅ *Cancellation Aborted*\n\nYour booking remains active. No changes made.\n\nReply *0* for menu', '[]'::jsonb, 21),
('hall.cancel_failed', 'hall', 'Cancel Failed', 'Cancellation database error', E'❌ *Cancellation Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 22),
('hall.no_bookings_edit', 'hall', 'No Bookings to Edit', 'No confirmed bookings for editing', E'📋 *No Bookings Found*\n\nYou don''t have any confirmed bookings to edit.\n\nReply *0* for menu', '[]'::jsonb, 23),
('hall.edit_list', 'hall', 'Edit Booking List', 'List of bookings to reschedule', E'✏️ *Edit Booking*\n\n{list}\n\nReply with number to reschedule, or *0* for menu', '["list"]'::jsonb, 24),
('hall.edit_date_prompt', 'hall', 'Edit Date Prompt', 'New date prompt for rescheduling', E'✏️ *Reschedule Booking*\n\n📅 Current: {current_date}\n\nEnter the new date:\n\n*B* to go back, *0* for menu', '["current_date"]'::jsonb, 25),
('hall.edit_invalid_date', 'hall', 'Edit Invalid Date', 'Invalid date in edit flow', E'❓ *Invalid Date*\n\nEnter in DD-MM-YYYY format.\nExample: 25-12-2025\n\n*B* to go back, *0* for menu', '[]'::jsonb, 26),
('hall.edit_invalid_date_parse', 'hall', 'Edit Invalid Date Parse', 'Unparseable date in edit flow', E'❓ *Invalid Date*\n\nWe couldn''t understand that. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 27),
('hall.edit_date_past', 'hall', 'Edit Date Past', 'Past date in edit flow', E'⚠️ *Invalid Date*\n\nDate is in the past. Please choose a future date.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 28),
('hall.edit_date_taken', 'hall', 'Edit Date Taken', 'Date already booked in edit flow', E'❌ *Date Already Booked*\n\nThat date is reserved. Please choose another.\n\nReply *0* for menu', '[]'::jsonb, 29),
('hall.edit_failed', 'hall', 'Edit Failed', 'Edit booking database error', E'❌ *Update Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 30),
('hall.edit_success', 'hall', 'Edit Success', 'Booking rescheduled successfully', E'✅ *Booking Updated*\n\n📅 From: {old_date}\n📅 To: {new_date}\n\nSuccessfully rescheduled!\n\nReply *0* for menu', '["old_date", "new_date"]'::jsonb, 31),
('hall.no_bookings_view', 'hall', 'No Bookings', 'No bookings to view', E'📋 *No Bookings Found*\n\nYou don''t have any bookings yet. Create one from the Hall menu.\n\nReply *0* for menu', '[]'::jsonb, 32),
('hall.view_bookings', 'hall', 'View Bookings', 'User''s booking list', E'📋 *Your Bookings*\n\n{list}\n\nReply *0* for menu', '["list"]'::jsonb, 33)
ON CONFLICT (message_key) DO NOTHING;

-- === Staff Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('staff.menu', 'staff', 'Staff Menu', 'Staff management main menu', E'👥 *Staff Management*\n\n{options}\n\nReply 1-4 or *0* for menu', '["options"]'::jsonb, 1),
('staff.no_unit', 'staff', 'No Unit Linked', 'User profile not linked to a unit', E'Unable to manage staff. Your profile is not linked to a unit.\n\nPlease contact building management.\n\nReply *0* for menu', '[]'::jsonb, 2),
('staff.add_name', 'staff', 'Add Staff Name', 'Name prompt for new staff', E'➕ *Add New Staff*\n\nEnter staff member''s full name:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('staff.add_phone', 'staff', 'Add Staff Phone', 'Phone prompt for new staff', E'📱 *Enter Phone Number*\n\nFormat: 03001234567\n\n*B* to go back', '[]'::jsonb, 4),
('staff.duplicate_phone', 'staff', 'Duplicate Phone', 'Staff phone already exists', E'⚠️ *Duplicate Entry*\n\nThis phone is already in your staff list.\n\nReply *0* for menu', '[]'::jsonb, 5),
('staff.add_cnic', 'staff', 'Add Staff CNIC', 'CNIC prompt for new staff', E'🆔 *Enter CNIC*\n\nFormat: 13 digits\nExample: 1234512345671\n\n*B* to go back', '[]'::jsonb, 6),
('staff.add_role', 'staff', 'Add Staff Role', 'Role selection for new staff', E'👔 *Select Role*\n\n{roles}\n\nReply 1-{max}, or *B* to go back', '["roles", "max"]'::jsonb, 7),
('staff.add_role_custom', 'staff', 'Custom Role', 'Custom role input prompt', E'📋 *Custom Role*\n\nEnter role name (3-30 characters):\nExamples: Gardener, Helper\n\n*B* to go back', '[]'::jsonb, 8),
('staff.invalid_role', 'staff', 'Invalid Role', 'Invalid role selection', E'❓ *Invalid Selection*\n\nPlease choose 1-{max}.\n\n*B* to go back', '["max"]'::jsonb, 9),
('staff.invalid_custom_role', 'staff', 'Invalid Custom Role', 'Custom role validation failed', E'❌ *Invalid Role*\n\nMust be 3-30 characters.\n\n*B* to go back', '[]'::jsonb, 10),
('staff.added', 'staff', 'Staff Added', 'Staff member successfully created', E'✅ *Staff Member Added*\n\n👤 {name}\n🆔 {cnic}\n📱 {phone}\n👔 {role}\n\n📌 Please submit their CNIC to maintenance for card issuance.\n\nReply *0* for menu', '["name", "cnic", "phone", "role"]'::jsonb, 11),
('staff.add_error', 'staff', 'Add Staff Error', 'Staff creation database error', E'❌ *Unable to Add Staff*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 12),
('staff.view_list', 'staff', 'View Staff List', 'Displays all staff members', E'📋 *Your Staff*\n\n{list}\n\nReply *0* for menu', '["list"]'::jsonb, 13),
('staff.view_empty', 'staff', 'No Staff', 'No staff members found', E'📋 *No Staff Found*\n\nYou haven''t added any staff yet.\n\nReply *0* for menu', '[]'::jsonb, 14),
('staff.view_error', 'staff', 'View Staff Error', 'Error loading staff list', E'❌ *Unable to Load Staff*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 15),
('staff.delete_list', 'staff', 'Delete Staff List', 'Staff list for removal', E'🗑️ *Remove Staff*\n\n{list}\n\nReply with number to remove, or *0* for menu', '["list"]'::jsonb, 16),
('staff.delete_empty', 'staff', 'No Staff to Delete', 'No staff members to remove', E'📋 *No Staff Found*\n\nNo staff members to delete.\n\nReply *0* for menu', '[]'::jsonb, 17),
('staff.delete_confirm', 'staff', 'Delete Confirmation', 'Staff removal confirmation', E'⚠️ *Confirm Removal*\n\n👤 {name}\n🆔 {cnic}\n📱 {phone}\n\nRemove this staff member?\n\n1. ✅ Yes, remove\n2. ❌ No, cancel\n\nReply *1* or *2*', '["name", "cnic", "phone"]'::jsonb, 18),
('staff.deleted', 'staff', 'Staff Deleted', 'Staff removed successfully', E'✅ *Staff Removed*\n\n{name} removed from your list.\n\nReply *0* for menu', '["name"]'::jsonb, 19),
('staff.delete_cancelled', 'staff', 'Delete Cancelled', 'Staff removal cancelled', E'✅ *Removal Cancelled*\n\nStaff list unchanged.\n\nReply *0* for menu', '[]'::jsonb, 20),
('staff.delete_failed', 'staff', 'Delete Failed', 'Staff removal database error', E'❌ *Removal Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 21),
('staff.edit_list', 'staff', 'Edit Staff List', 'Staff list for editing', E'✏️ *Edit Staff*\n\n{list}\n\nReply with number to edit, or *0* for menu', '["list"]'::jsonb, 22),
('staff.edit_empty', 'staff', 'No Staff to Edit', 'No staff members to edit', E'📋 *No Staff Found*\n\nNo staff members to edit.\n\nReply *0* for menu', '[]'::jsonb, 23),
('staff.edit_field_select', 'staff', 'Edit Field Select', 'Choose which field to edit', E'✏️ *Edit: {name}*\n\n1. 👤 Name\n2. 🆔 CNIC\n3. 📱 Phone\n\nReply 1-3', '["name"]'::jsonb, 24),
('staff.edit_name_prompt', 'staff', 'Edit Name Prompt', 'New name input for staff edit', E'📝 *Update Name*\n\nEnter new name for {name}:\n\n*B* to go back', '["name"]'::jsonb, 25),
('staff.edit_cnic_prompt', 'staff', 'Edit CNIC Prompt', 'New CNIC input for staff edit', E'🆔 *Update CNIC*\n\nEnter new 13-digit CNIC:\n\n*B* to go back', '[]'::jsonb, 26),
('staff.edit_phone_prompt', 'staff', 'Edit Phone Prompt', 'New phone input for staff edit', E'📱 *Update Phone*\n\nEnter new phone (e.g., 03001234567):\n\n*B* to go back', '[]'::jsonb, 27),
('staff.edit_invalid_cnic', 'staff', 'Edit Invalid CNIC', 'Invalid CNIC in edit flow', E'❌ *Invalid CNIC*\n\nEnter exactly 13 digits.\n\n*B* to go back', '[]'::jsonb, 28),
('staff.edit_invalid_phone', 'staff', 'Edit Invalid Phone', 'Invalid phone in edit flow', E'❌ *Invalid Phone*\n\nEnter valid mobile number (e.g., 03001234567).\n\n*B* to go back', '[]'::jsonb, 29),
('staff.edit_failed', 'staff', 'Edit Failed', 'Staff edit database error', E'❌ *Update Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 30),
('staff.edit_success', 'staff', 'Edit Success', 'Staff field updated successfully', E'✅ *Staff Updated*\n\n{field_name} changed to: {new_value}\n\nReply *0* for menu', '["field_name", "new_value"]'::jsonb, 31),
('staff.invalid_menu', 'staff', 'Invalid Menu', 'Invalid staff menu selection', E'❓ *Invalid Selection*\n\nPlease choose 1-4.\n\nReply *0* for menu', '[]'::jsonb, 32)
ON CONFLICT (message_key) DO NOTHING;

-- === Visitor Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('visitor.name_prompt', 'visitor', 'Name Prompt', 'Visitor name input', E'🎫 *Visitor Entry Pass*\n\nEnter the *visitor''s name* ✍️\n\n*B* to go back, *0* for menu', '[]'::jsonb, 1),
('visitor.name_too_short', 'visitor', 'Name Too Short', 'Visitor name validation error', E'❌ *Name too short*\n\nPlease enter the visitor''s full name (at least 2 characters).\n\n*B* to go back, *0* for menu', '[]'::jsonb, 2),
('visitor.car_prompt', 'visitor', 'Car Number Prompt', 'Visitor car number input', E'✅ Name: {name}\n\n🚗 Enter the visitor''s *car number* (license plate).\n\n*B* to go back, *0* for menu', '["name"]'::jsonb, 3),
('visitor.car_too_short', 'visitor', 'Car Number Too Short', 'Car number validation error', E'❌ *Car number too short*\n\nPlease enter a valid car number / license plate.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 4),
('visitor.date_prompt', 'visitor', 'Date Prompt', 'Visit date input', E'🚗 Car: {car_number}\n\n📅 Enter *date of visit*.\nFormats: DD-MM-YYYY, "tomorrow", "next Monday"\n\n*B* to go back, *0* for menu', '["car_number"]'::jsonb, 5),
('visitor.invalid_date', 'visitor', 'Invalid Date', 'Invalid visitor date format', E'❌ *Invalid Date*\n\nTry: DD-MM-YYYY, "tomorrow", "next Monday"\n\n*B* to go back, *0* for menu', '[]'::jsonb, 6),
('visitor.invalid_date_parse', 'visitor', 'Invalid Date Parse', 'Unparseable visitor date', E'❌ *Invalid Date*\n\nCouldn''t understand that date. Try again.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 7),
('visitor.date_past', 'visitor', 'Date in Past', 'Visit date is in the past', E'❌ *Invalid Date*\n\nVisit date cannot be in the past.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 8),
('visitor.date_too_far', 'visitor', 'Date Too Far', 'Visit date more than 30 days ahead', E'❌ *Invalid Date*\n\nVisitor passes can only be registered up to 30 days in advance.\n\n*B* to go back, *0* for menu', '[]'::jsonb, 9),
('visitor.created', 'visitor', 'Visitor Pass Created', 'Successful visitor pass creation', E'✅ *Visitor Pass Created!*\n\nForward this to your visitor:\n\n—————————————\n🎫 *Visitor Pass*\n🆔 Pass ID: *{pass_id}*\n👤 Name: {visitor_name}{car_line}\n📅 Date: {date}\n\nShow this message at the gate.\n—————————————\n\nReply *0* for menu', '["pass_id", "visitor_name", "car_line", "date"]'::jsonb, 10),
('visitor.creation_error', 'visitor', 'Creation Error', 'Visitor pass database error', E'❌ *Registration Failed*\n\nPlease try again later.\n\nReply *0* for menu', '[]'::jsonb, 11),
('visitor.unexpected_error', 'visitor', 'Unexpected Error', 'Unexpected visitor flow error', E'❌ *Registration Failed*\n\nAn unexpected error occurred.\n\nReply *0* for menu', '[]'::jsonb, 12)
ON CONFLICT (message_key) DO NOTHING;

-- === Feedback Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('feedback.prompt', 'feedback', 'Feedback Prompt', 'Asks user for feedback', E'💬 *Share Your Feedback*\n\nWe value your input! Share suggestions or thoughts about our services.\n\nType your message, or *0* for menu', '[]'::jsonb, 1),
('feedback.received', 'feedback', 'Feedback Received', 'Feedback saved confirmation', E'✅ *Feedback Received*\n\nThank you! Your feedback has been forwarded to management.\n\n💡 For urgent issues, register a complaint from the main menu.\n\nReply *0* for menu', '[]'::jsonb, 2),
('feedback.error', 'feedback', 'Feedback Error', 'Feedback save error', E'❌ *Unable to Save Feedback*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 3)
ON CONFLICT (message_key) DO NOTHING;

-- === Status Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('status.no_complaints', 'status', 'No Active Complaints', 'No complaints to show', E'📋 *No Active Complaints*\n\nYou don''t have any active complaints. All resolved or none registered yet.\n\nReply *0* for menu', '[]'::jsonb, 1),
('status.list', 'status', 'Complaint Status List', 'List of active complaints', E'🔍 *Complaint Status*\n\n{list}\n\nReply with number to view, or *0* for menu', '["list"]'::jsonb, 2),
('status.detail', 'status', 'Complaint Detail', 'Detailed complaint info', E'📋 *Complaint Details*\n\n🎫 ID: {complaint_id}\n🔧 Type: {subcategory}\n📝 {description}\n📅 Registered: {date}\n\n📊 Status: {status_text}', '["complaint_id", "subcategory", "description", "date", "status_text"]'::jsonb, 3),
('status.invalid_selection', 'status', 'Invalid Selection', 'Invalid complaint selection', E'❓ *Invalid Selection*\n\nPlease choose 1-{max}\n\nReply *0* for menu', '["max"]'::jsonb, 4)
ON CONFLICT (message_key) DO NOTHING;

-- === Cancel Complaint Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('cancel.no_complaints', 'status', 'No Cancellable Complaints', 'No pending complaints to cancel', E'📋 *No Cancellable Complaints*\n\nNo pending complaints to cancel. Only pending complaints can be cancelled.\n\nReply *0* for menu', '[]'::jsonb, 5),
('cancel.list', 'status', 'Cancel List', 'List of cancellable complaints', E'❌ *Cancel Complaint*\n\n{list}\n\nReply with number to cancel, or *0* for menu', '["list"]'::jsonb, 6),
('cancel.confirm', 'status', 'Cancel Confirm', 'Complaint cancellation confirmation', E'⚠️ *Confirm Cancellation*\n\n📋 ID: {complaint_id}\n🔧 Type: {subcategory}\n📝 {description}\n\nCancel this complaint?\n\n1. ✅ Yes, cancel\n2. ❌ No, keep\n\nReply *1* or *2*', '["complaint_id", "subcategory", "description"]'::jsonb, 7),
('cancel.success', 'status', 'Cancel Success', 'Complaint cancelled successfully', E'✅ *Complaint Cancelled*\n\nComplaint {complaint_id} has been cancelled.\n\nReply *0* for menu', '["complaint_id"]'::jsonb, 8),
('cancel.aborted', 'status', 'Cancel Aborted', 'User chose not to cancel', E'✅ *Cancellation Aborted*\n\nYour complaint remains active. No changes made.\n\nReply *0* for menu', '[]'::jsonb, 9),
('cancel.failed', 'status', 'Cancel Failed', 'Cancellation database error', E'❌ *Cancellation Failed*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 10),
('cancel.invalid_response', 'status', 'Cancel Invalid Response', 'Invalid yes/no for cancellation', E'❓ *Invalid Response*\n\nReply *1* (Yes) or *2* (No)\n\nReply *0* for menu', '[]'::jsonb, 11)
ON CONFLICT (message_key) DO NOTHING;

-- === Errors ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('error.generic', 'errors', 'Generic Error', 'Generic processing error', E'❌ *Unable to Process*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 1),
('error.something_wrong', 'errors', 'Something Wrong', 'Unexpected error', E'❌ *Something Went Wrong*\n\nPlease try again.\n\nReply *0* for menu', '[]'::jsonb, 2),
('error.unsupported_file', 'errors', 'Unsupported File', 'Non-image media received', E'❌ *Unsupported File*\n\nPlease send an *image* or text message.\n\nType *0* for menu.', '[]'::jsonb, 3),
('error.empty_message', 'errors', 'Empty Message', 'Empty message body received', E'❌ *Empty Message*\n\nPlease send a text message, or type *0* for menu.', '[]'::jsonb, 4),
('error.unexpected', 'errors', 'Unexpected Error', 'Top-level unexpected error', E'❌ An error occurred. Try again or type *0* for menu.', '[]'::jsonb, 5)
ON CONFLICT (message_key) DO NOTHING;

-- === Back Navigation ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('nav.back_complaint_sub_building', 'navigation', 'Back: Building Complaint', 'Navigation back to building subcategories', E'🔙 *Going Back*\n\n🏢 *Building Complaint*\n\n1. 🛗 Lift/Elevator\n2. 💪 Gym\n3. 🎱 Snooker Room\n4. 🎮 Play Area\n5. 🚗 Parking\n6. 🔒 Security Complaint\n7. 🔧 Plumbing\n8. ⚡ Electric\n9. 🔨 Civil\n10. 🤝 Collaboration Corner\n11. 🪑 Seating Area\n12. 📋 Other\n\nReply with number, or *B* to go back', '[]'::jsonb, 1),
('nav.back_complaint_sub_apartment', 'navigation', 'Back: Apartment Complaint', 'Navigation back to apartment subcategories', E'🔙 *Going Back*\n\n🏠 *Apartment Complaint*\n\n1. 🔧 Plumbing\n2. ⚡ Electric\n3. 🔨 Civil\n4. 🅿️ My Parking Complaint\n5. 🔧 Other\n\nReply with number, or *B* to go back', '[]'::jsonb, 2),
('nav.back_staff_add_name', 'navigation', 'Back: Staff Name', 'Navigation back to staff name entry', E'🔙 *Going Back*\n\nEnter the staff member''s full name:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 3),
('nav.back_staff_add_phone', 'navigation', 'Back: Staff Phone', 'Navigation back to staff phone entry', E'🔙 *Going Back*\n\nEnter the staff member''s phone number:\n\n*B* to go back', '[]'::jsonb, 4),
('nav.back_staff_add_cnic', 'navigation', 'Back: Staff CNIC', 'Navigation back to staff CNIC entry', E'🔙 *Going Back*\n\nEnter the CNIC number:\n\n*B* to go back', '[]'::jsonb, 5),
('nav.back_staff_add_role', 'navigation', 'Back: Staff Role', 'Navigation back to staff role selection', E'🔙 *Going Back*\n\n👔 *Select Staff Role*\n\n1. 🚗 Driver\n2. 👨‍🍳 Cook\n3. 🧹 Maid\n4. 🔧 Plumber\n5. ⚡ Electrician\n6. 🛠️ Maintenance\n7. 🔒 Security Guard\n8. 📋 Other (Specify)\n\nReply 1-8, or *B* to go back', '[]'::jsonb, 6),
('nav.back_booking_date', 'navigation', 'Back: Booking Date', 'Navigation back to booking date entry', E'🔙 *Going Back*\n\nEnter the date you''d like to book:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 7),
('nav.back_hall_menu', 'navigation', 'Back: Hall Menu', 'Navigation back to hall menu', E'🔙 *Going Back*\n\n🏛️ *Community Hall*\n\n1. 📅 New Booking\n2. ❌ Cancel Booking\n3. ✏️ Edit Booking\n4. 📋 View My Bookings\n\nReply 1-4, or *0* for menu', '[]'::jsonb, 8),
('nav.back_hall_booking_date', 'navigation', 'Back: Hall Booking Date', 'Navigation back to hall booking date', E'🔙 *Going Back*\n\nEnter the date you''d like to book:\n\n*B* to go back, *0* for menu', '[]'::jsonb, 9),
('nav.back_visitor_name', 'navigation', 'Back: Visitor Name', 'Navigation back to visitor name entry', E'🔙 *Going Back*\n\n🎫 *Visitor Entry Pass*\n\nEnter the *visitor''s name* ✍️\n\n*B* to go back, *0* for menu', '[]'::jsonb, 10),
('nav.back_visitor_car', 'navigation', 'Back: Visitor Car', 'Navigation back to visitor car entry', E'🔙 *Going Back*\n\n🚗 Enter the visitor''s *car number* (license plate).\n\n*B* to go back, *0* for menu', '[]'::jsonb, 11)
ON CONFLICT (message_key) DO NOTHING;

-- === Amenity Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('amenity.menu', 'amenity', 'Amenity Menu', 'List of building amenities', E'🏟️ *Amenities*\n\n{options}\n\nReply with number, or *0* for menu', '["options"]'::jsonb, 1),
('amenity.timings', 'amenity', 'Amenity Timings', 'Operating hours for an amenity', E'🏟️ *{name}*\n\n⏰ *Timings*\n{timings}\n\nReply *0* for menu', '["name", "timings"]'::jsonb, 2),
('amenity.under_maintenance', 'amenity', 'Amenity Under Maintenance', 'Shown when amenity is under maintenance', E'🏟️ *{name}*\n\n🔧 *Under Maintenance*\n\nThis amenity is currently under maintenance. Please check back later.\n\nReply *0* for menu', '["name"]'::jsonb, 3),
('amenity.invalid_selection', 'amenity', 'Invalid Amenity Selection', 'Invalid amenity number selected', E'❓ *Invalid Selection*\n\nPlease choose 1-{max}.\n\nReply *0* for menu', '["max"]'::jsonb, 4),
('amenity.no_amenities', 'amenity', 'No Amenities Available', 'Shown when no active amenities exist', E'📋 *No Amenities Available*\n\nNo amenities are currently configured.\n\nReply *0* for menu', '[]'::jsonb, 5),
('amenity.prayer_times_label', 'amenity', 'Prayer Times Label', 'Label for Prayer Times option in amenity menu', 'Prayer Times', '[]'::jsonb, 6)
ON CONFLICT (message_key) DO NOTHING;

-- === Prayer Times Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('prayer_times.display', 'prayer_times', 'Prayer Times Display', 'Shows all prayer times', E'🕌 *Prayer Times*\n\n{prayers}\n\nReply *0* for menu', '[\"prayers\"]'::jsonb, 1),
('prayer_times.disabled', 'prayer_times', 'Prayer Times Disabled', 'Shown when prayer times are disabled', E'🕌 *Prayer Times*\n\nPrayer times are currently unavailable.\n\nReply *0* for menu', '[]'::jsonb, 2)
ON CONFLICT (message_key) DO NOTHING;
