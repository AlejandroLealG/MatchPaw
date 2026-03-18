import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AnimalFilterDto, CreateAnimalDto, UpdateAnimalDto } from '@matchpaw/shared';
import { JwtAuthGuard, Public, Roles, RolesGuard } from '../../common/guards';
import { JwtPayload } from '../auth/auth.service';
import {
  AnimalesService,
  AnimalWithRefugio,
  PaginatedAnimalesDto,
} from './animales.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('animales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnimalesController {
  constructor(private readonly animalesService: AnimalesService) {}

  /** GET /animales — Búsqueda paginada con filtros (público) */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: AnimalFilterDto): Promise<PaginatedAnimalesDto> {
    return this.animalesService.buscar(query);
  }

  /** POST /animales — Publicar animal (solo refugio verificado) */
  @Post()
  @Roles('refugio')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAnimalDto,
    @Req() req: AuthRequest,
  ): Promise<AnimalWithRefugio> {
    const doc = await this.animalesService.publicar(req.user.sub, dto);
    return this.animalesService.findById(doc._id.toString());
  }

  /** GET /animales/:id — Perfil detallado (público) */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<AnimalWithRefugio> {
    return this.animalesService.findById(id);
  }

  /** PUT /animales/:id — Editar animal (solo refugio propietario) */
  @Put(':id')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
    @Req() req: AuthRequest,
  ): Promise<AnimalWithRefugio> {
    await this.animalesService.editar(id, req.user.sub, dto);
    return this.animalesService.findById(id);
  }

  /** PATCH /animales/:id/estado — Cambio rápido de estado (solo refugio propietario) */
  @Patch(':id/estado')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async updateEstado(
    @Param('id') id: string,
    @Body() body: { estado: 'disponible' | 'en_proceso' | 'adoptado' },
    @Req() req: AuthRequest,
  ): Promise<AnimalWithRefugio> {
    await this.animalesService.cambiarEstado(id, req.user.sub, body.estado);
    return this.animalesService.findById(id);
  }
}
