# Firebase Security Specification & TDD Suite

## Data Invariants
1. A CropLog must belong to a valid field (`field_id`) and valid staff member (`staff_id`).
2. An inbound or outbound WhatsApp message must have a valid body size (<= 1000 chars) and sender/recipient numbers.
3. Fields, Staff, CropLogs, WeatherTriggers, and Messages must have valid ID string formats (`^[a-zA-Z0-9_\\-]+$`).
4. Timestamps must be valid strings.

## The "Dirty Dozen" Payload Test Cases
1. **Unauthenticated Write**: Attackers attempting to write to `/fields/field-1` without auth.
2. **Resource Poisoning**: Injecting a 20KB oversized string into `/fields/field-1/name`.
3. **Invalid ID Injection**: Passing invalid characters like `/fields/field$$1/` in document IDs.
4. **Invalid Enum**: Setting `crop_type` in `/fields/field-1` to `CORN` instead of `PALM` or `SOYBEAN`.
5. **Staff Role Spoofing**: Overwriting staff status with unauthorized fields.
6. **Ghost Key Injection**: Adding unwanted root fields (`isSystemAdmin: true`) to `/cropLogs/log-1`.
7. **Invalid Direction Enum**: Setting `direction` in `/messages/msg-1` to `broadcast`.
8. **Negative Soil Moisture**: Setting `soilMoisture` to invalid numerical ranges.
9. **Corrupt Trigger Type**: Setting `trigger_type` in `/weatherTriggers/trig-1` to `TSUNAMI`.
10. **Oversized Notes**: Sending 10,000 character notes in `/cropLogs/log-1`.
11. **Malformed Phone Number**: Setting `phone` to a 500-char string in `/staff/staff-1`.
12. **Deletion Attack**: Unauthenticated deletion of `/fields/field-1`.

## Security Rules Specification
- `fields`: Allow read, create, update, delete for signed-in users with schema validation.
- `staff`: Allow read, create, update, delete for signed-in users with schema validation.
- `cropLogs`: Allow read, create, update, delete for signed-in users with schema validation.
- `messages`: Allow read, create, update, delete for signed-in users with schema validation.
- `weatherTriggers`: Allow read, create, update, delete for signed-in users with schema validation.
