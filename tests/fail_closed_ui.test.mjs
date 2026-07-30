import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adviceSource = readFileSync(
  new URL("../src/components/AiAssistantSidebar.tsx", import.meta.url),
  "utf8",
);
const weatherSource = readFileSync(
  new URL("../src/components/WeatherTriggerPanel.tsx", import.meta.url),
  "utf8",
);

test("AI UI does not invent fallback agronomic recommendations", () => {
  assert.doesNotMatch(adviceSource, /getFallbackChatReply|generateFallbackAdvice/);
  assert.doesNotMatch(adviceSource, /correlation coefficient is/);
  assert.doesNotMatch(adviceSource, />LIVE</);
  assert.match(adviceSource, /No operational recommendation was generated/);
  assert.match(adviceSource, /REVIEW REQUIRED/);
});

test("weather UI fails closed when the live source is unavailable", () => {
  assert.doesNotMatch(weatherSource, /Math\.random|fallback simulated telemetry/);
  assert.doesNotMatch(weatherSource, /alerts dispatched to staff/i);
  assert.match(weatherSource, /no forecast or operational trigger was generated/i);
  assert.match(weatherSource, /No external WhatsApp message was sent/);
});
