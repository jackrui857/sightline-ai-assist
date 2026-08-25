import React from "react";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceCommands } from "./useVoiceCommands";

type Listener = (event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void;

class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: Listener | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

let recognition: FakeRecognition | null = null;
const onTranscript = vi.fn();

function Harness({ onCommand, onError }: { onCommand: (command: string) => void; onError: (message: string) => void }) {
  const { isListening, startListening } = useVoiceCommands({ onCommand, onTranscript, onError });
  return <button onClick={startListening}>{isListening ? "正在聆聽" : "開始聆聽"}</button>;
}

describe("useVoiceCommands", () => {
  beforeEach(() => {
    recognition = null;
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: class extends FakeRecognition {
        constructor() {
          super();
          recognition = this;
        }
      },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("啟動聆聽後可將繁體中文開始掃描指令分派給瀏覽器內操作", async () => {
    const onCommand = vi.fn();
    const onError = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(<Harness onCommand={onCommand} onError={onError} />);

    await user.click(getByRole("button", { name: "開始聆聽" }));
    await waitFor(() => expect(recognition?.start).toHaveBeenCalled());
    recognition?.onresult?.({ results: [[{ transcript: "開始掃描" }]] });

    expect(onCommand).toHaveBeenCalledWith("startScan");
    expect(onError).not.toHaveBeenCalled();
  });
});
