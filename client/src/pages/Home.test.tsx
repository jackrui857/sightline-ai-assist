import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const speak = vi.fn();

vi.mock("@/components/CameraPanel", () => ({ CameraPanel: () => <div data-testid="camera-panel">相機控制</div> }));
vi.mock("@/components/LocationPanel", () => ({
  LocationPanel: ({ onAnnounce }: { onAnnounce: (message: string) => void }) => (
    <button onClick={() => onAnnounce("目前本機時間是測試時間。")}>目前時間</button>
  ),
}));
vi.mock("@/components/NotesPanel", () => ({ NotesPanel: () => <div>記事控制</div> }));
vi.mock("@/hooks/useVoiceFeedback", () => ({
  useVoiceFeedback: () => ({ isSupported: true, isSpeaking: false, isPaused: false, speak, togglePause: vi.fn() }),
}));
vi.mock("@/hooks/useVoiceCommands", () => ({
  useVoiceCommands: () => ({ isSupported: true, isListening: false, startListening: vi.fn(), stopListening: vi.fn() }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: { scene: { analyze: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } } },
}));

import Home from "./Home";

describe("Home", () => {
  it("在首頁主要操作中可觸發目前時間的繁體中文語音報讀", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<Home />);

    await user.click(getByRole("button", { name: /目前時間/ }));

    expect(speak).toHaveBeenCalledWith(expect.stringContaining("目前本機時間是"));
  });
});
