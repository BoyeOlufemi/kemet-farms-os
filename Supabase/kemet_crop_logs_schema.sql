CREATE TABLE IF NOT EXISTS kemet_crop_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id TEXT NOT NULL,
    crop_type TEXT NOT NULL CHECK (crop_type IN ('PALM', 'SOYBEAN')),
    action_type TEXT NOT NULL,
    action_status TEXT NOT NULL DEFAULT 'todo',
    staff_id TEXT,
    weather_trigger_id TEXT,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS kemet_whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body TEXT NOT NULL,
    crop_log_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kemet_weather_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
