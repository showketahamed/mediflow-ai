import type { z } from "zod";

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiProviderResult<T> {
  data: T;
  model: string;
  provider: string;
  usage: AiUsage;
  demo: boolean;
}

export interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  schemaName: string;
  system: string;
  user: string;
  image?: { buffer: Buffer; mimeType: string };
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  readonly isDemo: boolean;
  structured<T>(request: StructuredRequest<T>): Promise<AiProviderResult<T>>;
  transcribe(file: Express.Multer.File): Promise<AiProviderResult<string>>;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

