import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  Req,
  Request,
  Headers,
  UseGuards,
  HttpCode,
  RawBodyRequest,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { CreateDonacionDto, CreateSuscripcionDto } from '@matchpaw/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/decorators';
import { DonacionesService } from './donaciones.service';
import { JwtPayload } from '../auth/auth.service';

@Controller('donaciones')
export class DonacionesController {
  constructor(private readonly donacionesService: DonacionesService) {}

  // POST /donaciones — auth required (any authenticated user)
  @Post()
  @UseGuards(JwtAuthGuard)
  async crearDonacion(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Body() dto: CreateDonacionDto,
  ) {
    return this.donacionesService.crearPaymentIntent(req.user.sub, dto);
  }

  // POST /donaciones/webhook — NO auth, raw body needed
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.donacionesService.procesarWebhook(req.rawBody!, sig);
  }

  // POST /donaciones/recurrentes — auth required
  @Post('recurrentes')
  @UseGuards(JwtAuthGuard)
  async crearSuscripcion(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Body() dto: CreateSuscripcionDto,
  ) {
    return this.donacionesService.crearSuscripcion(req.user.sub, dto);
  }

  // DELETE /donaciones/recurrentes/:id — auth required
  @Delete('recurrentes/:id')
  @UseGuards(JwtAuthGuard)
  async cancelarSuscripcion(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.donacionesService.cancelarSuscripcion(id, req.user.sub);
  }

  // GET /donaciones/refugio — auth required (refugio role)
  @Get('refugio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('refugio')
  async historialRefugio(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.donacionesService.historialDonacionesByUserId(
      req.user.sub,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
