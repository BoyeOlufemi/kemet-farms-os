import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Route: Gemini AI Agricultural Operations Manager SOP Generator
  app.post("/api/sop/consult", async (req, res) => {
    try {
      const { prompt, cropType, fieldName, scenario } = req.body;

      if (!prompt && !scenario) {
        return res.status(400).json({ 
          error: "A prompt or scenario specification is required." 
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY is not configured in the environment.",
          fallbackNotice: "Using local cached organic SOP reference guidelines."
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

      const sopText = response.text || "No SOP response generated from AI model.";

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
      console.error("Error generating SOP via Gemini API:", err);
      return res.status(500).json({
        error: "Failed to generate SOP using AI operations engine.",
        details: err?.message || String(err)
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
