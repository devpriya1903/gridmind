import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateDeviceDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsIn(['online', 'offline', 'fault'])
  status?: string;
}