import { z } from 'zod';

const EnvSchema = z.object({
  HORREUM_BASE_URL: z.string().url({ message: 'HORREUM_BASE_URL must be a valid URL' }),
  HORREUM_TOKEN: z.string().min(1).optional(),
  HORREUM_RATE_LIMIT: z.coerce.number().int().positive().max(1000).default(10),
  HORREUM_TIMEOUT: z.coerce.number().int().positive().max(300000).default(30000),
  HORREUM_API_VERSION: z.string().optional().default('latest'),
  METRICS_ENABLED: z.coerce.boolean().optional().default(false),
  METRICS_PORT: z.coerce.number().int().positive().max(65535).optional().default(9464),
  METRICS_PATH: z.string().optional().default('/metrics'),
  TRACING_ENABLED: z.coerce.boolean().optional().default(false),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .optional()
    .default('info'),

  // Phase 4: HTTP Standalone Mode
  HTTP_MODE_ENABLED: z.coerce.boolean().optional().default(false),
  HTTP_PORT: z.coerce.number().int().positive().max(65535).optional().default(3000),
  HTTP_AUTH_TOKEN: z.string().min(1).optional(),
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'azure']).optional(),
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).optional(),

  // Phase 6: SSL/TLS Configuration
  HORREUM_TLS_VERIFY: z
    .string()
    .optional()
    .default('true')
    .transform((val) => {
      // Custom boolean parsing that correctly handles string "false"
      const lower = val.toLowerCase();
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
        return false;
      }
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      throw new Error(
        `HORREUM_TLS_VERIFY must be 'true' or 'false' (or 1/0, yes/no), got: ${val}`
      );
    })
    .describe(
      'Enable SSL certificate verification (set to false for testing with self-signed certs)'
    ),
});

export type Env = z.infer<typeof EnvSchema>;

export async function loadEnv(): Promise<Env> {
  // dotenv is optional; only used in dev. In production, rely on real env vars.
  try {
    const { config } = await import('dotenv');
    config();
  } catch {
    // ignore if dotenv is not present
  }
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
}
