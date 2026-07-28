import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import {
  AiAnalyticsDto,
  AppointmentAssistantDto,
  ChatDto,
  DiagnosisSuggestionDto,
  ReportSummaryDto,
} from "./ai.dto";
import { AiService } from "./ai.service";

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
};

@ApiTags("AI")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("receptionist")
  @RequirePermissions("ai:receptionist")
  receptionist(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.ai.assistant(user, dto, true);
  }

  @Post("chat")
  @RequirePermissions("ai:chat")
  chat(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.ai.assistant(user, dto, false);
  }

  @Post("patients/:id/summary")
  @RequirePermissions("ai:patient-summary")
  patientSummary(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.ai.patientSummary(user, id);
  }

  @Post("appointments/assistant")
  @RequirePermissions("ai:appointment")
  appointmentAssistant(@CurrentUser() user: AuthUser, @Body() dto: AppointmentAssistantDto) {
    return this.ai.appointmentAssistant(user, dto);
  }

  @Post("diagnosis-suggestions")
  @RequirePermissions("ai:diagnosis")
  diagnosisSuggestions(@CurrentUser() user: AuthUser, @Body() dto: DiagnosisSuggestionDto) {
    return this.ai.diagnosisSuggestions(user, dto);
  }

  @Post("ocr")
  @RequirePermissions("ai:ocr")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } })
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  medicalOcr(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("An image file is required.");
    if (!file.mimetype.startsWith("image/")) throw new BadRequestException("OCR accepts image files only.");
    return this.ai.medicalOcr(user, file);
  }

  @Post("voice-notes")
  @RequirePermissions("ai:voice")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } })
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  voiceNote(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("An audio file is required.");
    if (!file.mimetype.startsWith("audio/") && file.mimetype !== "video/webm") {
      throw new BadRequestException("Voice notes accept audio files only.");
    }
    return this.ai.voiceNote(user, file);
  }

  @Post("reports/summarize")
  @RequirePermissions("ai:report")
  reportSummary(@CurrentUser() user: AuthUser, @Body() dto: ReportSummaryDto) {
    return this.ai.reportSummary(user, dto);
  }

  @Post("analytics")
  @RequirePermissions("ai:analytics")
  analytics(@CurrentUser() user: AuthUser, @Body() dto: AiAnalyticsDto) {
    return this.ai.analytics(user, dto);
  }

  @Post("predictions")
  @RequirePermissions("ai:predictions")
  predictions(@CurrentUser() user: AuthUser, @Body() dto: AiAnalyticsDto) {
    return this.ai.predictions(user, dto);
  }

  @Get("usage")
  @RequirePermissions("ai:monitor")
  usage(@CurrentUser() user: AuthUser) {
    return this.ai.usage(user);
  }
}

