import { useCallback, useEffect, useRef, useState } from "react";
import { matchVoiceCommand, type VoiceCommand } from "@/lib/voiceCommands";

type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export function useVoiceCommands({
  onCommand,
  onTranscript,
  onError,
}: {
  onCommand: (command: VoiceCommand) => void;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(Boolean(Constructor));
    if (!Constructor) return;

    const recognition = new Constructor();
    recognition.lang = "zh-TW";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;
      onTranscript(transcript);
      onCommand(matchVoiceCommand(transcript));
    };
    recognition.onerror = event => {
      const message = event.error === "not-allowed" ? "麥克風權限未取得，請在瀏覽器中允許麥克風使用。" : "語音指令暫時無法辨識，請再試一次或改用畫面按鈕。";
      onError(message);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [onCommand, onError, onTranscript]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      onError("此瀏覽器目前不支援語音辨識，您仍可使用鍵盤與畫面按鈕操作。");
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(true);
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, startListening, stopListening };
}
