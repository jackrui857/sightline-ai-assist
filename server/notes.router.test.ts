import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createNote: vi.fn(async () => ({ id: 18 })),
  listNotesByUserId: vi.fn(async () => [{ id: 18, userId: 7, content: "測試記事", source: "voice", createdAt: new Date() }]),
}));

import { createNote, listNotesByUserId } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "notes-user",
      email: "notes@example.com",
      name: "Notes User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("notes router", () => {
  it("只以目前登入使用者身分讀取及儲存記事", async () => {
    const caller = appRouter.createCaller(createContext());
    const notes = await caller.notes.list();
    const created = await caller.notes.create({ content: "測試記事", source: "voice" });

    expect(listNotesByUserId).toHaveBeenCalledWith(7);
    expect(createNote).toHaveBeenCalledWith({ userId: 7, content: "測試記事", source: "voice" });
    expect(notes).toHaveLength(1);
    expect(created).toEqual({ id: 18 });
  });
});
