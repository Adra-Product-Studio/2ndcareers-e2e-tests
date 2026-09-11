// @ts-check

/**
 * Generates one unique dummy persona (name/city/years of experience/summary) per signup-flow
 * run via the Anthropic API, so repeated runs don't all create the exact same "Playwright
 * Tester, New York" account. Falls back to a local randomized persona (no network call) when
 * ANTHROPIC_API_KEY isn't set, or if the API call itself fails/times out for any reason - a run
 * should never hard-fail just because an AI call didn't come back.
 */

const FIRST_NAMES = ["Alex", "Jordan", "Priya", "Wei", "Fatima", "Liam", "Sofia", "Noah", "Amara", "Diego", "Hana", "Kwame"];
const LAST_NAMES = ["Chen", "Garcia", "Patel", "Kim", "Muller", "Silva", "Novak", "Ibrahim", "Rossi", "Tanaka", "Okafor", "Nilsson"];
const CITIES = [
  "Berlin, Germany", "Toronto, Canada", "Singapore", "Nairobi, Kenya", "Auckland, New Zealand",
  "Lisbon, Portugal", "Seoul, South Korea", "Dublin, Ireland", "Mexico City, Mexico", "Cape Town, South Africa",
  "Amsterdam, Netherlands", "Melbourne, Australia",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFallbackProfile(reason) {
  return {
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    city: pick(CITIES),
    yearsOfExperience: 1 + Math.floor(Math.random() * 30),
    aiSummary: `Randomly generated fallback persona (${reason}).`,
    aiGenerated: false,
  };
}

/** @returns {Promise<{firstName: string, lastName: string, city: string, yearsOfExperience: number, aiSummary: string, aiGenerated: boolean}>} */
async function generateAiProfile() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return randomFallbackProfile("ANTHROPIC_API_KEY not set");

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content:
              "Invent one realistic, unique test persona for an e2e signup test on a professional " +
              "networking platform aimed at experienced professionals starting a second career. " +
              "Vary the country/city and background every time you're asked - don't default to " +
              "the same place. Return ONLY a compact JSON object, no prose, no markdown fences, " +
              'with exactly these keys: {"first_name": string, "last_name": string, ' +
              '"city": string (a real "City, Country"), "years_of_experience": integer between 5 ' +
              'and 35, "profile_summary": string (one sentence describing this persona\'s career ' +
              "background and what they're looking for next)}",
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Anthropic API responded ${response.status}`);
    const data = await response.json();
    const text = data?.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON object found in AI response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.first_name || !parsed.last_name || !parsed.city) throw new Error("AI response missing required fields");

    return {
      firstName: String(parsed.first_name),
      lastName: String(parsed.last_name),
      city: String(parsed.city),
      yearsOfExperience: Number.isFinite(Number(parsed.years_of_experience)) ? Math.round(Number(parsed.years_of_experience)) : 5,
      aiSummary: String(parsed.profile_summary || ""),
      aiGenerated: true,
    };
  } catch (error) {
    return randomFallbackProfile(error?.message || "AI call failed");
  } finally {
    clearTimeout(timeoutHandle);
  }
}

module.exports = { generateAiProfile };
