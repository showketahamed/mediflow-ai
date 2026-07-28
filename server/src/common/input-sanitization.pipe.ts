import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

@Injectable()
export class InputSanitizationPipe implements PipeTransform {
  transform(value: unknown) {
    return this.clean(value, 0);
  }

  private clean(value: unknown, depth: number): unknown {
    if (depth > 20) throw new BadRequestException("Request payload nesting is too deep.");
    if (typeof value === "string") return value.replace(CONTROL_CHARACTERS, "");
    if (Array.isArray(value)) {
      if (value.length > 10_000) throw new BadRequestException("Request payload contains too many items.");
      return value.map((item) => this.clean(item, depth + 1));
    }
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 1_000) throw new BadRequestException("Request payload contains too many fields.");
      const clean: Record<string, unknown> = {};
      for (const [key, item] of entries) {
        if (DANGEROUS_KEYS.has(key)) throw new BadRequestException("Request payload contains an unsafe property.");
        clean[key] = this.clean(item, depth + 1);
      }
      return clean;
    }
    return value;
  }
}

