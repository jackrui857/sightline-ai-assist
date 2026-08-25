import React from "react";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationPanel } from "./LocationPanel";

describe("LocationPanel", () => {
  const onAnnounce = vi.fn();

  beforeEach(() => {
    onAnnounce.mockClear();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => success({
          coords: { latitude: 25.033, longitude: 121.5654, accuracy: 12 },
        } as GeolocationPosition)),
      },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("可用鍵盤觸發明確同意後的位置取得並顯示可報讀狀態", async () => {
    const user = userEvent.setup();
    const { getByRole, getByText } = render(<LocationPanel onAnnounce={onAnnounce} />);
    const button = getByRole("button", { name: "取得目前位置" });

    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(getByText(/位置已取得。緯度 25.03300/)).toBeTruthy());
    expect(onAnnounce).toHaveBeenCalledWith(expect.stringContaining("位置已取得"));
  });
});
