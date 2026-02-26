/**
 * Bot Message Defaults
 * Contains the default text for every customizable bot message.
 * Used as fallback when the database is unavailable.
 * Variables use {variable_name} syntax for interpolation.
 */

import type { MessageKey } from "./message-keys"

export const MESSAGE_DEFAULTS: Record<MessageKey, string> = {
  // === Main Menu / General ===
  "menu.main_menu": `👋 Hello {name}!

Welcome to *Manzhil*

{options}

Reply 1-{max_option}`,

  "menu.profile_info": `👤 *Your Profile*

📋 *Details*
• Name: {name}
• Apartment: {apartment_number}
• Phone: {phone_number}
• Building: {building_block}

💰 *Maintenance*
• Status: {payment_status}
• Monthly: {maintenance_charges}
• Last Payment: {last_payment}

Reply *0* for menu`,

  "menu.maintenance_status": `💰 *Maintenance Status*

• Apartment: {apartment_number}
• Monthly: {maintenance_charges}
• Status: {payment_status}
• Last Payment: {last_payment}`,

  "menu.maintenance_payment_due": `⚠️ *Payment Due*
Please pay soon to avoid service interruptions.`,

  "menu.emergency_contacts": `🆘 *Emergency Contacts*

{contacts}

Reply *0* for menu`,

  "menu.invalid_selection": `❓ *Invalid Selection*

Please reply 1-11.

{menu}`,

  "menu.session_expired": `⏳ *Session Expired*

Your previous session has timed out due to inactivity.

Reply *0* to open the main menu.`,

  "menu.welcome_unregistered": `👋 Hello! This is Manzhil.

❌ This number is not registered. Please contact administration to register.

📞 Contact Admin`,

  "menu.account_inactive": `⚠️ *Account Inactive*

Please contact administration if this is an error.

📞 Contact Admin`,

  // === Complaint Flow ===
  "complaint.category_menu": `📝 *Register Complaint*

1. {apartment_emoji} {apartment_label}
2. {building_emoji} {building_label}

Reply *1* or *2*, or *0* for menu`,

  "complaint.apartment_subcategory": `🏠 *Apartment Complaint*

{subcategories}

Reply 1-{max}, or *B* to go back`,

  "complaint.building_subcategory": `🏢 *Building Complaint*

{subcategories}

Reply 1-{max}, or *B* to go back`,

  "complaint.description_prompt": `📝 *Add Description*

Please describe the issue briefly.

Reply *B* to go back`,

  "complaint.invalid_category": `❓ *Invalid Selection*

Reply *1* for Apartment or *2* for Building

*B* to go back, *0* for menu`,

  "complaint.invalid_subcategory": `❓ *Invalid Selection*

Please choose {range}.

Reply *B* to go back`,

  "complaint.registered": `✅ *Complaint Registered*

📋 ID: {complaint_id}
🔧 Type: {subcategory}
📝 {description}
📅 Registered: {date_time}

Your complaint has been forwarded to maintenance. We'll notify you of updates.

Reply *0* for menu`,

  "complaint.creation_error": `❌ *Unable to Register Complaint*

We couldn't register your complaint. Please try again.

Reply *0* for menu`,

  "complaint.flow_error": `❌ *Something Went Wrong*

We couldn't process your request. Please try again.

Reply *0* for menu`,

  "complaint.notification_fallback": `🆕 *New Complaint*

📋 ID: {complaint_id}
👤 {name} ({apartment_number})
🔧 {category} - {subcategory}
📝 {description}
📅 {date} at {time}

🔗 Admin: {admin_url}

— Manzhil`,

  // === Booking Flow ===
  "booking.date_prompt": `📅 *Community Hall Booking*

Enter your booking date.

*Formats:*
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow", "Dec 25"
• Just the day (e.g., "15")

*B* to go back, *0* for menu`,

  "booking.invalid_date": `❓ *Invalid Date*

Try formats like:
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow"
• Just the day (e.g., "15")

*B* to go back, *0* for menu`,

  "booking.invalid_date_format": `❓ *Invalid Date*

Please enter in DD-MM-YYYY format.
Example: 25-12-2025

*B* to go back, *0* for menu`,

  "booking.date_past": `⚠️ *Invalid Date*

Date is in the past. Please choose a future date.

*B* to go back, *0* for menu`,

  "booking.hall_unavailable": `⚠️ *Hall Unavailable*

Hall is closed on {day_name}s. Please choose another date.

*B* to go back, *0* for menu`,

  "booking.date_taken": `❌ *Date Already Booked*

Hall is reserved for {date}. Please choose another date.

*B* to go back, *0* for menu`,

  "booking.policies": `📋 *Terms & Conditions*

📅 Date: {date}
💰 Charges: {charges}

📄 Policies: {policies_link}

Do you agree to the terms?

1. ✅ Yes, I Agree
2. ❌ No, I Decline

Reply *1* or *2*`,

  "booking.date_no_longer_available": `⚠️ *Date No Longer Available*

Just booked by someone else. Please choose another date.

Reply *0* for menu`,

  "booking.confirmed": `✅ *Booking Confirmed*

📅 {date} | ⏰ 9AM – 9PM
💰 {charges} | ⏳ Payment Pending

📌 Notes:
• Pay before event date
• 24hr cancellation notice required
• Leave hall clean

📄 Invoice: {invoice_url}

Reply *0* for menu`,

  "booking.failed": `❌ *Booking Failed*

Please try again.

Reply *0* for menu`,

  "booking.declined": `❌ *Booking Cancelled*

You must agree to terms to book the hall. Contact management if you have concerns.

Reply *0* for menu`,

  "booking.invalid_response": `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`,

  // === Hall Flow ===
  "hall.menu": `🏛️ *Community Hall*

{options}

Reply 1-4 or *0* for menu`,

  "hall.new_booking_date": `📅 *New Hall Booking*

Enter your booking date.

*Formats:*
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow", "Dec 25"

*B* to go back, *0* for menu`,

  "hall.invalid_date": `❓ *Invalid Date*

Try formats like:
• DD-MM-YYYY (e.g., 25-12-2025)
• "today", "tomorrow"

*B* to go back, *0* for menu`,

  "hall.invalid_date_parse": `❓ *Invalid Date*

We couldn't understand that. Please try again.

Reply *0* for menu`,

  "hall.date_past": `⚠️ *Invalid Date*

Date is in the past. Please choose a future date.

*B* to go back, *0* for menu`,

  "hall.hall_unavailable": `⚠️ *Hall Unavailable*

Hall is closed on {day_name}s. Please choose another date.

*B* to go back, *0* for menu`,

  "hall.date_taken": `❌ *Date Already Booked*

Hall is reserved for {date}. Please choose another date.

*B* to go back, *0* for menu`,

  "hall.policies": `📋 *Terms & Conditions*

📅 Date: {date}
💰 Charges: {charges}

📄 Policies: {policies_link}

Do you agree to the terms?

1. ✅ Yes, I Agree
2. ❌ No, I Decline

Reply *1* or *2*`,

  "hall.date_no_longer_available": `⚠️ *Date No Longer Available*

Just booked by someone else. Please choose another date.

Reply *0* for menu`,

  "hall.booking_confirmed": `✅ *Booking Confirmed*

📅 {date} | ⏰ 9AM – 9PM
💰 {charges} | ⏳ Payment Pending

📌 Notes:
• Pay within 3 days
• 24hr cancellation notice
• Leave hall clean

📄 Invoice: {invoice_url}

Reply *0* for menu`,

  "hall.booking_failed": `❌ *Booking Failed*

Please try again.

Reply *0* for menu`,

  "hall.booking_declined": `❌ *Booking Cancelled*

You must agree to terms to book.

Reply *0* for menu`,

  "hall.invalid_response": `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`,

  "hall.invalid_menu_selection": `❓ *Invalid Selection*

Please choose 1-4.

Reply *0* for menu`,

  "hall.no_bookings_cancel": `📋 *No Bookings Found*

You don't have any confirmed bookings to cancel.

Reply *0* for menu`,

  "hall.cancel_list": `❌ *Cancel Booking*

{list}

Reply with number to cancel, or *0* for menu`,

  "hall.cancel_confirm": `⚠️ *Confirm Cancellation*

📅 Date: {date}
💰 Charges: {charges}
💳 Payment: {payment_status}`,

  "hall.cancel_refund_note": `💡 Note: Refund per cancellation policy.`,

  "hall.cancelled": `✅ *Booking Cancelled*

Your booking for {date} has been cancelled.`,

  "hall.cancelled_refund": `Refund per cancellation policy.`,

  "hall.cancel_aborted": `✅ *Cancellation Aborted*

Your booking remains active. No changes made.

Reply *0* for menu`,

  "hall.cancel_failed": `❌ *Cancellation Failed*

Please try again.

Reply *0* for menu`,

  "hall.no_bookings_edit": `📋 *No Bookings Found*

You don't have any confirmed bookings to edit.

Reply *0* for menu`,

  "hall.edit_list": `✏️ *Edit Booking*

{list}

Reply with number to reschedule, or *0* for menu`,

  "hall.edit_date_prompt": `✏️ *Reschedule Booking*

📅 Current: {current_date}

Enter the new date:

*B* to go back, *0* for menu`,

  "hall.edit_invalid_date": `❓ *Invalid Date*

Enter in DD-MM-YYYY format.
Example: 25-12-2025

*B* to go back, *0* for menu`,

  "hall.edit_invalid_date_parse": `❓ *Invalid Date*

We couldn't understand that. Please try again.

Reply *0* for menu`,

  "hall.edit_date_past": `⚠️ *Invalid Date*

Date is in the past. Please choose a future date.

*B* to go back, *0* for menu`,

  "hall.edit_date_taken": `❌ *Date Already Booked*

That date is reserved. Please choose another.

Reply *0* for menu`,

  "hall.edit_failed": `❌ *Update Failed*

Please try again.

Reply *0* for menu`,

  "hall.edit_success": `✅ *Booking Updated*

📅 From: {old_date}
📅 To: {new_date}

Successfully rescheduled!

Reply *0* for menu`,

  "hall.no_bookings_view": `📋 *No Bookings Found*

You don't have any bookings yet. Create one from the Hall menu.

Reply *0* for menu`,

  "hall.view_bookings": `📋 *Your Bookings*

{list}

Reply *0* for menu`,

  // === Staff Flow ===
  "staff.menu": `👥 *Staff Management*

{options}

Reply 1-4 or *0* for menu`,

  "staff.no_unit": `Unable to manage staff. Your profile is not linked to a unit.

Please contact building management.

Reply *0* for menu`,

  "staff.add_name": `➕ *Add New Staff*

Enter staff member's full name:

*B* to go back, *0* for menu`,

  "staff.add_phone": `📱 *Enter Phone Number*

Format: 03001234567

*B* to go back`,

  "staff.duplicate_phone": `⚠️ *Duplicate Entry*

This phone is already in your staff list.

Reply *0* for menu`,

  "staff.add_cnic": `🆔 *Enter CNIC*

Format: 13 digits
Example: 1234512345671

*B* to go back`,

  "staff.add_role": `👔 *Select Role*

{roles}

Reply 1-{max}, or *B* to go back`,

  "staff.add_role_custom": `📋 *Custom Role*

Enter role name (3-30 characters):
Examples: Gardener, Helper

*B* to go back`,

  "staff.invalid_role": `❓ *Invalid Selection*

Please choose 1-{max}.

*B* to go back`,

  "staff.invalid_custom_role": `❌ *Invalid Role*

Must be 3-30 characters.

*B* to go back`,

  "staff.added": `✅ *Staff Member Added*

👤 {name}
🆔 {cnic}
📱 {phone}
👔 {role}

📌 Please submit their CNIC to maintenance for card issuance.

Reply *0* for menu`,

  "staff.add_error": `❌ *Unable to Add Staff*

Please try again.

Reply *0* for menu`,

  "staff.view_list": `📋 *Your Staff*

{list}

Reply *0* for menu`,

  "staff.view_empty": `📋 *No Staff Found*

You haven't added any staff yet.

Reply *0* for menu`,

  "staff.view_error": `❌ *Unable to Load Staff*

Please try again.

Reply *0* for menu`,

  "staff.delete_list": `🗑️ *Remove Staff*

{list}

Reply with number to remove, or *0* for menu`,

  "staff.delete_empty": `📋 *No Staff Found*

No staff members to delete.

Reply *0* for menu`,

  "staff.delete_confirm": `⚠️ *Confirm Removal*

👤 {name}
🆔 {cnic}
📱 {phone}

Remove this staff member?

1. ✅ Yes, remove
2. ❌ No, cancel

Reply *1* or *2*`,

  "staff.deleted": `✅ *Staff Removed*

{name} removed from your list.

Reply *0* for menu`,

  "staff.delete_cancelled": `✅ *Removal Cancelled*

Staff list unchanged.

Reply *0* for menu`,

  "staff.delete_failed": `❌ *Removal Failed*

Please try again.

Reply *0* for menu`,

  "staff.edit_list": `✏️ *Edit Staff*

{list}

Reply with number to edit, or *0* for menu`,

  "staff.edit_empty": `📋 *No Staff Found*

No staff members to edit.

Reply *0* for menu`,

  "staff.edit_field_select": `✏️ *Edit: {name}*

1. 👤 Name
2. 🆔 CNIC
3. 📱 Phone

Reply 1-3`,

  "staff.edit_name_prompt": `📝 *Update Name*

Enter new name for {name}:

*B* to go back`,

  "staff.edit_cnic_prompt": `🆔 *Update CNIC*

Enter new 13-digit CNIC:

*B* to go back`,

  "staff.edit_phone_prompt": `📱 *Update Phone*

Enter new phone (e.g., 03001234567):

*B* to go back`,

  "staff.edit_invalid_cnic": `❌ *Invalid CNIC*

Enter exactly 13 digits.

*B* to go back`,

  "staff.edit_invalid_phone": `❌ *Invalid Phone*

Enter valid mobile number (e.g., 03001234567).

*B* to go back`,

  "staff.edit_failed": `❌ *Update Failed*

Please try again.

Reply *0* for menu`,

  "staff.edit_success": `✅ *Staff Updated*

{field_name} changed to: {new_value}

Reply *0* for menu`,

  "staff.invalid_menu": `❓ *Invalid Selection*

Please choose 1-4.

Reply *0* for menu`,

  // === Visitor Flow ===
  "visitor.name_prompt": `🎫 *Visitor Entry Pass*

Enter the *visitor's name* ✍️

*B* to go back, *0* for menu`,

  "visitor.name_too_short": `❌ *Name too short*

Please enter the visitor's full name (at least 2 characters).

*B* to go back, *0* for menu`,

  "visitor.car_prompt": `✅ Name: {name}

🚗 Enter the visitor's *car number* (license plate).

*B* to go back, *0* for menu`,

  "visitor.car_too_short": `❌ *Car number too short*

Please enter a valid car number / license plate.

*B* to go back, *0* for menu`,

  "visitor.date_prompt": `🚗 Car: {car_number}

📅 Enter *date of visit*.
Formats: DD-MM-YYYY, "tomorrow", "next Monday"

*B* to go back, *0* for menu`,

  "visitor.invalid_date": `❌ *Invalid Date*

Try: DD-MM-YYYY, "tomorrow", "next Monday"

*B* to go back, *0* for menu`,

  "visitor.invalid_date_parse": `❌ *Invalid Date*

Couldn't understand that date. Try again.

*B* to go back, *0* for menu`,

  "visitor.date_past": `❌ *Invalid Date*

Visit date cannot be in the past.

*B* to go back, *0* for menu`,

  "visitor.date_too_far": `❌ *Invalid Date*

Visitor passes can only be registered up to 30 days in advance.

*B* to go back, *0* for menu`,

  "visitor.created": `✅ *Visitor Pass Created!*

Forward this to your visitor:

—————————————
🎫 *Visitor Pass*
🆔 Pass ID: *{pass_id}*
👤 Name: {visitor_name}{car_line}
📅 Date: {date}

Show this message at the gate.
—————————————

Reply *0* for menu`,

  "visitor.creation_error": `❌ *Registration Failed*

Please try again later.

Reply *0* for menu`,

  "visitor.unexpected_error": `❌ *Registration Failed*

An unexpected error occurred.

Reply *0* for menu`,

  // === Feedback Flow ===
  "feedback.prompt": `💬 *Share Your Feedback*

We value your input! Share suggestions or thoughts about our services.

Type your message, or *0* for menu`,

  "feedback.received": `✅ *Feedback Received*

Thank you! Your feedback has been forwarded to management.

💡 For urgent issues, register a complaint from the main menu.

Reply *0* for menu`,

  "feedback.error": `❌ *Unable to Save Feedback*

Please try again.

Reply *0* for menu`,

  // === Status Flow ===
  "status.no_complaints": `📋 *No Active Complaints*

You don't have any active complaints. All resolved or none registered yet.

Reply *0* for menu`,

  "status.list": `🔍 *Complaint Status*

{list}

Reply with number to view, or *0* for menu`,

  "status.detail": `📋 *Complaint Details*

🎫 ID: {complaint_id}
🔧 Type: {subcategory}
📝 {description}
📅 Registered: {date}

📊 Status: {status_text}`,

  "status.invalid_selection": `❓ *Invalid Selection*

Please choose 1-{max}

Reply *0* for menu`,

  // === Cancel Complaint Flow ===
  "cancel.no_complaints": `📋 *No Cancellable Complaints*

No pending complaints to cancel. Only pending complaints can be cancelled.

Reply *0* for menu`,

  "cancel.list": `❌ *Cancel Complaint*

{list}

Reply with number to cancel, or *0* for menu`,

  "cancel.confirm": `⚠️ *Confirm Cancellation*

📋 ID: {complaint_id}
🔧 Type: {subcategory}
📝 {description}

Cancel this complaint?

1. ✅ Yes, cancel
2. ❌ No, keep

Reply *1* or *2*`,

  "cancel.success": `✅ *Complaint Cancelled*

Complaint {complaint_id} has been cancelled.

Reply *0* for menu`,

  "cancel.aborted": `✅ *Cancellation Aborted*

Your complaint remains active. No changes made.

Reply *0* for menu`,

  "cancel.failed": `❌ *Cancellation Failed*

Please try again.

Reply *0* for menu`,

  "cancel.invalid_response": `❓ *Invalid Response*

Reply *1* (Yes) or *2* (No)

Reply *0* for menu`,

  // === Errors ===
  "error.generic": `❌ *Unable to Process*

Please try again.

Reply *0* for menu`,

  "error.something_wrong": `❌ *Something Went Wrong*

Please try again.

Reply *0* for menu`,

  "error.unsupported_file": `❌ *Unsupported File*

Please send an *image* or text message.

Type *0* for menu.`,

  "error.empty_message": `❌ *Empty Message*

Please send a text message, or type *0* for menu.`,

  "error.unexpected": `❌ An error occurred. Try again or type *0* for menu.`,

  // === Translatable Labels (newline-delimited, used by getLabels()) ===
  "labels.main_menu_options": `Register Complaint
Check Complaint Status
Cancel Complaint
My Staff Management
Check Maintenance Dues
Community Hall
Visitor Entry Pass
View My Profile
Suggestions/Feedback
Emergency Contacts
Submit Payment`,

  "labels.hall_menu_options": `New Booking
Cancel Booking
Edit Booking
View My Bookings`,

  "labels.staff_menu_options": `Add Staff Member
View My Staff
Edit Staff Member
Remove Staff Member`,

  "labels.complaint_categories": `My Apartment Complaint
Building Complaint`,

  "labels.apartment_subcategories": `Plumbing
Electric
Civil
My Parking Complaint
Other`,

  "labels.building_subcategories": `Lift/Elevator
Gym
Snooker Room
Play Area
Parking
Security Complaint
Plumbing
Electric
Civil
Collaboration Corner
Seating Area
Other`,

  "labels.staff_roles": `Driver
Cook
Maid
Plumber
Electrician
Maintenance
Security Guard
Other`,

  "labels.staff_edit_fields": `Name
CNIC
Phone`,

  "labels.tower_selection": `Tower A
Tower B
Tower C
Tower D`,

  "labels.payment_menu_options": `Maintenance
Hall Booking`,

  "labels.reply_menu": `Reply *0* for menu`,

  // === Payment Receipt Flow ===
  "payment.menu": `💳 *Submit Payment*

What are you paying for?

{options}

Reply 1-2, or *0* for menu`,

  "payment.no_methods": `❌ *Online Payment Not Available*

No payment methods are currently configured. Please contact your building admin.

Reply *0* for menu`,

  "payment.no_pending": `✅ *No Pending Payments*

You don't have any unpaid {type} payments.

Reply *0* for menu`,

  "payment.select": `💰 *Select Payment*

{list}

Reply with number, or *0* for menu`,

  "payment.already_submitted": `⏳ *Receipt Already Submitted*

You already submitted a receipt for this payment. It's being verified by admin.

Reply *0* for menu`,

  "payment.methods_list": `💳 *Payment Details*

💰 Amount: *{amount}*
📝 For: {description}

Please send payment to one of these accounts:

{methods}

After paying, send a *screenshot* of your receipt.

Reply *0* for menu`,

  "payment.send_image": `📸 *Send Receipt*

Please send a *photo/screenshot* of your payment receipt.

Reply *0* for menu`,

  "payment.receipt_received": `✅ *Receipt Received!*

📝 {description}
💰 Amount: {amount}

Your receipt has been submitted for verification. We'll notify you once it's reviewed.

Reply *0* for menu`,

  "payment.upload_error": `❌ *Upload Failed*

We couldn't upload your receipt. Please try again.

Reply *0* for menu`,

  "payment.approved": `✅ *Payment Verified!*

Your payment for {description} (PKR {amount}) has been verified and marked as paid.

Reply *0* for menu`,

  "payment.rejected": `❌ *Receipt Not Accepted*

Your receipt for {description} was not accepted.

📝 Reason: {reason}

Please submit a valid receipt again.

Reply *0* for menu`,

  // === Back Navigation ===
  "nav.back_complaint_sub_building": `🔙 *Going Back*

🏢 *Building Complaint*

1. 🛗 Lift/Elevator
2. 💪 Gym
3. 🎱 Snooker Room
4. 🎮 Play Area
5. 🚗 Parking
6. 🔒 Security Complaint
7. 🔧 Plumbing
8. ⚡ Electric
9. 🔨 Civil
10. 🤝 Collaboration Corner
11. 🪑 Seating Area
12. 📋 Other

Reply with number, or *B* to go back`,

  "nav.back_complaint_sub_apartment": `🔙 *Going Back*

🏠 *Apartment Complaint*

1. 🔧 Plumbing
2. ⚡ Electric
3. 🔨 Civil
4. 🅿️ My Parking Complaint
5. 🔧 Other

Reply with number, or *B* to go back`,

  "nav.back_staff_add_name": `🔙 *Going Back*

Enter the staff member's full name:

*B* to go back, *0* for menu`,

  "nav.back_staff_add_phone": `🔙 *Going Back*

Enter the staff member's phone number:

*B* to go back`,

  "nav.back_staff_add_cnic": `🔙 *Going Back*

Enter the CNIC number:

*B* to go back`,

  "nav.back_staff_add_role": `🔙 *Going Back*

👔 *Select Staff Role*

1. 🚗 Driver
2. 👨‍🍳 Cook
3. 🧹 Maid
4. 🔧 Plumber
5. ⚡ Electrician
6. 🛠️ Maintenance
7. 🔒 Security Guard
8. 📋 Other (Specify)

Reply 1-8, or *B* to go back`,

  "nav.back_booking_date": `🔙 *Going Back*

Enter the date you'd like to book:

*B* to go back, *0* for menu`,

  "nav.back_hall_menu": `🔙 *Going Back*

🏛️ *Community Hall*

1. 📅 New Booking
2. ❌ Cancel Booking
3. ✏️ Edit Booking
4. 📋 View My Bookings

Reply 1-4, or *0* for menu`,

  "nav.back_hall_booking_date": `🔙 *Going Back*

Enter the date you'd like to book:

*B* to go back, *0* for menu`,

  "nav.back_visitor_name": `🔙 *Going Back*

🎫 *Visitor Entry Pass*

Enter the *visitor's name* ✍️

*B* to go back, *0* for menu`,

  "nav.back_visitor_car": `🔙 *Going Back*

🚗 Enter the visitor's *car number* (license plate).

*B* to go back, *0* for menu`,

  "nav.back_payment_type": `🔙 *Going Back*

💳 *Submit Payment*

What are you paying for?

1. 💰 Maintenance
2. 🏛️ Hall Booking

Reply 1-2, or *0* for menu`,
}
