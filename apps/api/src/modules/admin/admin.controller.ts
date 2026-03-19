import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RefugioEstado } from '@matchpaw/shared';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/guards';
import { AdminService, PaginatedResult } from './admin.service';
import { RefugioDocument } from '../refugios/schemas/refugio.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { DonacionDocument } from '../donaciones/schemas/donacion.schema';

interface VerificarRefugioBody {
  accion: 'aprobar' | 'rechazar';
  motivo?: string;
}

interface CambiarEstadoUsuarioBody {
  accion: 'suspender' | 'activar';
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /admin/refugios?estado=pendiente_verificacion */
  @Get('refugios')
  @HttpCode(HttpStatus.OK)
  async listarRefugios(@Query('estado') estado?: RefugioEstado): Promise<RefugioDocument[]> {
    return this.adminService.listarRefugios(estado);
  }

  /** PATCH /admin/refugios/:id/verificar */
  @Patch('refugios/:id/verificar')
  @HttpCode(HttpStatus.OK)
  async verificarRefugio(
    @Param('id') id: string,
    @Body() body: VerificarRefugioBody,
  ): Promise<RefugioDocument> {
    return this.adminService.verificarRefugio(id, body.accion, body.motivo);
  }

  /** GET /admin/usuarios?page=1&limit=20 */
  @Get('usuarios')
  @HttpCode(HttpStatus.OK)
  async listarUsuarios(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<PaginatedResult<UserDocument>> {
    return this.adminService.listarUsuarios(
      Math.max(1, parseInt(page, 10)),
      Math.min(100, Math.max(1, parseInt(limit, 10))),
    );
  }

  /** PATCH /admin/usuarios/:id/estado */
  @Patch('usuarios/:id/estado')
  @HttpCode(HttpStatus.OK)
  async cambiarEstadoUsuario(
    @Param('id') id: string,
    @Body() body: CambiarEstadoUsuarioBody,
  ): Promise<UserDocument> {
    return this.adminService.cambiarEstadoUsuario(id, body.accion);
  }

  /** GET /admin/donaciones?page=1&limit=20 */
  @Get('donaciones')
  @HttpCode(HttpStatus.OK)
  async listarDonaciones(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<PaginatedResult<DonacionDocument>> {
    return this.adminService.listarDonaciones(
      Math.max(1, parseInt(page, 10)),
      Math.min(100, Math.max(1, parseInt(limit, 10))),
    );
  }
}
