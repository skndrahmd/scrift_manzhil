-- Seed: Translatable Label Messages
-- These are newline-delimited label groups used by getLabels() for menus,
-- categories, roles, etc. They go through the same translation pipeline
-- as regular bot messages.
--
-- Run this AFTER database-seed-bot-messages.sql
-- Idempotent: uses ON CONFLICT DO NOTHING

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
  ('labels.main_menu_options', 'main_menu', 'Main Menu Options', 'Main menu option labels (one per line)',
   E'Register Complaint\nCheck Complaint Status\nCancel Complaint\nMy Staff Management\nCheck Maintenance Dues\nCommunity Hall\nVisitor Entry Pass\nView My Profile\nSuggestions/Feedback\nEmergency Contacts',
   '[]'::jsonb, 100),

  ('labels.hall_menu_options', 'booking', 'Hall Menu Options', 'Hall menu option labels (one per line)',
   E'New Booking\nCancel Booking\nEdit Booking\nView My Bookings',
   '[]'::jsonb, 101),

  ('labels.staff_menu_options', 'staff', 'Staff Menu Options', 'Staff menu option labels (one per line)',
   E'Add Staff Member\nView My Staff\nEdit Staff Member\nRemove Staff Member',
   '[]'::jsonb, 102),

  ('labels.complaint_categories', 'complaint', 'Complaint Categories', 'Complaint category labels (one per line)',
   E'My Apartment Complaint\nBuilding Complaint',
   '[]'::jsonb, 103),

  ('labels.apartment_subcategories', 'complaint', 'Apartment Subcategories', 'Apartment complaint subcategory labels (one per line)',
   E'Plumbing\nElectric\nCivil\nMy Parking Complaint\nOther',
   '[]'::jsonb, 104),

  ('labels.building_subcategories', 'complaint', 'Building Subcategories', 'Building complaint subcategory labels (one per line)',
   E'Lift/Elevator\nGym\nSnooker Room\nPlay Area\nParking\nSecurity Complaint\nPlumbing\nElectric\nCivil\nCollaboration Corner\nSeating Area\nOther',
   '[]'::jsonb, 105),

  ('labels.staff_roles', 'staff', 'Staff Roles', 'Staff role labels (one per line)',
   E'Driver\nCook\nMaid\nPlumber\nElectrician\nMaintenance\nSecurity Guard\nOther',
   '[]'::jsonb, 106),

  ('labels.staff_edit_fields', 'staff', 'Staff Edit Fields', 'Staff edit field labels (one per line)',
   E'Name\nCNIC\nPhone',
   '[]'::jsonb, 107),

  ('labels.tower_selection', 'complaint', 'Tower Selection', 'Tower selection labels (one per line)',
   E'Tower A\nTower B\nTower C\nTower D',
   '[]'::jsonb, 108),

  ('labels.reply_menu', 'navigation', 'Reply Menu', 'Reply instruction to return to main menu',
   'Reply *0* for menu',
   '[]'::jsonb, 109)

ON CONFLICT (message_key) DO NOTHING;
