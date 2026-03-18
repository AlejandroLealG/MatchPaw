import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IRefugio } from '@matchpaw/shared';
import { RefugiosRepository } from './refugios.repository';
import { RefugioDocument } from './schemas/refugio.schema';

export interface UpdateRefugioDto {
  nombre?: string;
  descripcion?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  fotoUrl?: string | null;
}

export interface RefugioMetricas {
  totalAnimales: number;
  solicitudesPendientes: number;
  solicitudesAprobadas: number;
  donacionesDelMes: number;
}

@Injectable()
export class RefugiosService {
  constructor(
    private readonly repo: RefugiosRepository,
    // Models injected for cross-module metrics queries (AnimalesModule,
    // SolicitudesModule and DonacionesModule are not yet registered; we use
    // dynamic injection so the service compiles without those modules).
    @InjectModel('Animal')
    private readonly animalModel: Model<{ refugioId: Types.ObjectId }>,
    @InjectModel('Solicitud')
    private readonly solicitudModel: Model<{
      animalId: Types.ObjectId;
      estado: string;
    }>,
    @InjectModel('Donacion')
    private readonly donacionModel: Model<{
      refugioId: Types.ObjectId;
      estado: string;
      monto: number;
      createdAt: Date;
    }>,
  ) {}

  // ── Crear perfil ──────────────────────────────────────────────────────────

  async crearPerfil(
    userId: string,
    data: {
      nombre: string;
      descripcion: string;
      ciudad: string;
      direccion: string;
      telefono: string;
      fotoUrl?: string;
    },
  ): Promise<RefugioDocument> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw new ConflictException({
        error: {
          code: 'REFUGIO_ALREADY_EXISTS',
          message: 'Este usuario ya tiene un perfil de refugio',
        },
      });
    }
    return this.repo.create({ userId, ...data });
  }

  // ── Obtener perfil ────────────────────────────────────────────────────────

  async findById(id: string): Promise<RefugioDocument> {
    const refugio = await this.repo.findById(id);
    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }
    return refugio;
  }

  async findByUserId(userId: string): Promise<RefugioDocument> {
    const refugio = await this.repo.findByUserId(userId);
    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }
    return refugio;
  }

  // ── Editar perfil ─────────────────────────────────────────────────────────

  async editarPerfil(
    refugioId: string,
    requestingUserId: string,
    data: UpdateRefugioDto,
  ): Promise<RefugioDocument> {
    const refugio = await this.findById(refugioId);

    if (refugio.userId.toString() !== requestingUserId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para editar este refugio',
        },
      });
    }

    const updated = await this.repo.update(refugioId, data);
    return updated!;
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  async obtenerMetricas(
    refugioId: string,
    requestingUserId: string,
  ): Promise<RefugioMetricas> {
    const refugio = await this.findById(refugioId);

    if (refugio.userId.toString() !== requestingUserId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para ver las métricas de este refugio',
        },
      });
    }

    const refugioOid = new Types.ObjectId(refugioId);

    // Total animales publicados por este refugio
    const totalAnimales = await this.animalModel.countDocuments({
      refugioId: refugioOid,
    });

    // Obtener IDs de animales del refugio para consultar solicitudes
    const animalesIds = await this.animalModel
      .find({ refugioId: refugioOid }, { _id: 1 })
      .lean()
      .exec();
    const animalOids = animalesIds.map((a) => a._id);

    const [solicitudesPendientes, solicitudesAprobadas] = await Promise.all([
      this.solicitudModel.countDocuments({
        animalId: { $in: animalOids },
        estado: 'pendiente',
      }),
      this.solicitudModel.countDocuments({
        animalId: { $in: animalOids },
        estado: 'aprobada',
      }),
    ]);

    // Donaciones completadas en el mes en curso
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const donacionesDelMes = await this.donacionModel.countDocuments({
      refugioId: refugioOid,
      estado: 'completada',
      createdAt: { $gte: inicioMes },
    });

    return {
      totalAnimales,
      solicitudesPendientes,
      solicitudesAprobadas,
      donacionesDelMes,
    };
  }

  // ── Serializar a IRefugio ─────────────────────────────────────────────────

  toDto(doc: RefugioDocument): IRefugio {
    return {
      _id: doc._id.toString(),
      userId: doc.userId.toString(),
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      ciudad: doc.ciudad,
      direccion: doc.direccion,
      telefono: doc.telefono,
      fotoUrl: doc.fotoUrl ?? undefined,
      estado: doc.estado,
      motivoRechazo: doc.motivoRechazo ?? undefined,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
    };
  }
}
