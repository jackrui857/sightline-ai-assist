import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle, RefreshCw, ScanLine } from "lucide-react";

export type CameraControls = {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => Promise<void>;
  switchCamera: () => Promise<void>;
};

type CameraPanelProps = {
  onScan: (imageDataUrl: string) => Promise<void>;
  onStatusChange: (status: string) => void;
};

export const CameraPanel = forwardRef<CameraControls, CameraPanelProps>(function CameraPanel(
  { onScan, onStatusChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [permissionMessage, setPermissionMessage] = useState("尚未要求相機權限。");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setPermissionMessage("相機已停止。您可以隨時重新啟動相機。");
    onStatusChange("相機已停止");
  };

  const startCamera = async (requestedFacingMode = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionMessage("此瀏覽器無法使用相機功能，請改用支援安全相機存取的瀏覽器。");
      onStatusChange("相機功能不受支援");
      return;
    }

    try {
      setPermissionMessage("正在要求相機權限，請查看瀏覽器提示並選擇是否同意。");
      onStatusChange("正在要求相機權限");
      streamRef.current?.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: requestedFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacingMode(requestedFacingMode);
      setIsStreaming(true);
      const cameraName = requestedFacingMode === "environment" ? "後鏡頭" : "前鏡頭";
      setPermissionMessage(`相機已啟動，正在使用${cameraName}。畫面不會自動分析。`);
      onStatusChange(`相機已啟動（${cameraName}）`);
    } catch (error) {
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setPermissionMessage(denied ? "相機權限未獲同意。請在瀏覽器設定中允許相機後再試一次。" : "無法啟動相機。請確認裝置可用、未被其他應用程式占用，並再試一次。");
      onStatusChange(denied ? "相機權限未獲同意" : "無法啟動相機");
      setIsStreaming(false);
    }
  };

  const switchCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isStreaming) await startCamera(nextMode);
    else {
      setPermissionMessage(`已選擇${nextMode === "environment" ? "後鏡頭" : "前鏡頭"}，啟動相機後會套用。`);
      onStatusChange("已切換鏡頭選擇");
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!isStreaming || !video || video.videoWidth === 0) {
      setPermissionMessage("請先啟動相機，並等待預覽畫面顯示後再進行單次掃描。");
      onStatusChange("尚未取得可掃描畫面");
      return;
    }
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setIsScanning(true);
    setPermissionMessage("正在分析您剛才主動拍攝的單一畫面，請稍候。您仍應持續留意真實環境。");
    onStatusChange("正在分析單次畫面");
    try {
      await onScan(canvas.toDataURL("image/jpeg", 0.74));
      setPermissionMessage("掃描完成，辨識結果已顯示並開始語音報讀。您可隨時重播結果。" );
      onStatusChange("掃描完成");
    } catch {
      setPermissionMessage("掃描未完成。請確認網路連線後再次嘗試，或改以周遭實際狀況與導盲工具為準。");
      onStatusChange("掃描未完成");
    } finally {
      setIsScanning(false);
    }
  };

  useImperativeHandle(ref, () => ({ startCamera: () => startCamera(), stopCamera, captureFrame, switchCamera }));
  useEffect(() => () => stopCamera(), []);

  return (
    <section aria-labelledby="scan-title" className="panel-surface rounded-[1.75rem] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-eyebrow">環境辨識</p>
          <h2 id="scan-title" className="mt-1 text-2xl font-extrabold">相機與即時掃描</h2>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${isStreaming ? "border-[#8ae0cf]/70 bg-[#12323b] text-[#eafff9]" : "border-[#fbd46d]/55 bg-[#382e1a] text-[#fff2bb]"}`}>
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${isStreaming ? "bg-[#8ae0cf]" : "bg-[#fbd46d]"}`} />
          {isStreaming ? "相機使用中" : "尚未啟動相機"}
        </span>
      </div>

      <div className="mt-6 min-h-70 overflow-hidden rounded-2xl border border-dashed border-[#5f7894] bg-[radial-gradient(circle_at_center,rgba(138,224,207,0.12),transparent_38%),linear-gradient(135deg,#0a1727,#10233a)]">
        {isStreaming ? (
          <video ref={videoRef} className="h-full min-h-70 w-full object-cover" muted playsInline aria-label="相機即時預覽畫面；畫面不會自動分析" />
        ) : (
          <div className="grid min-h-70 place-items-center p-6 text-center">
            <div className="max-w-sm">
              <div aria-hidden="true" className="mx-auto grid h-18 w-18 place-items-center rounded-2xl bg-[#19314d] text-[#8ae0cf]"><Camera className="h-9 w-9" /></div>
              <p className="mt-4 text-xl font-extrabold">等待相機授權</p>
              <p className="mt-2 text-[#c5d5e3]">啟動後畫面只會在您選擇掃描時送交分析。請先留意周遭真實環境。</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => void startCamera()} className="rounded-xl border-2 border-[#fbd46d] bg-[#fbd46d] px-4 py-3 font-extrabold text-[#071220]">{isStreaming ? "重新啟動相機" : "啟動相機"}</button>
        <button onClick={() => void switchCamera()} className="rounded-xl border border-[#56718e] bg-[#142b45] px-4 py-3 font-bold text-[#f7fbff]">切換前後鏡頭</button>
        <button onClick={() => void captureFrame()} disabled={!isStreaming || isScanning} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8ae0cf] bg-[#12323b] px-4 py-3 font-extrabold text-[#eafff9]">{isScanning ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ScanLine className="h-5 w-5" aria-hidden="true" />}單次掃描</button>
        <button onClick={stopCamera} disabled={!isStreaming} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#bc785b] bg-[#30211e] px-4 py-3 font-bold text-[#ffe4dc]"><CameraOff className="h-5 w-5" aria-hidden="true" />停止相機</button>
      </div>
      <p id="camera-status" role="status" aria-live="polite" className="mt-4 rounded-xl border-l-4 border-[#fbd46d] bg-[#2a271e] px-4 py-3 text-sm font-medium text-[#fff4c9]">{permissionMessage}</p>
      {isStreaming && <p className="mt-3 flex items-center gap-2 text-sm text-[#b8c8d9]"><RefreshCw className="h-4 w-4" aria-hidden="true" />畫面只在按下「單次掃描」時擷取一張影像進行分析。</p>}
    </section>
  );
});
