# Kemet Farms OS — Database Schema

```sql
CREATE TABLE kemet_crop_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_type VARCHAR(50) CHECK (crop_type IN ('PALM', 'SOYBEAN')),
    action_taken TEXT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```
