import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AI_PROVIDER } from "./providers/ai-provider.interface";
import { DemoAiProvider } from "./providers/demo-ai.provider";
import { OpenAiProvider } from "./providers/openai.provider";

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    DemoAiProvider,
    OpenAiProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, DemoAiProvider, OpenAiProvider],
      useFactory: (
        config: ConfigService,
        demo: DemoAiProvider,
        openai: OpenAiProvider,
      ) => {
        const demoMode = config.get<string>("AI_DEMO_MODE", "true").toLowerCase() === "true";
        return demoMode ? demo : openai;
      },
    },
  ],
})
export class AiModule {}

