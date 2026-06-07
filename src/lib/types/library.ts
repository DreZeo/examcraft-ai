import { z } from "zod";
import { AiPaperOperationSchema, QuestionSchema } from "./exam";

export const PaperMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  questionCount: z.number().int().nonnegative(),
});

export const PaperIndexSchema = z.object({
  version: z.number().int().default(1),
  activePaperId: z.string().nullable(),
  papers: z.array(PaperMetaSchema).default([]),
});

const ApiRoleSchema = z.enum(["user", "assistant", "system"]);

export const ApiMessageSchema = z.object({
  role: ApiRoleSchema,
  content: z.string(),
});

const RequestContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("plain") }),
  z.object({
    kind: z.literal("modifyQuestion"),
    question: QuestionSchema,
  }),
]);

export const WebSearchProviderSchema = z.enum(["tavily", "exa"]);

export const WebSearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  content: z.string().optional(),
  publishedAt: z.string().optional(),
  provider: WebSearchProviderSchema,
});

export const ChatMessageSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    kind: z.literal("text"),
    role: ApiRoleSchema,
    content: z.string(),
    apiHistoryIndex: z.number().int().nonnegative().optional(),
    requestContext: RequestContextSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("confirmation"),
    content: z.string(),
    resolved: z.boolean(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("result"),
    prose: z.string(),
    questions: z.array(QuestionSchema).optional(),
    applyMode: z.enum(["append", "replace"]).optional(),
    operations: z.array(AiPaperOperationSchema).default([]),
    applied: z.boolean(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("error"),
    code: z.string(),
    detail: z.string().optional(),
    raw: z.string().optional(),
    retryExhausted: z.boolean(),
    retryable: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal("webSearch"),
    provider: WebSearchProviderSchema,
    query: z.string(),
    contentMode: z.enum(["summary", "deep"]),
    results: z.array(WebSearchResultSchema),
  }),
]);

export const ChatSessionMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ChatIndexSchema = z.object({
  version: z.number().int().default(1),
  activeSessionId: z.string().nullable(),
  sessions: z.array(ChatSessionMetaSchema).default([]),
});

export const ChatSessionSchema = z.object({
  version: z.number().int().default(1),
  id: z.string().min(1),
  paperId: z.string().min(1),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(ChatMessageSchema).default([]),
  apiHistory: z.array(ApiMessageSchema).default([]),
});

export type PaperMeta = z.infer<typeof PaperMetaSchema>;
export type PaperIndex = z.infer<typeof PaperIndexSchema>;
export type ApiRole = z.infer<typeof ApiRoleSchema>;
export type ApiMessage = z.infer<typeof ApiMessageSchema>;
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatSessionMeta = z.infer<typeof ChatSessionMetaSchema>;
export type ChatIndex = z.infer<typeof ChatIndexSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
