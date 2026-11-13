import { Transform, Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReadingDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  metric: string;

  @Type(() => Number)
  @IsNumber()
  value: number;

  @IsOptional()
  @IsISO8601()
  recordedAt?: string;
}
