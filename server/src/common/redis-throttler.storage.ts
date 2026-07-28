import type { ConfigService } from "@nestjs/config";
import type { ThrottlerStorage } from "@nestjs/throttler";
import Redis from "ioredis";

const INCREMENT_SCRIPT = `
local blockedTtl = redis.call("PTTL", KEYS[2])
if blockedTtl > 0 then
  local current = tonumber(redis.call("GET", KEYS[1]) or "0")
  return {current, math.max(redis.call("PTTL", KEYS[1]), 0), 1, blockedTtl}
end
local total = redis.call("INCR", KEYS[1])
if total == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
local ttl = math.max(redis.call("PTTL", KEYS[1]), 0)
if total > tonumber(ARGV[2]) then
  redis.call("SET", KEYS[2], "1", "PX", ARGV[3])
  return {total, ttl, 1, tonumber(ARGV[3])}
end
return {total, ttl, 0, 0}
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>("REDIS_HOST", "localhost"),
      port: config.get<number>("REDIS_PORT", 6379),
      password: config.get<string>("REDIS_PASSWORD") || undefined,
      keyPrefix: "mediflow:rate-limit:",
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    const safeBlockDuration = Math.max(blockDuration || ttl, 1_000);
    const result = await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      `${throttlerName}:${key}:hits`,
      `${throttlerName}:${key}:blocked`,
      ttl,
      limit,
      safeBlockDuration,
    ) as number[];
    return {
      totalHits: Number(result[0]),
      timeToExpire: Number(result[1]),
      isBlocked: Number(result[2]) === 1,
      timeToBlockExpire: Number(result[3]),
    };
  }
}
