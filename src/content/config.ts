import { defineCollection, z } from "astro:content";

/**
 * CELESTIAL Dialogues
 * ・publishAt : 公開スケジュール（予約投稿の核）
 * ・createdAt : ログ生成日（自動生成・外部連携用）
 * ・source    : どこ由来のログか（自動連携の鍵）
 * ・visibility: 公開制御（draftで非公開も可能）
 */

const dialogues = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),

    // 🔹 中核：公開スケジュール
    publishAt: z.coerce.date(),

    // 🔹 任意：生成日（自動生成ログ・AI生成用）
    createdAt: z.coerce.date().optional(),

    // 🔹 任意：出所（youtube / twitch / kakuyomu / manual / ai / etc）
    source: z.string().optional(),

    // 🔹 任意：公開状態
    visibility: z.enum(["public", "unlisted", "draft"]).default("public"),

    // 🔹 任意：分類
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  dialogues,
};
