-- ============================================================
-- Payment Receipt Flow - Bot Messages Seed Data
-- Populates bot_messages table with payment receipt flow messages.
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- Run after creating the bot_messages table.
-- ============================================================

-- === Payment Receipt Flow ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('payment.menu', 'payment', 'Payment Menu', 'Payment type selection (maintenance vs booking)', E'💳 *Submit Payment*\n\nWhat are you paying for?\n\n{options}\n\nReply 1-2, or *0* for menu', '["options"]'::jsonb, 1),
('payment.no_methods', 'payment', 'No Payment Methods', 'Shown when no payment methods are configured', E'❌ *Online Payment Not Available*\n\nNo payment methods are currently configured. Please contact your building admin.\n\nReply *0* for menu', '[]'::jsonb, 2),
('payment.no_pending', 'payment', 'No Pending Payments', 'Shown when there are no unpaid payments', E'✅ *No Pending Payments*\n\nYou don''t have any unpaid {type} payments.\n\nReply *0* for menu', '["type"]'::jsonb, 3),
('payment.select', 'payment', 'Select Payment', 'List of pending payments for selection', E'💰 *Select Payment*\n\n{list}\n\nReply with number, or *0* for menu', '["list"]'::jsonb, 4),
('payment.already_submitted', 'payment', 'Already Submitted', 'Shown when a receipt was already submitted for this payment', E'⏳ *Receipt Already Submitted*\n\nYou already submitted a receipt for this payment. It''s being verified by admin.\n\nReply *0* for menu', '[]'::jsonb, 5),
('payment.methods_list', 'payment', 'Payment Methods List', 'Shows payment account details and amount', E'💳 *Payment Details*\n\n💰 Amount: *{amount}*\n📝 For: {description}\n\nPlease send payment to one of these accounts:\n\n{methods}\n\nAfter paying, send a *screenshot* of your receipt.\n\nReply *0* for menu', '["amount", "description", "methods"]'::jsonb, 6),
('payment.send_image', 'payment', 'Send Receipt Image', 'Prompt to send receipt screenshot', E'📸 *Send Receipt*\n\nPlease send a *photo/screenshot* of your payment receipt.\n\nReply *0* for menu', '[]'::jsonb, 7),
('payment.receipt_received', 'payment', 'Receipt Received', 'Confirmation after receipt is uploaded', E'✅ *Receipt Received!*\n\n📝 {description}\n💰 Amount: {amount}\n\nYour receipt has been submitted for verification. We''ll notify you once it''s reviewed.\n\nReply *0* for menu', '["description", "amount"]'::jsonb, 8),
('payment.upload_error', 'payment', 'Upload Error', 'Shown when receipt upload fails', E'❌ *Upload Failed*\n\nWe couldn''t upload your receipt. Please try again.\n\nReply *0* for menu', '[]'::jsonb, 9)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Labels ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('labels.payment_menu_options', 'payment', 'Payment Menu Labels', 'Translatable labels for payment type options (newline-delimited)', E'Maintenance\nHall Booking', '[]'::jsonb, 10)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Verification Notifications ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('payment.approved', 'payment', 'Payment Approved', 'Sent to resident when admin approves their receipt', E'✅ *Payment Verified!*\n\nYour payment for {description} (PKR {amount}) has been verified and marked as paid.\n\nReply *0* for menu', '["description", "amount"]'::jsonb, 11),
('payment.rejected', 'payment', 'Payment Rejected', 'Sent to resident when admin rejects their receipt', E'❌ *Receipt Not Accepted*\n\nYour receipt for {description} was not accepted.\n\n📝 Reason: {reason}\n\nPlease submit a valid receipt again.\n\nReply *0* for menu', '["description", "reason"]'::jsonb, 12)
ON CONFLICT (message_key) DO NOTHING;

-- === Payment Back Navigation ===

INSERT INTO bot_messages (message_key, flow_group, label, description, default_text, variables, sort_order)
VALUES
('nav.back_payment_type', 'navigation', 'Back to Payment Type', 'Back navigation to payment type selection', E'🔙 *Going Back*\n\n💳 *Submit Payment*\n\nWhat are you paying for?\n\n1. 💰 Maintenance\n2. 🏛️ Hall Booking\n\nReply 1-2, or *0* for menu', '[]'::jsonb, 20)
ON CONFLICT (message_key) DO NOTHING;
