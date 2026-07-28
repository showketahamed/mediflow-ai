import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "./email.service";
import { SmsService } from "./sms.service";

interface DeliveryInput {
  hospitalId: string;
  title: string;
  body: string;
  patientId?: string;
  roles?: UserRole[];
  email?: string | null;
  phone?: string | null;
  channels?: Array<"IN_APP" | "EMAIL" | "SMS">;
  idempotencyKey: string;
}

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  async deliver(input: DeliveryInput) {
    const channels = input.channels ?? ["IN_APP"];
    const providerResults: Record<string, unknown> = {};
    if (channels.includes("IN_APP")) {
      const users = await this.prisma.user.findMany({
        where: {
          hospitalId: input.hospitalId,
          active: true,
          OR: [
            ...(input.roles?.length ? [{ role: { in: input.roles } }] : []),
            ...(input.patientId ? [{ patientProfile: { id: input.patientId } }] : []),
          ],
        },
        select: { id: true },
      });
      if (users.length) {
        await this.prisma.notification.createMany({
          data: users.map((user) => ({ userId: user.id, title: input.title, body: input.body, sourceKey: input.idempotencyKey })),
          skipDuplicates: true,
        });
      }
      providerResults.inApp = users.length;
    }
    if (channels.includes("EMAIL") && input.email) providerResults.email = await this.email.send({ to: input.email, subject: input.title, text: input.body, idempotencyKey: input.idempotencyKey });
    if (channels.includes("SMS") && input.phone) providerResults.sms = await this.sms.send({ to: input.phone, body: input.body, idempotencyKey: input.idempotencyKey });
    return providerResults;
  }
}
