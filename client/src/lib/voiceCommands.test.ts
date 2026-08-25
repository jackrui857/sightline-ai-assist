import { describe, expect, it } from "vitest";
import { matchVoiceCommand } from "./voiceCommands";

describe("matchVoiceCommand", () => {
  it("辨識六項繁體中文的無障礙操作指令", () => {
    expect(matchVoiceCommand("請幫我開始掃描")).toBe("startScan");
    expect(matchVoiceCommand("停止掃描")).toBe("stopScan");
    expect(matchVoiceCommand("重播結果")).toBe("replay");
    expect(matchVoiceCommand("查看位置")).toBe("location");
    expect(matchVoiceCommand("現在幾點")).toBe("time");
    expect(matchVoiceCommand("新增記事")).toBe("newNote");
  });

  it("無法辨識的語句不會觸發任何操作", () => {
    expect(matchVoiceCommand("播放音樂")).toBe("unknown");
  });
});
