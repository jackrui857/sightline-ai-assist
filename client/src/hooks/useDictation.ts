import { useCallback, useEffect, useRef, useState } from "react";

type DictationEvent = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type DictationRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: DictationEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type DictationConstructor = new () => DictationRecognition;

declare global {
  interface Window {
    SpeechRecognition?: DictationConstructor;
    webkitSpeechRecognition?: DictationConstructor;
  }
}

export function useDictation({ onText, onError }: { onText: (text: string) => void; onError: (message: string) => void }) {
  const recognitionRef = useRef<DictationRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(Boolean(Constructor));
    if (!Constructor) return;

    const recognition = new Constructor();
    recognition.lang = "zh-TW";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const text = event.results[event.results.length - 1]?.[0]?.transcript?.trim() || "";
      if (text) onText(text);
    };
    recognition.onerror = event => {
      onError(event.error === "not-allowed" ? "麥克風權限未取得，請在瀏覽器設定中允許麥克風後再試一次。" : "語音轉文字暫時無法使用，請再試一次或直接以鍵盤輸入。 ");
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [onError, onText]);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      onError("此瀏覽器不支援語音轉文字。您仍可手動輸入與儲存記事。");
      return;
    }
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch {
      setIsRecording(true);
    }
  }, [onError]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isSupported, isRecording, start, stop };
}
