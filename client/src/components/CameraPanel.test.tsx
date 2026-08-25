import React from "react";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraPanel } from "./CameraPanel";

describe("CameraPanel", () => {
  const onScan = vi.fn(async () => undefined);
  const onStatusChange = vi.fn();
  const stop = vi.fn();

  beforeEach(() => {
    onScan.mockClear();
    onStatusChange.mockClear();
    stop.mockClear();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] } as unknown as MediaStream) },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("可透過鍵盤 Tab 與 Enter 啟動相機，並清楚更新權限狀態", async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<CameraPanel onScan={onScan} onStatusChange={onStatusChange} />);
    const startButton = getByRole("button", { name: "啟動相機" });

    await user.tab();
    expect(document.activeElement).toBe(startButton);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith("相機已啟動（後鏡頭）"));
    expect(getByRole("button", { name: "單次掃描" })).toHaveProperty("disabled", false);
    expect(getByRole("status").textContent).toContain("相機已啟動，正在使用後鏡頭");
  });
});
