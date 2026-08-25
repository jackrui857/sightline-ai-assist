export type VoiceCommand =
  | "startScan"
  | "stopScan"
  | "replay"
  | "location"
  | "time"
  | "newNote"
  | "unknown";

export function matchVoiceCommand(transcript: string): VoiceCommand {
  const value = transcript.replace(/[，。！？、\s]/g, "");
  if (value.includes("開始掃描") || value.includes("啟動掃描")) return "startScan";
  if (value.includes("停止掃描") || value.includes("停止相機")) return "stopScan";
  if (value.includes("重播結果") || value.includes("再說一次")) return "replay";
  if (value.includes("查看位置") || value.includes("我的位置") || value.includes("目前位置")) return "location";
  if (value.includes("報讀時間") || value.includes("現在幾點") || value.includes("目前時間")) return "time";
  if (value.includes("新增記事") || value.includes("新增筆記") || value.includes("記錄事項")) return "newNote";
  return "unknown";
}

export const voiceCommandLabels: Record<Exclude<VoiceCommand, "unknown">, string> = {
  startScan: "開始掃描",
  stopScan: "停止掃描",
  replay: "重播結果",
  location: "查看位置",
  time: "報讀時間",
  newNote: "新增記事",
};
