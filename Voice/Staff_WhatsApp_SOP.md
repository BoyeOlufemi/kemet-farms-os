# Kemet Farms OS — WhatsApp Staff SOP
**Channel:** WhatsApp Business  
**Send/receive:** Kemet Bot ↔ field staff  
**Rule:** 1 action = 1 reply. Keep every outbound message under 2 sentences.

---

## Daily Task Message
**Template:**
🌹 Kemet daily task: `{{action_type}}` on `{{crop_type}}` at `{{field_id}}`.
Reply **done** when complete, or **conflict** if blocked.

**Example:**
🌴 Task ready for field-1: weed ring clearance for Palm seedlings.
Reply **done** when complete, or **conflict** if blocked.

---

## Confirmation Reply
**Template:**
✅ `{{crop_type}}` action confirmed for `{{field_id}}`. Next: `{{next_action}}`.

**Example:**
✅ Palm action confirmed for field-1. Next: monthly weed ring check.

---

## Conflict Reply
**Template:**
⚠️ Conflict logged for `{{field_id}}` (`{{crop_type}}`). A supervisor will review.
Reply **status** for an update.

---

## Rain/Weather Alert
**Template:**
🌧️ Rain alert for `{{field_id}}`: `{{rain_mm}}mm+ expected in the next hour`. Hold fertilizer and irrigation for `{{hold_hours}}` hours.

**Example:**
🌧 Rain alert for field-1: 12mm expected in the next hour. Hold fertilizer and irrigation for 2 hours.

---

## Heat Alert
**Template:**
🌡️ Heat alert for `{{field_id}}`: temp above `{{temp_c}}`C. Increase hydration checks for `{{crop_type}}` rows.

**Example:**
🌡 Heat alert for field-1: temp above 36C. Increase hydration checks for soybean rows.

---

## Unsubscribe / Stop
If staff reply **stop** or **unsubscribe**:
- Bot replies once: “You have been removed from WhatsApp alerts. Contact the farm office to reactivate.”
- Supabase logs message but does not send further automated messages to that number until reactivated.

---

## Status Check
If staff reply **status**:
- Bot looks up recent `kemet_crop_logs` for `crop_type` + `field_id`
- Reply format: “Last action for `{{crop_type}}` at `{{field_id}}` was `{{last_action}}` on `{{recorded_at}}`.”

---

## Transmission Rules
- Plain text only
- No jargon. Phrase all instructions as actions and replies
- No images/videos unless explicitly requested by the farm manager
- Keep every outbound message under 2 sentences
