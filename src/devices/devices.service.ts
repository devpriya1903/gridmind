import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Device, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeviceDto) {
    try {
      return await this.prisma.device.create({ data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A device named "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<Device[]> {
    return await this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }
}
