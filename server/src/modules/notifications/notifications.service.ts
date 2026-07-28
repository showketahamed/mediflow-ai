import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  list(user: AuthUser) {
    return this.prisma.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: "desc" } })
      .then((rows) => rows.map((row) => ({ id: row.id, title: row.title, body: row.body, createdAt: row.createdAt.toISOString(), read: Boolean(row.readAt) })));
  }
  async read(user: AuthUser, id: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, userId: user.sub } });
    if (!row) throw new NotFoundException("Notification not found.");
    await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return { message: "Notification marked read." };
  }
  async readAll(user: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: user.sub, readAt: null }, data: { readAt: new Date() } });
    return { message: "All notifications marked read." };
  }
  async remove(user: AuthUser, id: string) {
    const result = await this.prisma.notification.deleteMany({ where: { id, userId: user.sub } });
    if (!result.count) throw new NotFoundException("Notification not found.");
    return { message: "Notification deleted." };
  }
}
