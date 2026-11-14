import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ReadingsService } from './readings.service';
import { CreateReadingDto } from './dto/create-reading.dto';

@Controller('devices/:deviceId/readings')
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Post()
  create(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: CreateReadingDto,
  ) {
    return this.readingsService.create(deviceId, dto);
  }

  @Get()
  findAll(@Param('deviceId', ParseUUIDPipe) deviceId: string) {
    return this.readingsService.findAllForDevice(deviceId);
  }
}
