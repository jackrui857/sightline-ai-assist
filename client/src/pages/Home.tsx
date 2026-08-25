import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Clock3,
  Headphones,
  Keyboard,
  LocateFixed,
  Mic,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { CameraPanel, type CameraControls } from "@/components/CameraPanel";
import { LocationPanel } from "@/components/LocationPanel";
import { NotesPanel } from "@/components/NotesPanel";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useVoiceFeedback } from "@/hooks/useVoiceFeedback";
import { type VoiceCommand } from "@/lib/voiceCommands";
import { trpc } from "@/lib/trpc";

type SceneReport = {
  overview: string;
  objects: string[];
  obstacles: string[];
  actions: string[];
  risk: "low" | "medium" | "high" | "unknown";
  safetyNote: string;
};

const quickCommands = ["開始掃描", "停止掃描", "重播結果", "查看位置", "報讀時間", "新增記事"];

const riskDetails = {
  low: { label: "較低風險", className: "border-[#8ae0cf] bg-[#12323b] text-[#eafff9]" },
  medium: { label: "中度注意", className: "border-[#fbd46d] bg-[#382e1a] text-[#fff2bb]" },
  high: { label: "提高警覺", className: "border-[#bc785b] bg-[#30211e] text-[#ffe4dc]" },
  unknown: { label: "需要確認", className: "border-[#56718e] bg-[#142b45] text-[#dce8f2]" },
};

function sceneToSpeech(scene: SceneReport) {
  return [
    `環境回報。${scene.overview}`,
    scene.objects.length ? `可辨識物件：${scene.objects.join("、")}。` : "未辨識到可明確報讀的物件。",
    scene.obstacles.length ? `可能需要注意：${scene.obstacles.join("、")}。` : "沒有辨識到明確的移動障礙物，但仍請留意現場。",
    scene.actions.length ? `行動注意事項：${scene.actions.join("、")}。` : "請持續以現場狀況與既有導盲工具為準。",
    `風險層級：${riskDetails[scene.risk].label}。${scene.safetyNote}`,
  ].join(" ");
}

