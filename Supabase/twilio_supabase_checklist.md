# Kemet Farms OS — Twilio + Supabase Connection Checklist
**Status:** Pre-flight for live WhatsApp weather alerts and crop log persistence

---

## Supabase
**Project ref:** `ohxjkbpkonfbaalldqqw`
**Publishable key provided:** `<SUPABASE_ANON_KEY>` — stored in n8n/Supabase node credentials; redacted from repo

### Step 1 — Apply schema
1. Open Supabase dashboard: https://supabase.com/dashboard/project/ohxjkbpkonfbaalldqqw/editor
2. Go to **SQL Editor**
3. Paste contents of `Supabase/kemet_crop_logs_schema.sql`
4. Click **Run**
5. Confirm tables exist:
   - `kemet_crop_logs`
   - `kemet_whatsapp_messages`
   - `kemet_weather_triggers`

### Step 2 — Get connection credentials
1. Go to **Project Settings > API**
2. Copy:
   - `URL`: `https://ohxjkbpkonfbaalldqqw.supabase.co`
   - `anon` / `public` key
   - `service_role` key
3. In **Project Settings > Database**, copy:
   - Host: `db.ohxjkbpkonfbaalldqqw.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: `<copy from dashboard>`

> Security note: Never expose `service_role` key in client-side code or public repos.

### Step 3 — Configure n8n Supabase node
- **Host:** `db.ohxjkbpkonfbaalldqqw.supabase.co`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `<from step 2>`
- **SSL:** enabled

Alternatively, use Supabase PostgREST API in n8n HTTP Request node with the `anon` key:
- URL: `https://ohxjkbpkonfbaalldqqw.supabase.co/rest/v1/kemet_weather_triggers`
- Header: `apikey: <anon key>`
- Header: `Authorization: Bearer <anon key>`

---

## Twilio WhatsApp Sandbox
**Sandbox number:** `+1415 52 38 886`

### Step 1 — Join sandbox
1. Open Twilio Console: https://console.twilio.com
2. Go to **Messaging > Try it Out > WhatsApp Sandbox**
3. From the staff member's WhatsApp, send the join code to `+1415 52 38 886`
4. Code shown in sandbox settings: send that exact message
5. Staffs who join are now verified for the sandbox

### Step 2 — Get credentials
From Twilio Console:
- **Account SID:** `AC...`
- **Auth Token:** `<token>`

In n8n Twilio node:
- **Authentication:** Access Token SID / Auth Token
- **Account SID:** `AC...`
- **Auth Token:** `<token>`

### Step 3 — Configure webhook
When a staff member sends a WhatsApp message to the sandbox, Twilio needs to forward it to n8n.

1. In Twilio Console > **Messaging > Sandbox > When a message comes in**:
   - Set webhook URL to your n8n instance:
     - Local/ngrok: `https://<your-ngrok-domain>/webhook/kemet-whatsapp`
2. HTTP method: `POST`
3. Save

> For local testing, expose n8n via ngrok: `ngrok http 5678`, then use the https ngrok URL.

---

## Open-Meteo
**No API key required**

Base URL: `https://api.open-meteo.com/v1/forecast`

Parameters:
- `latitude=7.6244`
- `longitude=4.7410`
- `daily=temperature_2m_max,temperature_2m_min,rain_sum,et0_fao_evapotranspiration,shortwave_radiation_sum`
- `timezone=Africa/Lagos`

Verified working: `/Users/biijaysaccount/Documents/ExoCore Infrastructure/Project 2 - Kemet Farms OS/Workflows/kemet_weather_trigger.json`

---

## n8n Environment Variables
Recommended local `.env` or n8n vault keys:

```
SUPABASE_HOST=db.ohxjkbpkonfbaalldqqw.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=<fromdashboard>
SUPABASE_URL=https://ohxjkbpkonfbaalldqqw.supabase.co
SUPABASE_ANON_KEY=<anonsupabasekey>
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=<authtoken>
TWILIO_WHATSAPP_NUMBER=+14155238886
OPEN_METEO_LATITUDE=7.6244
OPEN_METEO_LONGITUDE=4.7410
OPEN_METEO_TIMEZONE=Africa/Lagos
KEMET_FIELD_ID=field-1
```

---

## Verification Checklist
- [ ] Supabase schema applied without errors
- [ ] `kemet_crop_logs` table accepts insert
- [ ] `kemet_weather_triggers` table accepts insert
- [ ] Twilio WhatsApp sandbox joined from test staff number
- [ ] Twilio webhook points to live n8n
- [ ] n8n receives Twilio inbound POST at `/webhook/kemet-whatsapp`
- [ ] n8n Supabase node can insert into `kemet_whatsapp_messages`
- [ ] Open-Meteo request returns `200` with daily arrays
- [ ] Weather trigger inserts a row in `kemet_weather_triggers`
- [ ] Staff receives WhatsApp reply from `+1415 52 38 886`

---

## Known Limitations
- Sandbox requires active join per staff number before sending
- Open-Meteo free tier has rate limits; hourly checks should stay within limits
- Soil moisture variables are not exposed by Open-Meteo in this setup; water balance uses `rain_sum - et0_fao_evapotranspiration` instead
