import React, { useEffect, useState } from "react";
import { Clock3, LocateFixed, MapPin, Navigation, ShieldCheck } from "lucide-react";

type LocationPanelProps = {
  onAnnounce: (message: string, readAloud?: boolean) => void;
};

type Coordinates = { latitude: number; longitude: number; accuracy: number };

export function LocationPanel({ onAnnounce }: LocationPanelProps) {
  const [now, setNow] = useState(() => new Date());
  const [locationStatus, setLocationStatus] = useState("尚未取得位置；需要您的明確同意。");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedTime = new Intl.DateTimeFormat("zh-TW", { dateStyle: "full", timeStyle: "short" }).format(now);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      const message = "此瀏覽器不支援取得位置。您仍可使用其他功能。";
      setLocationStatus(message);
      onAnnounce(message);
      return;
    }
    setIsRequesting(true);
    setLocationStatus("正在向瀏覽器要求位置權限；請查看瀏覽器提示並選擇是否同意。");
    onAnnounce("位置功能需要您的明確同意。正在要求瀏覽器位置權限。", false);
    navigator.geolocation.getCurrentPosition(
      position => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
        setCoordinates(next);
        const message = `位置已取得。緯度 ${next.latitude.toFixed(5)}，經度 ${next.longitude.toFixed(5)}，定位誤差約 ${Math.round(next.accuracy)} 公尺。`;
        setLocationStatus(message);
        setIsRequesting(false);
        onAnnounce(message);
      },
      error => {
        const message = error.code === error.PERMISSION_DENIED
          ? "位置權限未獲同意。您可在瀏覽器設定中調整權限後再試一次。"
          : "暫時無法取得位置。請確認定位功能與網路可用後再試一次。";
        setLocationStatus(message);
        setIsRequesting(false);
        onAnnounce(message);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

  return (
    <section id="location-section" aria-labelledby="essentials-title" className="panel-surface rounded-[1.75rem] p-5 sm:p-7">
      <p className="section-eyebrow">日常支援</p>
      <h2 id="essentials-title" className="mt-1 text-2xl font-extrabold">時間與目前位置</h2>
      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-[#58708c] bg-[#11253b] p-5">
          <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-[#fbd46d]" aria-hidden="true" /><div><p className="font-extrabold">目前本機時間</p><time dateTime={now.toISOString()} className="mt-1 block text-lg text-[#f7fbff]">{formattedTime}</time><p className="mt-1 text-sm text-[#c5d5e3]">可使用上方「目前時間」或說「報讀時間」聽取時間。</p></div></div>
        </div>
        <div className="rounded-2xl border border-[#58708c] bg-[#11253b] p-5">
          <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-6 w-6 shrink-0 text-[#fbd46d]" aria-hidden="true" /><div className="min-w-0"><p className="font-extrabold">目前位置</p><p role="status" aria-live="polite" className="mt-1 text-sm leading-6 text-[#c5d5e3]">{locationStatus}</p>{coordinates && <p className="mt-3 rounded-lg border border-[#42617d] bg-[#0a192a] px-3 py-2 text-sm text-[#e7f0f7]">定位座標：{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}；精確度約 ±{Math.round(coordinates.accuracy)} 公尺。</p>}</div></div>
          <button onClick={requestLocation} disabled={isRequesting} className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-[#8ae0cf] bg-[#12323b] px-4 py-3 font-extrabold text-[#eafff9]"><LocateFixed className="h-5 w-5" aria-hidden="true" />{isRequesting ? "正在取得位置" : coordinates ? "重新取得目前位置" : "取得目前位置"}</button>
          <p className="mt-3 flex gap-2 text-sm text-[#b8c8d9]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8ae0cf]" aria-hidden="true" />僅在您按下按鈕並同意瀏覽器權限後取得位置；這個工具不會持續追蹤位置。</p>
        </div>
      </div>
    </section>
  );
}
