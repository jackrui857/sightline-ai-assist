import { invokeLLM } from "./_core/llm";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type SceneReport = {
  overview: string;
  objects: string[];
  obstacles: string[];
  actions: string[];
  risk: RiskLevel;
  safetyNote: string;
};

const sceneSchema = {
  type: "object",
  properties: {
    overview: { type: "string", description: "繁體中文的簡短環境概述，最多 90 字" },
    objects: { type: "array", items: { type: "string" }, description: "可辨識的顯著物件，最多 5 項" },
    obstacles: { type: "array", items: { type: "string" }, description: "可能造成移動風險的可見障礙物，最多 4 項" },
    actions: { type: "array", items: { type: "string" }, description: "保守、可行的注意事項，最多 3 項" },
    risk: { type: "string", enum: ["low", "medium", "high", "unknown"] },
    safetyNote: { type: "string", description: "一句不超過 45 字的安全限制提醒" },
  },
  required: ["overview", "objects", "obstacles", "actions", "risk", "safetyNote"],
  additionalProperties: false,
} as const;

export function parseSceneReport(content: string): SceneReport {
  const parsed = JSON.parse(content) as SceneReport;
  const risk: RiskLevel = ["low", "medium", "high", "unknown"].includes(parsed.risk)
    ? parsed.risk
    : "unknown";

  return {
    overview: parsed.overview?.trim() || "無法判讀目前畫面。",
    objects: Array.isArray(parsed.objects) ? parsed.objects.filter(Boolean).slice(0, 5) : [],
    obstacles: Array.isArray(parsed.obstacles) ? parsed.obstacles.filter(Boolean).slice(0, 4) : [],
    actions: Array.isArray(parsed.actions) ? parsed.actions.filter(Boolean).slice(0, 3) : [],
    risk,
    safetyNote: parsed.safetyNote?.trim() || "請以現場實際狀況與既有導盲工具為準。",
  };
}

export async function analyzeSceneImage(imageDataUrl: string): Promise<SceneReport> {
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "你是繁體中文的視障輔助環境描述系統。僅描述畫面中可見或高度合理推測的資訊，不確定時要明確表達不確定。禁止說出『安全通過』、『可以過馬路』或任何保證安全的結論。行動建議必須保守，提醒使用者確認現場、使用既有導盲工具，且不要把 AI 結果當作唯一判斷依據。請只輸出符合指定結構的 JSON。",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "請分析這一張使用者主動拍攝的畫面，輸出可供語音報讀的繁體中文環境回報。" },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "accessible_scene_report",
        strict: true,
        schema: sceneSchema,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI 未回傳可讀取的環境分析結果。");
  }

  return parseSceneReport(content);
}
