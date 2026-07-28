import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { AiProvider, AiProviderResult, StructuredRequest } from "./ai-provider.interface";

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  readonly isDemo = false;
  readonly model: string;
  private readonly audioModel: string;
  private readonly client: OpenAI | null;

  constructor(config: ConfigService) {
    this.model = config.get<string>("OPENAI_MODEL", "gpt-5.6-sol");
    this.audioModel = config.get<string>("OPENAI_AUDIO_MODEL", "gpt-4o-mini-transcribe");
    const apiKey = config.get<string>("OPENAI_API_KEY")?.trim();
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          timeout: config.get<number>("AI_REQUEST_TIMEOUT_MS", 45_000),
          maxRetries: 2,
        })
      : null;
  }

  private getClient() {
    if (!this.client) {
      throw new ServiceUnavailableException("AI is not configured. Set OPENAI_API_KEY on the API server.");
    }
    return this.client;
  }

  async structured<T>(request: StructuredRequest<T>): Promise<AiProviderResult<T>> {
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: request.user }];
    if (request.image) {
      content.push({
        type: "input_image",
        image_url: `data:${request.image.mimeType};base64,${request.image.buffer.toString("base64")}`,
        detail: "high",
      });
    }
    const response = await this.getClient().responses.parse({
      model: this.model,
      input: [
        { role: "system", content: request.system },
        { role: "user", content },
      ] as any,
      text: { format: zodTextFormat(request.schema, request.schemaName) },
      store: false,
    });
    if (!response.output_parsed) {
      throw new ServiceUnavailableException("The AI provider did not return a usable response.");
    }
    return {
      data: response.output_parsed as T,
      model: response.model,
      provider: this.name,
      demo: false,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }

  async transcribe(file: Express.Multer.File): Promise<AiProviderResult<string>> {
    const upload = await toFile(file.buffer, file.originalname, { type: file.mimetype });
    const response = await this.getClient().audio.transcriptions.create({
      file: upload,
      model: this.audioModel,
      response_format: "text",
      prompt: "Transcribe this clinical voice note accurately. Preserve medical terms, dosages, and measurements.",
    });
    return {
      data: response,
      model: this.audioModel,
      provider: this.name,
      demo: false,
      usage: {},
    };
  }
}
