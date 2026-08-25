import React, { useCallback, useState } from "react";
import { BookOpen, LogIn, Mic, Save, Square, Type } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDictation } from "@/hooks/useDictation";
import { trpc } from "@/lib/trpc";

type NotesPanelProps = {
  onAnnounce: (message: string, readAloud?: boolean) => void;
};

export function NotesPanel({ onAnnounce }: NotesPanelProps) {
  const { user, loading } = useAuth();
  const [content, setContent] = useState("");
  const [source, setSource] = useState<"typed" | "voice">("typed");
  const utils = trpc.useUtils();
  const notesQuery = trpc.notes.list.useQuery(undefined, { enabled: Boolean(user) });
  const createNote = trpc.notes.create.useMutation({
    onSuccess: async () => {
      setContent("");
      setSource("typed");
      await utils.notes.list.invalidate();
      onAnnounce("記事已儲存，可在下方清單回看。 ");
    },
    onError: () => onAnnounce("記事暫時無法儲存，請確認登入狀態與網路後再試一次。"),
  });

  const onDictationText = useCallback((text: string) => {
    setContent(current => `${current}${current ? "，" : ""}${text}`);
    setSource("voice");
    onAnnounce("已將口述內容轉成文字，您可以先修正內容再儲存。", false);
  }, [onAnnounce]);
  const onDictationError = useCallback((message: string) => onAnnounce(message), [onAnnounce]);
  const dictation = useDictation({ onText: onDictationText, onError: onDictationError });

  const save = () => {
    const normalized = content.trim();
    if (!normalized) {
      onAnnounce("請先輸入口述或文字內容，再儲存記事。 ");
      return;
    }
    createNote.mutate({ content: normalized, source });
  };

  return (
    <section id="notes-section" aria-labelledby="notes-title" className="panel-surface rounded-[1.75rem] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="section-eyebrow">個人記事</p><h2 id="notes-title" className="mt-1 text-2xl font-extrabold">語音多媒體記事本</h2></div><BookOpen className="h-7 w-7 text-[#fbd46d]" aria-hidden="true" /></div>
      <p className="mt-4 text-[#d9e5f0]">可口述轉文字，也可手動修正後儲存。記事僅在登入後保存於您的帳號。</p>
      {loading ? <p className="mt-5 text-[#c5d5e3]">正在確認登入狀態。</p> : !user ? (
        <div className="mt-5 rounded-2xl border border-[#58708c] bg-[#11253b] p-5"><p className="font-bold">登入後即可保存與回看自己的記事。</p><button onClick={() => startLogin()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#fbd46d] px-4 py-3 font-extrabold text-[#071220]"><LogIn className="h-5 w-5" aria-hidden="true" />登入以使用記事本</button></div>
      ) : (
        <>
          <label htmlFor="note-content" className="mt-5 block font-bold">記事內容</label>
          <textarea id="note-content" value={content} onChange={event => { setContent(event.target.value); setSource("typed"); }} rows={5} maxLength={1200} placeholder="可按下口述記事後開始說話，或在此輸入內容。" className="mt-2 w-full rounded-2xl border border-[#58708c] bg-[#071220] p-4 text-base text-[#f7fbff] placeholder:text-[#8fa4b8]" />
          <p className="mt-2 text-sm text-[#b8c8d9]">{content.length} / 1200 字。口述結果可以在儲存前自由修正。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button onClick={() => dictation.isRecording ? dictation.stop() : dictation.start()} className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#8ae0cf] bg-[#12323b] px-4 py-3 font-extrabold text-[#eafff9]">{dictation.isRecording ? <Square className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}{dictation.isRecording ? "停止口述" : "口述記事"}</button>
            <button onClick={save} disabled={createNote.isPending} className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#fbd46d] bg-[#fbd46d] px-4 py-3 font-extrabold text-[#071220]"><Save className="h-5 w-5" aria-hidden="true" />{createNote.isPending ? "正在儲存" : "儲存記事"}</button>
          </div>
          <p role="status" className="mt-3 text-sm text-[#c5d5e3]">{dictation.isSupported ? "口述記事會要求麥克風權限；若不支援，仍可使用文字輸入。" : "此瀏覽器不支援口述轉文字，請使用文字輸入。"}</p>
          <div className="mt-6 border-t border-[#39516d] pt-5">
            <h3 className="flex items-center gap-2 text-lg font-extrabold"><Type className="h-5 w-5 text-[#8ae0cf]" aria-hidden="true" />已儲存的記事</h3>
            {notesQuery.isLoading ? <p className="mt-3 text-[#c5d5e3]">正在讀取記事。</p> : notesQuery.data?.length ? <ul className="mt-4 space-y-3">{notesQuery.data.map(note => <li key={note.id} className="rounded-xl border border-[#42617d] bg-[#0a192a] p-4"><p className="whitespace-pre-wrap text-[#f1f7fc]">{note.content}</p><p className="mt-2 text-sm text-[#b8c8d9]">{note.source === "voice" ? "語音輸入" : "文字輸入"} · <time dateTime={note.createdAt.toISOString()}>{new Date(note.createdAt).toLocaleString("zh-TW")}</time></p></li>)}</ul> : <p className="mt-3 rounded-xl border border-dashed border-[#42617d] bg-[#0a192a] p-4 text-[#c5d5e3]">尚未有已儲存的記事。您可以口述或輸入第一則內容。</p>}
          </div>
        </>
      )}
    </section>
  );
}
