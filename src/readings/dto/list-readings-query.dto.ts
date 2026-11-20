import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class ListReadingsQueryDto {
  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
