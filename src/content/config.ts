import { defineCollection, z } from "astro:content";

/**
 * CELESTIAL Frontmatter Schema v1
 * dialogues / activities 共通規格
 */

const relationSchema = z.object({
  type: z.enum([
    "references",
    "follows",
    "responds_to",
    "summarizes",
    "depends_on",
    "same_topic",
  ]),
  target: z.object({
    kind: z.enum(["slug", "url", "id"]),
    value: z.string().min(1),
  }),
  note: z.string().optional(),
});

const tagsV1Schema = z
  .object({
    world: z.array(z.string()).default([]),
    system: z.array(z.string()).default([]),
    activity: z.array(z.string()).default([]),
    theme: z.array(z.string()).default([]),
  })
  .default({
    world: [],
    system: [],
    activity: [],
    theme: [],
  });

const externalSchema = z
  .object({
    platform: z.string().optional(),
    url: z.string().optional(),
  })
  .optional();

const socialSchema = z
  .object({
    x: z
      .object({
        text: z.string().optional(),
        hashtags: z.array(z.string()).default([]),
        auto: z.boolean().default(false),
      })
      .optional(),
  })
  .optional();

/**
 * 共通 frontmatter 骨格
 */
const baseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),

  publishAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),

  type: z.enum(["dialogue", "activity", "obs", "music", "system"]).optional(),
  source: z
    .enum(["internal", "youtube", "twitch", "vrchat", "kakuyomu", "note", "x"])
    .optional(),

  visibility: z.enum(["public", "unlisted", "draft"]).default("public"),

  // 旧互換
  tags: z.array(z.string()).optional(),

  // v1 正規
  tagsV1: tagsV1Schema,
  relations: z.array(relationSchema).default([]),
  external: externalSchema,
  social: socialSchema,
});

/**
 * Dialogues（思想核）
 */
const dialogues = defineCollection({
  type: "content",
  schema: baseSchema.extend({
    type: z.literal("dialogue").optional().default("dialogue"),
  }),
});

/**
 * Activities（行動・外部活動・履歴）
 */
const activities = defineCollection({
  type: "content",
  schema: baseSchema.extend({
    type: z.literal("activity").optional().default("activity"),
  }),
});

export const collections = {
  dialogues,
  activities,
};
