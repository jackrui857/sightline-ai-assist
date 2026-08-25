import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createNote, listNotesByUserId } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { analyzeSceneImage } from "./sceneAnalysis";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  scene: router({
    analyze: publicProcedure
      .input(z.object({ imageDataUrl: z.string().max(6_000_000).regex(/^data:image\/(jpeg|png|webp);base64,/, "影像格式不正確。") }))
      .mutation(async ({ input }) => analyzeSceneImage(input.imageDataUrl)),
  }),
  notes: router({
    list: protectedProcedure.query(({ ctx }) => listNotesByUserId(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ content: z.string().trim().min(1, "請輸入記事內容。").max(1200, "記事內容不可超過 1200 字。"), source: z.enum(["typed", "voice"]) }))
      .mutation(({ ctx, input }) => createNote({ userId: ctx.user.id, content: input.content, source: input.source })),
  }),
});

export type AppRouter = typeof appRouter;