export default function Home() {
  const cameraRef = useRef<CameraControls>(null);
  const [cameraStatus, setCameraStatus] = useState("尚未啟動");
  const [voiceStatus, setVoiceStatus] = useState("準備就緒");
  const [liveMessage, setLiveMessage] = useState("SightLine AI 已準備就緒。相機尚未啟動，位置功能等待您的同意。");
  const [lastTranscript, setLastTranscript] = useState("");
  const [scene, setScene] = useState<SceneReport | null>(null);
  const [lastNarration, setLastNarration] = useState("");
  const analyzeScene = trpc.scene.analyze.useMutation();
  const { isSupported: speechSupported, isSpeaking, isPaused, speak, togglePause } = useVoiceFeedback();

  const announce = useCallback((message: string, readAloud = true) => {
    setLiveMessage(message);
    if (readAloud) speak(message);
  }, [speak]);

  const handleScan = useCallback(async (imageDataUrl: string) => {
    try {
      const result = await analyzeScene.mutateAsync({ imageDataUrl });
      const report = result as SceneReport;
      const narration = sceneToSpeech(report);
      setScene(report);
      setLastNarration(narration);
      announce(`掃描完成。${report.overview}。風險層級為${riskDetails[report.risk].label}。`);
    } catch {
      const message = "AI 環境辨識未完成。請確認網路連線後再次嘗試，並以現場實際狀況與導盲工具為準。";
      announce(message);
      throw new Error(message);
    }
  }, [analyzeScene, announce]);

  const announceTime = useCallback(() => {
    const formatted = new Intl.DateTimeFormat("zh-TW", { dateStyle: "full", timeStyle: "short" }).format(new Date());
    announce(`目前本機時間是${formatted}。`);
  }, [announce]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    if (command === "startScan") {
      announce("已收到開始掃描指令。正在啟動相機並準備擷取一張畫面。請持續使用既有導盲工具並留意現場。");
      void (async () => {
        await cameraRef.current?.startCamera();
        await cameraRef.current?.captureFrame();
      })();
      return;
    }
    if (command === "stopScan") {
      cameraRef.current?.stopCamera();
      announce("已收到停止掃描指令，相機已停止。");
      return;
    }
    if (command === "replay") {
      announce(lastNarration || "目前沒有可重播的辨識結果。請先啟動相機並完成一次單次掃描。");
      return;
    }
    if (command === "time") {
      announceTime();
      return;
    }
    if (command === "location") {
      announce("已收到查看位置指令。位置功能需要您的明確同意，請使用目前位置按鈕取得位置。", false);
      scrollTo("location-section");
      return;
    }
    if (command === "newNote") {
      announce("已收到新增記事指令。請前往語音多媒體記事本開始口述記錄。", false);
      scrollTo("notes-section");
      return;
    }
    announce("抱歉，無法辨識這項語音指令。可說開始掃描、停止掃描、重播結果、查看位置、報讀時間或新增記事。");
  }, [announce, announceTime, lastNarration, scrollTo]);

  const onVoiceTranscript = useCallback((transcript: string) => {
    setLastTranscript(transcript);
    setVoiceStatus("已收到指令");
    setLiveMessage(`已聽到語音指令：${transcript}`);
  }, []);

  const onVoiceError = useCallback((message: string) => {
    setVoiceStatus("語音指令未啟動");
    announce(message);
  }, [announce]);

  const voiceCommand = useVoiceCommands({ onCommand: handleVoiceCommand, onTranscript: onVoiceTranscript, onError: onVoiceError });

  const statusItems = useMemo(() => [
    { label: "相機", value: cameraStatus, tone: cameraStatus.includes("啟動") || cameraStatus.includes("完成") ? "text-[#8ae0cf]" : "text-[#fbd46d]" },
    { label: "語音指令", value: voiceCommand.isListening ? "正在聆聽" : voiceStatus, tone: voiceCommand.isListening ? "text-[#8ae0cf]" : "text-[#b8c8d9]" },
    { label: "位置", value: "等待同意", tone: "text-[#b8c8d9]" },
  ], [cameraStatus, voiceCommand.isListening, voiceStatus]);

  const startVoiceCommand = () => {
    if (voiceCommand.isListening) {
      voiceCommand.stopListening();
      announce("已停止聆聽語音指令。", false);
    } else {
      setVoiceStatus("正在要求麥克風權限");
      announce("正在啟動語音指令。請在瀏覽器提示中選擇是否允許麥克風。", false);
      voiceCommand.startListening();
    }
  };

  return (
    <div className="min-h-screen pb-12 text-foreground">
      <a href="#main-content" className="skip-link">直接前往主要內容</a>

      <header className="mx-auto flex max-w-7xl flex-col gap-5 px-5 pb-7 pt-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl border border-[#fbd46d]/70 bg-[#fbd46d] text-[#071220] shadow-[0_0_35px_rgba(251,212,109,0.16)]"><Sparkles className="h-7 w-7" strokeWidth={2.5} /></div>
          <div><p className="section-eyebrow">視覺資訊，聲音優先</p><h1 className="display-serif mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">SightLine <span className="text-[#fbd46d]">AI</span></h1></div>
        </div>
        <div aria-label="系統狀態" className="flex flex-wrap gap-2">
          {statusItems.map(item => <div key={item.label} className="rounded-full border border-[#39516d] bg-[#0e1c30]/85 px-4 py-2 text-sm font-semibold"><span className="text-[#b8c8d9]">{item.label}：</span><span className={item.tone}>{item.value}</span></div>)}
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>

        <section aria-labelledby="intro-title" className="mb-7 grid gap-6 rounded-[2rem] border border-[#58708c]/65 bg-[#0d1d31]/80 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.2)] sm:p-9 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="section-eyebrow">即時無障礙協助</p>
            <h2 id="intro-title" className="display-serif mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">讓每一段移動，<span className="text-[#fbd46d]">多一層安心的聲音。</span></h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#d9e5f0]">透過攝影機、語音與位置資訊，將周遭環境整理成易懂的繁體中文回報。您可以說出指令、聽取重點，並隨時自行掌握操作狀態。</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => void cameraRef.current?.startCamera()} className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#fbd46d] px-6 text-lg font-extrabold text-[#071220] shadow-[0_10px_30px_rgba(251,212,109,0.18)] hover:bg-[#ffe49b]">開始環境掃描</button>
              <button onClick={startVoiceCommand} className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-[#8ae0cf] bg-[#0e2a38] px-6 text-lg font-extrabold text-[#f7fbff] hover:bg-[#123847]"><Mic className="h-6 w-6" aria-hidden="true" />啟動語音指令</button>
            </div>
          </div>
          <aside aria-label="立即使用說明" className="rounded-3xl border border-[#54718c] bg-[#091727]/75 p-5 sm:p-6">
            <div className="flex items-center gap-3 text-[#8ae0cf]"><Headphones className="h-6 w-6" aria-hidden="true" /><span className="font-extrabold">首次使用，請這樣開始</span></div>
            <ol className="mt-5 space-y-4 text-base text-[#e7f0f7]">
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fbd46d] text-sm font-extrabold text-[#071220]">1</span><span>啟動相機後，確認瀏覽器出現的權限提示。</span></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fbd46d] text-sm font-extrabold text-[#071220]">2</span><span>按下「單次掃描」，等待語音回報周遭重點。</span></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fbd46d] text-sm font-extrabold text-[#071220]">3</span><span>可說「重播結果」或使用鍵盤 Tab 操作各項控制。</span></li>
            </ol>
          </aside>
        </section>

        <div className="app-grid">
          <CameraPanel ref={cameraRef} onScan={handleScan} onStatusChange={status => { setCameraStatus(status); setLiveMessage(status); }} />

          <section aria-labelledby="report-title" className="panel-surface rounded-[1.75rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="section-eyebrow">AI 文字回報</p><h2 id="report-title" className="mt-1 text-2xl font-extrabold">辨識結果</h2></div><span className={`rounded-full border px-3 py-1 text-sm font-bold ${scene ? riskDetails[scene.risk].className : "border-[#56718e] bg-[#142b45] text-[#dce8f2]"}`}>{scene ? riskDetails[scene.risk].label : analyzeScene.isPending ? "分析中" : "等待掃描"}</span></div>
            <div className="mt-6 rounded-2xl border border-[#39516d] bg-[#071220]/65 p-5">
              <div className="flex items-center gap-3 text-[#8ae0cf]"><Volume2 className="h-6 w-6" aria-hidden="true" /><span className="font-extrabold">{scene ? "已取得環境回報" : "尚未產生環境回報"}</span></div>
              {scene ? (
                <div className="mt-3 space-y-4 leading-7 text-[#e5eef6]">
                  <p>{scene.overview}</p>
                  {scene.objects.length > 0 && <p><strong className="text-[#fbd46d]">可辨識物件：</strong>{scene.objects.join("、")}</p>}
                  {scene.obstacles.length > 0 && <p><strong className="text-[#ffbaaa]">可能障礙物：</strong>{scene.obstacles.join("、")}</p>}
                  {scene.actions.length > 0 && <p><strong className="text-[#8ae0cf]">行動注意：</strong>{scene.actions.join("、")}</p>}
                  <p className="border-t border-[#39516d] pt-3 text-sm text-[#c5d5e3]">{scene.safetyNote}</p>
                </div>
              ) : <p className="mt-3 leading-7 text-[#c5d5e3]">完成掃描後，這裡會以繁體中文顯示環境、物件、可能障礙物與行動注意事項，並標記風險層級。</p>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={togglePause} disabled={!isSpeaking} className="rounded-xl border border-[#56718e] bg-[#142b45] px-3 py-3 font-bold">{isPaused ? "繼續報讀" : "暫停報讀"}</button>
              <button onClick={() => announce(lastNarration || "目前沒有可重播的辨識結果。請先啟動相機並完成一次單次掃描。")} className="rounded-xl border border-[#8ae0cf] bg-[#12323b] px-3 py-3 font-bold text-[#eafff9]">重播結果</button>
            </div>
          </section>

          <section aria-labelledby="voice-title" className="panel-surface rounded-[1.75rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="section-eyebrow">免持操作</p><h2 id="voice-title" className="mt-1 text-2xl font-extrabold">語音指令</h2></div><Keyboard className="h-7 w-7 text-[#8ae0cf]" aria-hidden="true" /></div>
            <p className="mt-4 text-[#d9e5f0]">按下按鈕後直接說出指令。系統會先以文字確認，再執行可在瀏覽器內完成的操作。</p>
            <button onClick={startVoiceCommand} className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#8ae0cf] bg-[#12323b] px-5 py-4 text-lg font-extrabold text-[#eafff9]"><Mic className="h-6 w-6" aria-hidden="true" />{voiceCommand.isListening ? "停止聆聽語音指令" : "開始聆聽語音指令"}</button>
            <p role="status" className="mt-3 text-sm text-[#b8c8d9]">{voiceCommand.isSupported ? (lastTranscript ? `最近一次辨識到：「${lastTranscript}」` : "語音辨識準備就緒，啟動後將要求麥克風權限。") : "此瀏覽器可能不支援語音辨識；仍可使用鍵盤、觸控與語音報讀功能。"}</p>
            <div className="mt-5" aria-label="可使用的語音指令"><p className="text-sm font-bold text-[#b8c8d9]">可說的指令：</p><div className="mt-3 flex flex-wrap gap-2">{quickCommands.map(command => <span key={command} className="rounded-lg border border-[#42617d] bg-[#11253b] px-3 py-1.5 text-sm font-bold text-[#f1f7fc]">「{command}」</span>)}</div></div>
          </section>

          <LocationPanel onAnnounce={announce} />
        </div>

        <div className="mt-7"><NotesPanel onAnnounce={announce} /></div>

        <section aria-labelledby="safety-title" className="mt-7 rounded-[1.75rem] border border-[#bc785b] bg-[#30211e] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffad9d] text-[#40211b]"><AlertTriangle className="h-6 w-6" /></div><div><p className="section-eyebrow text-[#ffd0c3]">重要安全提醒</p><h2 id="safety-title" className="mt-1 text-2xl font-extrabold">AI 回報僅供輔助，不可取代導盲工具或交通判斷。</h2><p className="mt-3 max-w-4xl text-[#ffe4dc]">請在移動前與移動中持續使用適合您的導盲工具、遵守現場號誌與交通規則，並以現場狀況為準。AI 可能誤判、漏判或延遲，請勿只依賴本工具進行道路穿越、避開危險或緊急決策。</p></div><ShieldCheck className="ml-auto h-8 w-8 shrink-0 text-[#ffd0c3]" aria-hidden="true" /></div>
        </section>
        {!speechSupported && <p className="mt-5 rounded-xl border border-[#bc785b] bg-[#30211e] px-4 py-3 text-sm text-[#ffe4dc]">此瀏覽器目前不支援語音報讀。您仍可使用完整文字回報與鍵盤操作。</p>}
      </main>
    </div>
  );
}
