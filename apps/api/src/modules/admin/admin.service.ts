import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Model, Types } from 'mongoose';
import { RefugioEstado } from '@matchpaw/shared';
import { RefugiosRepository } from '../refugios/refugios.repository';
import { RefugioDocument } from '../refugios/schemas/refugio.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { DonacionDocument } from '../donaciones/schemas/donacion.schema';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly refugiosRepo: RefugiosRepository,
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
    @InjectModel('Donacion')
    private readonly donacionModel: Model<DonacionDocument>,
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  // ── Refugios ──────────────────────────────────────────────────────────────

  async listarRefugios(estado?: RefugioEstado): Promise<RefugioDocument[]> {
    if (estado) {
      return this.refugiosRepo.findByEstado(estado);
    }
    // Sin filtro: retornar todos
    return this.refugiosRepo.findByEstado('pendiente_verificacion').then(async (pendientes) => {
      const [verificados, rechazados, suspendidos] = await Promise.all([
        this.refugiosRepo.findByEstado('verificado'),
        this.refugiosRepo.findByEstado('rechazado'),
        this.refugiosRepo.findByEstado('suspendido'),
      ]);
      return [...pendientes, ...verificados, ...rechazados, ...suspendidos];
    });
  }

  async verificarRefugio(
    refugioId: string,
    accion: 'aprobar' | 'rechazar',
    motivo?: string,
  ): Promise<RefugioDocument> {
    const refugio = await this.refugiosRepo.findById(refugioId);
    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }

    const nuevoEstado: RefugioEstado = accion === 'aprobar' ? 'verificado' : 'rechazado';

    if (accion === 'rechazar' && !motivo) {
      throw new BadRequestException({
        error: {
          code: 'MOTIVO_REQUERIDO',
          message: 'Se requiere un motivo para rechazar un refugio',
        },
      });
    }

    const updated = await this.refugiosRepo.update(refugioId, {
      estado: nuevoEstado,
      motivoRechazo: accion === 'rechazar' ? (motivo ?? null) : null,
    });

    // Encolar email de notificación al refugio
    const refugioUser = await this.userModel.findById(refugio.userId).exec();

    if (refugioUser) {
      await this.emailQueue.add('verificacion-refugio', {
        refugioUserId: refugio.userId.toString(),
        refugioNombre: refugio.nombre,
        accion,
        motivo: motivo ?? null,
        to: refugioUser.email,
      });
    }

    return updated!;
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────

  async listarUsuarios(page: number, limit: number): Promise<PaginatedResult<UserDocument>> {
    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cambiarEstadoUsuario(
    userId: string,
    accion: 'suspender' | 'activar',
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException({
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }

    const activo = accion === 'activar';
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set: { activo } }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException({
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }

    return updated;
  }

  // ── Donaciones ────────────────────────────────────────────────────────────

  async listarDonaciones(page: number, limit: number): Promise<PaginatedResult<DonacionDocument>> {
    const [data, total] = await Promise.all([
      this.donacionModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('refugioId', 'nombre')
        .populate('donanteId', 'email')
        .exec(),
      this.donacionModel.countDocuments().exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
