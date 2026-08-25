import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const invalidate = vi.fn();
const onAnnounce = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 9, name: "測試使用者" }, loading: false }),
}));
vi.mock("@/hooks/useDictation", () => ({
  useDictation: () => ({ isSupported: true, isRecording: false, start: vi.fn(), stop: vi.fn() }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ notes: { list: { invalidate } } }),
    notes: {
      list: { useQuery: () => ({ isLoading: false, data: [{ id: 2, content: "既有記事", source: "voice", createdAt: new Date("2026-08-25T00:00:00Z") }] }) },
      create: { useMutation: ({ onSuccess }: { onSuccess: () => void }) => ({ mutate: () => onSuccess(), isPending: false }) },
    },
  },
}));

import { NotesPanel } from "./NotesPanel";

describe("NotesPanel", () => {
  it("允許登入使用者修正輸入內容、儲存並回看記事", async () => {
    onAnnounce.mockClear();
    invalidate.mockClear();
    const user = userEvent.setup();
    const { getByLabelText, getByRole, getByText } = render(<NotesPanel onAnnounce={onAnnounce} />);

    const textarea = getByLabelText("記事內容");
    await user.type(textarea, "今天下午回電");
    await user.click(getByRole("button", { name: "儲存記事" }));

    expect(onAnnounce).toHaveBeenCalledWith("記事已儲存，可在下方清單回看。 ");
    expect(invalidate).toHaveBeenCalled();
    expect(getByText("既有記事")).toBeTruthy();
  });
});
