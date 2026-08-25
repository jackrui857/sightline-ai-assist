import { describe, expect, it } from "vitest";
import { parseSceneReport } from "./sceneAnalysis";

describe("parseSceneReport", () => {
  it("保留可供語音報讀的結構化繁體中文環境回報", () => {
    const result = parseSceneReport(JSON.stringify({
      overview: "室內走道前方可見一張桌子。",
      objects: ["桌子", "椅子"],
      obstacles: ["走道中的椅腳"],
      actions: ["放慢腳步並確認走道空間"],
      risk: "medium",
      safetyNote: "請以現場狀況與既有導盲工具為準。",
    }));

    expect(result.risk).toBe("medium");
    expect(result.objects).toEqual(["桌子", "椅子"]);
    expect(result.obstacles).toEqual(["走道中的椅腳"]);
  });

  it("把非預期的風險等級降為需要確認，並限制清單長度", () => {
    const result = parseSceneReport(JSON.stringify({
      overview: "畫面資訊有限。",
      objects: ["一", "二", "三", "四", "五", "六"],
      obstacles: [],
      actions: ["確認", "使用導盲工具", "留意號誌", "不應保留"],
      risk: "safe",
      safetyNote: "請自行確認。",
    }));

    expect(result.risk).toBe("unknown");
    expect(result.objects).toHaveLength(5);
    expect(result.actions).toHaveLength(3);
  });
});
