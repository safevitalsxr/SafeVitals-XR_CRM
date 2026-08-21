import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @MinLength(10, { message: 'MONGODB_URI is required and must be a valid connection string' })
  MONGODB_URI: string;

  @IsString()
  @MinLength(32, { message: 'SESSION_SECRET must be at least 32 characters (256-bit) for security' })
  SESSION_SECRET: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  @IsString()
  @IsOptional()
  SUPABASE_URL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsString()
  @IsOptional()
  SUPERADMIN_EMAIL?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GITHUB_CALLBACK_URL?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const errorMessages = errors.map(err => Object.values(err.constraints || {}).join(', ')).join('; ');
    throw new Error(`Environment validation failed: ${errorMessages}`);
  }
  return validatedConfig;
}

export { validateEnvironment as validateEnv };

