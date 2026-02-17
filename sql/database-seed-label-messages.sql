-- Seed: Translatable Label Messages
-- These are newline-delimited label groups used by getLabels() for menus,
-- categories, roles, etc. They go through the same translation pipeline
-- as regular bot messages.
--
-- Run this AFTER database-seed-bot-messages.sql
-- Idempotent: uses ON CONFLICT DO NOTHING

INSERT INTO bot_messages (message_key, default_text, flow_group, description, variables)
VALUES
  ('labels.main_menu_options',
   E'Register Complaint\nCheck Complaint Status\nCancel Complaint\nMy Staff Management\nCheck Maintenance Dues\nCommunity Hall\nVisitor Entry Pass\nView My Profile\nSuggestions/Feedback\nEmergency Contacts',
   'main_menu', 'Main menu option labels (one per line)', '[]'),

  ('labels.hall_menu_options',
   E'New Booking\nCancel Booking\nEdit Booking\nView My Bookings',
   'booking', 'Hall menu option labels (one per line)', '[]'),

  ('labels.staff_menu_options',
   E'Add Staff Member\nView My Staff\nEdit Staff Member\nRemove Staff Member',
   'staff', 'Staff menu option labels (one per line)', '[]'),

  ('labels.complaint_categories',
   E'My Apartment Complaint\nBuilding Complaint',
   'complaint', 'Complaint category labels (one per line)', '[]'),

  ('labels.apartment_subcategories',
   E'Plumbing\nElectric\nCivil\nMy Parking Complaint\nOther',
   'complaint', 'Apartment complaint subcategory labels (one per line)', '[]'),

  ('labels.building_subcategories',
   E'Lift/Elevator\nGym\nSnooker Room\nPlay Area\nParking\nSecurity Complaint\nPlumbing\nElectric\nCivil\nCollaboration Corner\nSeating Area\nOther',
   'complaint', 'Building complaint subcategory labels (one per line)', '[]'),

  ('labels.staff_roles',
   E'Driver\nCook\nMaid\nPlumber\nElectrician\nMaintenance\nSecurity Guard\nOther',
   'staff', 'Staff role labels (one per line)', '[]'),

  ('labels.staff_edit_fields',
   E'Name\nCNIC\nPhone',
   'staff', 'Staff edit field labels (one per line)', '[]'),

  ('labels.tower_selection',
   E'Tower A\nTower B\nTower C\nTower D',
   'complaint', 'Tower selection labels (one per line)', '[]'),

  ('labels.reply_menu',
   'Reply *0* for menu',
   'navigation', 'Reply instruction to return to main menu', '[]')

ON CONFLICT (message_key) DO NOTHING;
