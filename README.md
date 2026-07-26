# Kemet Farms OS

Prototype WhatsApp-driven field-ops system for palm and soybean crop management.

**Status:** prototype/demo-ready, not production-verified.
**Production prerequisite:** pass the verification checklist in `Supabase/twilio_supabase_checklist.md` before live use.

## Stack
- **Comms:** Twilio WhatsApp sandbox
- **Backend/DB:** Supabase `ohxjkbpkonfbaalldqqw`
- **Automation:** n8n workflows
- **Weather:** Open-Meteo (`Africa/Lagos`, Ilesha coordinates)
- **Ops docs:** voice / SOPs in `Voice/`

## Repo Layout
| Folder/File | Purpose | Notes |
|---|---|---|
| `Workflows/` | n8n workflow JSON | Commit |
| `Supabase/` | Schema + pre-flight checklist | Contains public project ref only; no secrets |
| `Voice/` | Staff SOPs and outreach macros | Commit |
| `Instructions/` | Crop schedule and runbooks | Commit |
| `References/` | Architecture notes | Commit |
| `Examples/` | Usage examples/reference | Commit |
| `Notes/` | Design notes | Commit |
| `Simulator/` | Screenshots, simulator HTML, generated videos, temp build scripts | **Gitignored** |
| `.gitignore` | Ensures no screenshots, videos, build scripts, secrets are committed | Commit |

## Quickstart
1. Apply schema in `Supabase/kemet_crop_logs_schema.sql` to Supabase project `ohxjkbpkonfbaalldqqw`
2. Join Twilio WhatsApp sandbox from staff number
3. Import workflows from `Workflows/` into local n8n
4. Run verification checklist in `Supabase/twilio_supabase_checklist.md`

## Security
- Do not commit database passwords or connection credentials
- Do not commit Twilio Account SID / Auth Token
- Do not commit Supabase service-role key
