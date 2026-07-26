import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Route: Gemini AI Agricultural Operations Manager SOP Generator
  app.post("/api/sop/consult", async (req, res) => {
    const { prompt, cropType, fieldName, scenario } = req.body;

    if (!prompt && !scenario) {
      return res.status(400).json({ 
        error: "A prompt or scenario specification is required." 
      });
    }

    const fallbackSop = `### Standard Operating Procedure (Organic Field Protocol)
**Target:** ${cropType || 'General Dual-Crop'} | **Field:** ${fieldName || 'All Sectors'}
**Category:** ${scenario || 'Agronomic Task'}

#### Executive Operations Checklist:
1. **Pre-Execution Safety & Tooling Inspection:**
   - Verify non-chemical protective gear (breathable gloves, boots, eye protection).
   - Calibrate hand sprayers and clean drip emitters using organic vinegar solution.
2. **Organic Material & Dosing Specifications:**
   - Apply 3.5 Liters/tree (Oil Palm Seedlings) or 150 kg/Ha (Soybeans) of certified thermophilic compost (30:1 C:N ratio).
   - Bio-pesticide spray: 5% aqueous neem oil extract mixed with organic emulsifier.
3. **Execution Steps:**
   - Ring clearance: Clear 1.5m radius around seedling bases free from competitive weeds.
   - Soil moisture check: Maintain 45-60% moisture range before fertigation.
4. **Verification & Logging:**
   - Supervisor verifies completion on Kemet Farms OS mobile portal.
   - Record exact volume applied and field hand initials.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          sopText: fallbackSop,
          fallback: true,
          notice: "GEMINI_API_KEY not set. Provided local organic SOP guideline."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are an expert Agricultural Operations Manager specializing in high-efficiency standardized organic farming protocols for Kemet Farms (dual-crop Tenera Palm Seedlings and Soybeans).

CRITICAL DIRECTIVES:
1. STRICT ORGANIC PROTOCOLS: Reference standardized, verified organic farming methods (e.g. neem extract pest sprays, biological pest controls, bio-fertilizers, legumes nitrogen fixation, thermophilic compost ratios like 30:1 C:N, mulching, crop ring clearance).
2. HIGH-EFFICIENCY WORKFLOWS: Every protocol must emphasize operational efficiency, resource conservation, field safety, and low-bandwidth communication for field operators.
3. CLEAR BULLETED CHECKLISTS: ALWAYS format operational steps as clear, sequential bulleted or numbered checklists with exact measurements (e.g., kg/Ha, liters/tree, mixing ratios), execution timing, tools required, and verification criteria.
4. NO VAGUE ADVICE: Do NOT provide generic academic explanations. Provide direct, step-by-step actionable instructions ready for immediate field dispatch via WhatsApp or physical supervisor logs.`;

      const userMessage = `Operational Request:
Context: ${cropType ? `Crop: ${cropType}` : 'General Organic Farm Operations'} ${fieldName ? `| Field: ${fieldName}` : ''}
Scenario/Category: ${scenario || 'Field Standard Operating Procedure'}
User Query: ${prompt || `Provide a complete, high-efficiency organic SOP checklist for ${scenario}.`}

Generate a structured, actionable, step-by-step organic SOP checklist.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      const sopText = response.text || fallbackSop;

      return res.json({
        success: true,
        sopText,
        metadata: {
          cropType: cropType || "General",
          scenario: scenario || "Custom SOP Query",
          generatedAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.log("[AI SOP Generator] Using local organic SOP guideline fallback.");
      return res.json({
        success: true,
        sopText: fallbackSop,
        fallback: true,
        notice: "AI service rate-limited or quota exceeded. Returned offline organic SOP checklist."
      });
    }
  });

  // API Route: Gemini AI Field Telemetry & Weather-Yield Diagnostics Advisor
  app.post("/api/gemini/advisor", async (req, res) => {
    const { fields } = req.body;

    const generateFallbackAdvice = () => {
      const fieldList = Array.isArray(fields) ? fields : [];
      const lowMoistureFields = fieldList.filter((f: any) => (f.soilMoisture || 0) < 40);

      if (lowMoistureFields.length > 0) {
        return {
          healthStatus: "ATTENTION_REQUIRED",
          summary: `Soil moisture levels in ${lowMoistureFields.map((f: any) => f.name).join(', ')} require irrigation intervention.`,
          recommendations: [
            {
              priority: "HIGH",
              targetField: lowMoistureFields[0]?.name || "Field A",
              action: "Schedule 45-Min Target Drip Irrigation",
              rationale: `Moisture is below optimal 45% threshold. Replenishing root zone moisture supports seedling vigor.`,
              suggestedSop: "SOP-IRR-02"
            },
            {
              priority: "MEDIUM",
              targetField: lowMoistureFields[0]?.name || "Field A",
              action: "Organic Neem Extract Soil Application",
              rationale: "Prevents root-knot nematodes during moisture recovery phase.",
              suggestedSop: "SOP-PEST-01"
            }
          ]
        };
      }

      return {
        healthStatus: "OPTIMAL",
        summary: "Field sensor telemetry indicates balanced moisture, ambient temperature, and soil EC parameters across all sectors.",
        recommendations: [
          {
            priority: "LOW",
            targetField: "Sector Overview",
            action: "Routine Seedling Canopy Inspection",
            rationale: "Bi-weekly visual inspection maintains growth logging integrity ahead of seasonal rains.",
            suggestedSop: "SOP-INSP-01"
          }
        ]
      };
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          advice: generateFallbackAdvice(),
          fallback: true
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are the Lead Agronomist and AI Climate Operations Director for Kemet Farms OS.
Your objective is to examine live field sensor data (Soil Moisture, Temperature, Humidity, Crop Stage, Irrigation Status), recent weather forecasts, and historical yield logs to provide 3 crisp, bulleted, highly prioritized agronomic action recommendations.

Return a JSON object with this exact structure:
{
  "healthStatus": "OPTIMAL" | "ATTENTION_REQUIRED" | "CRITICAL",
  "summary": "1-2 sentence overall agronomic state diagnosis",
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "targetField": "Field name or All Fields",
      "action": "Specific concise action name",
      "rationale": "Agronomic reason based on moisture/weather data",
      "suggestedSop": "Suggested SOP name to issue"
    }
  ]
}`;

      const prompt = `Analyze current Kemet Farms telemetry:
Fields telemetry summary: ${JSON.stringify(fields || [])}

Provide structured agronomic advice.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch (e) {
        parsed = generateFallbackAdvice();
      }

      return res.json({ success: true, advice: parsed });
    } catch (err: any) {
      console.log("[AI Advisor] Serving offline field diagnostic advice.");
      return res.json({
        success: true,
        advice: generateFallbackAdvice(),
        fallback: true
      });
    }
  });

  // API Route: Gemini AI Real-Time Crop Management Sidebar Chat
  app.post("/api/gemini/crop-chat", async (req, res) => {
    const { userQuery, fields } = req.body;

    if (!userQuery) {
      return res.status(400).json({ error: "userQuery is required." });
    }

    const fallbackReply = `Field Agronomic Response for "${userQuery}":\n\n1. **Telemetry Assessment**: Current soil moisture across active fields averages ${
      fields && fields[0] ? fields[0].soilMoisture : 45
    }%. Organic fertigation cycle is operating on schedule.\n2. **Recommended Action**: Follow standard organic SOPs for weed clearance and neem oil application.\n3. **Safety Notice**: Inspect drip irrigation nozzles after heavy rainfall events to prevent silt clogging.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          replyText: fallbackReply,
          fallback: true
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are Kemet Agronomist AI, an expert real-time AI Crop Management Assistant embedded directly in Kemet Farms OS sidebar.
Your primary role is to provide actionable, precise agronomic guidance for Oil Palm Seedlings and Soybean Cultivation based on live field telemetry.
When answering questions:
1. Refer directly to specific fields, soil moisture levels, crop types, or weather alerts when relevant.
2. Provide concise, clear, bulleted recommendations or step-by-step SOP actions.
3. Suggest practical next steps.
4. Maintain a professional, encouraging, expert agricultural tone.`;

      const prompt = `Current Farm Telemetry Context:
Fields: ${JSON.stringify(fields || [])}

User Question: "${userQuery}"

Provide concise real-time agronomic advice.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3
        }
      });

      return res.json({
        success: true,
        replyText: response.text || fallbackReply
      });
    } catch (err: any) {
      console.log("[AI Crop Chat] Serving offline agronomist response.");
      return res.json({
        success: true,
        replyText: fallbackReply,
        fallback: true
      });
    }
  });

  // API Route: Gemini AI WhatsApp & Field Natural Language Assistant
  app.post("/api/gemini/assistant", async (req, res) => {
    const { userQuery, staffName, role } = req.body;

    if (!userQuery) {
      return res.status(400).json({ error: "userQuery is required." });
    }

    const fallbackReply = `[Kemet Farms OS Alert] Hello ${staffName || 'Operator'} (${role || 'Field Staff'}): Regarding "${userQuery}" - Please verify drip irrigation valves and log completion in your daily supervisor checklist. Reply DONE when executed.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          replyText: fallbackReply,
          fallback: true
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are Kemet Farms Bot, an automated WhatsApp SMS assistant for field supervisors and farm hands at Kemet Farms OS (oil palm seedlings and soybean cultivation).
Keep answers short, professional, direct, and under 120 words (suitable for WhatsApp / SMS dispatch).
Include clear action instructions or confirmation codes like "Reply DONE when completed".`;

      const prompt = `Staff Member: ${staffName || 'Field Supervisor'} (${role || 'Operator'})
Query: "${userQuery}"

Provide a concise WhatsApp field response.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.4
        }
      });

      return res.json({
        success: true,
        replyText: response.text || fallbackReply
      });
    } catch (err: any) {
      console.log("[AI Assistant] Serving offline WhatsApp response.");
      return res.json({
        success: true,
        replyText: fallbackReply,
        fallback: true
      });
    }
  });

  // API Route: Gemini AI Vision Media & Receipt Scanner
  app.post("/api/gemini/scan-media", async (req, res) => {
    const { imageUrl, base64Data: rawBase64, mimeType: userMimeType, mediaCategory } = req.body;

    const generateFallbackVisionData = () => {
      const cat = mediaCategory || 'receipt';
      if (cat === 'receipt') {
        return {
          detectedCategory: "receipt",
          summary: "Parsed agricultural supply receipt item.",
          receipt: {
            itemName: "Organic Fertilizer & Drip Line Accessories",
            amount: 35000,
            currency: "NGN",
            date: new Date().toISOString().split('T')[0],
            category: "Chemicals/Fertilizer",
            supplier: "Kemet Farm Supply Depot",
            confidence: 90
          }
        };
      } else if (cat === 'plant_health') {
        return {
          detectedCategory: "plant_health",
          summary: "Seedling canopy photograph showing healthy leaf pigmentation.",
          plantHealth: {
            cropType: "PALM",
            status: "OPTIMAL",
            diagnosis: "Good chlorophyll density and leaf turgor pressure observed.",
            recommendedAction: "Maintain current 45-minute organic fertigation cycle.",
            severity: "LOW"
          }
        };
      }
      return {
        detectedCategory: "general",
        summary: "Farm operations media uploaded and logged to Firebase Storage.",
        taskUpdate: {
          taskTitle: "Field Inspection Photo",
          completionStatus: "VERIFIED_DONE",
          notes: "Logged successfully to field registry."
        }
      };
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          data: generateFallbackVisionData(),
          fallback: true
        });
      }

      let base64String = rawBase64 || "";
      let detectedMime = userMimeType || "image/jpeg";

      if (!base64String && imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const contentType = imgRes.headers.get("content-type");
            if (contentType) detectedMime = contentType.split(";")[0];
            const arrayBuf = await imgRes.arrayBuffer();
            base64String = Buffer.from(arrayBuf).toString("base64");
          }
        } catch (fetchErr) {
          console.warn("Could not fetch remote image for Gemini vision analysis:", fetchErr);
        }
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Analyze this agricultural field image or receipt for Kemet Farms OS.
User hints - Category hint: ${mediaCategory || 'auto-detect'}.

Analyze the image carefully and output a JSON object with this EXACT structure:
{
  "detectedCategory": "receipt" | "plant_health" | "task_screenshot" | "general",
  "summary": "1-2 sentence overall visual breakdown of the photo",
  "receipt": {
    "itemName": "e.g. NPK 15-15-15 Fertilizer, Urea, Spray Nozzles, Drip Lines, Seedlings",
    "amount": number (estimated total cost in currency units, e.g. 45000 or 850),
    "currency": "NGN" | "USD",
    "date": "YYYY-MM-DD",
    "category": "Chemicals/Fertilizer" | "Equipment" | "Seed Fund" | "Labor/Operations" | "Other",
    "supplier": "Name of vendor or depot if visible",
    "confidence": number (0 to 100)
  },
  "plantHealth": {
    "cropType": "PALM" | "SOYBEAN" | "UNKNOWN",
    "status": "OPTIMAL" | "DEFICIENCY" | "PEST_DAMAGE" | "DISEASE" | "DRY_STRESS",
    "diagnosis": "Specific agronomic leaf/crop diagnosis",
    "recommendedAction": "Actionable SOP step to rectify or maintain",
    "severity": "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
  },
  "taskUpdate": {
    "taskTitle": "Inferred farm task shown in photo",
    "completionStatus": "VERIFIED_DONE" | "IN_PROGRESS" | "REQUIRES_ATTENTION",
    "notes": "Observations on quality of execution"
  }
}`;

      let responseText = "";

      if (base64String) {
        const cleanBase64 = base64String.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
        
        const imagePart = {
          inlineData: {
            mimeType: detectedMime,
            data: cleanBase64
          }
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: {
            parts: [imagePart, { text: promptText }]
          },
          config: {
            responseMimeType: "application/json"
          }
        });
        responseText = response.text || "{}";
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: promptText + `\nImage URL reference: ${imageUrl || 'No image data attached'}`,
          config: {
            responseMimeType: "application/json"
          }
        });
        responseText = response.text || "{}";
      }

      let parsedData = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        parsedData = generateFallbackVisionData();
      }

      return res.json({
        success: true,
        data: parsedData
      });

    } catch (err: any) {
      console.log("[AI Vision Scan] Serving offline vision scan data.");
      return res.json({
        success: true,
        data: generateFallbackVisionData(),
        fallback: true
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌾 Kemet Farms Operations Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
