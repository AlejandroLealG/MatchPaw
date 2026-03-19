import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Model, Types } from 'mongoose';
import { CreateSolicitudDto, ISolicitud, UpdateSolicitudEstadoDto } from '@matchpaw/shared';
import { SolicitudesRepository } from './solicitudes.repository';
import { SolicitudDocument } from './schemas/solicitud.schema';
import { AnimalDocument } from '../animales/schemas/animal.schema';
import { RefugioDocument } from '../refugios/schemas/refugio.schema';
import { Notificacion, NotificacionDocument } from '../notificaciones/schemas/notificacion.schema';

export interface SolicitudDto extends ISolicitud {
  animal?: {
    _id: string;
    nombre: string;
    especie: string;
    fotos: { url: string; orden: number }[];
  };
  adoptante?: {
    _id: string;
    email: string;
  };
}

export interface SolicitudesPorAnimal {
  animalId: string;
  nombreAnimal: string;
  solicitudes: SolicitudDto[];
}

@Injectable()
export class SolicitudesService {
  constructor(
    private readonly repo: SolicitudesRepository,
    @InjectModel('Animal')
    private readonly animalModel: Model<AnimalDocument>,
    @InjectModel('Refugio')
    private readonly refugioModel: Model<RefugioDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  // ── Enviar solicitud ──────────────────────────────────────────────────────

  async enviar(adoptanteId: string, dto: CreateSolicitudDto): Promise<SolicitudDocument> {
    // Verificar que el animal existe y está disponible
    const animal = await this.animalModel.findById(dto.animalId).exec();
    if (!animal) {
      throw new NotFoundException({
        error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal no encontrado' },
      });
    }

    if (animal.estado !== 'disponible') {
      throw new ConflictException({
        error: {
          code: 'ANIMAL_NOT_AVAILABLE',
          message: 'Este animal no está disponible para adopción',
        },
      });
    }

    // Verificar duplicado activo — Requisito 5.6
    const duplicado = await this.repo.findActiveByAnimalAndAdoptante(dto.animalId, adoptanteId);
    if (duplicado) {
      throw new ConflictException({
        error: {
          code: 'SOLICITUD_DUPLICADA',
          message: 'Ya tienes una solicitud activa para este animal',
        },
      });
    }

    const solicitud = await this.repo.create(adoptanteId, dto);

    // Obtener refugio para notificación
    const refugio = await this.refugioModel.findById(animal.refugioId).exec();

    // Encolar email al refugio — Requisito 5.1
    if (refugio) {
      await this.emailQueue.add('nueva-solicitud-refugio', {
        to: null, // el procesador resolverá el email del userId del refugio
        refugioUserId: refugio.userId.toString(),
        animalNombre: animal.nombre,
        solicitudId: solicitud._id.toString(),
      });

      // Crear notificación en DB para el refugio — Requisito 8.2
      await this.notificacionModel.create({
        userId: refugio.userId,
        tipo: 'nueva_solicitud',
        titulo: 'Nueva solicitud de adopción',
        cuerpo: `Tienes una nueva solicitud para ${animal.nombre}`,
        leida: false,
      });
    }

    return solicitud;
  }

  // ── Cambiar estado ────────────────────────────────────────────────────────

  async cambiarEstado(
    solicitudId: string,
    requestingUserId: string,
    dto: UpdateSolicitudEstadoDto,
  ): Promise<SolicitudDocument> {
    const solicitud = await this.findByIdOrFail(solicitudId);

    // Solo el refugio propietario del animal puede cambiar el estado
    await this.assertRefugioPropietario(solicitud, requestingUserId);

    if (solicitud.estado !== 'pendiente') {
      throw new ConflictException({
        error: {
          code: 'SOLICITUD_YA_PROCESADA',
          message: 'Esta solicitud ya fue procesada',
        },
      });
    }

    const updated = await this.repo.updateEstado(solicitudId, dto.estado, dto.motivo);

    const animal = await this.animalModel.findById(solicitud.animalId).exec();
    const animalNombre = animal?.nombre ?? 'el animal';

    // Encolar email al adoptante — Requisito 5.3
    await this.emailQueue.add('cambio-estado-solicitud', {
      adoptanteUserId: solicitud.adoptanteId.toString(),
      estado: dto.estado,
      animalNombre,
      motivo: dto.motivo,
      solicitudId,
    });

    // Crear notificación en DB para el adoptante — Requisito 8.2
    const estadoTexto = dto.estado === 'aprobada' ? 'aprobada' : 'rechazada';
    await this.notificacionModel.create({
      userId: solicitud.adoptanteId,
      tipo: 'cambio_estado_solicitud',
      titulo: `Solicitud ${estadoTexto}`,
      cuerpo: `Tu solicitud para ${animalNombre} fue ${estadoTexto}`,
      leida: false,
    });

    // Si se aprueba y el animal pasa a adoptado, notificar al adoptante — Propiedad 6
    if (dto.estado === 'aprobada' && animal) {
      await this.animalModel
        .findByIdAndUpdate(animal._id, { $set: { estado: 'en_proceso' } })
        .exec();
    }

    return updated!;
  }

  // ── Marcar animal como adoptado (llamado desde AnimalesModule) ────────────

  async onAnimalAdoptado(animalId: string): Promise<void> {
    const solicitudAprobada = await this.repo.findAprobadaByAnimal(animalId);
    if (!solicitudAprobada) return;

    const animal = await this.animalModel.findById(animalId).exec();
    const animalNombre = animal?.nombre ?? 'el animal';

    // Notificación al adoptante cuya solicitud fue aprobada — Propiedad 6
    await this.notificacionModel.create({
      userId: solicitudAprobada.adoptanteId,
      tipo: 'animal_adoptado',
      titulo: '¡Felicitaciones!',
      cuerpo: `${animalNombre} ha sido marcado como adoptado`,
      leida: false,
    });
  }

  // ── Historial adoptante ───────────────────────────────────────────────────

  async historialAdoptante(adoptanteId: string): Promise<SolicitudDto[]> {
    const docs = await this.repo.findByAdoptante(adoptanteId);
    return docs.map((doc) => this.toDto(doc));
  }

  // ── Historial refugio agrupado por animal ─────────────────────────────────

  async historialRefugio(requestingUserId: string): Promise<SolicitudesPorAnimal[]> {
    const refugio = await this.refugioModel
      .findOne({ userId: new Types.ObjectId(requestingUserId) })
      .exec();

    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }

    // Obtener animales del refugio
    const animales = await this.animalModel
      .find({ refugioId: refugio._id }, { _id: 1, nombre: 1 })
      .lean()
      .exec();

    if (animales.length === 0) return [];

    const animalIds = animales.map((a) => a._id as Types.ObjectId);
    const solicitudes = await this.repo.findByRefugio(animalIds);

    // Agrupar por animal
    const mapa = new Map<string, SolicitudesPorAnimal>();
    for (const a of animales) {
      mapa.set((a._id as Types.ObjectId).toString(), {
        animalId: (a._id as Types.ObjectId).toString(),
        nombreAnimal: (a as { nombre: string }).nombre,
        solicitudes: [],
      });
    }

    for (const sol of solicitudes) {
      const key = sol.animalId.toString();
      const grupo = mapa.get(key);
      if (grupo) {
        grupo.solicitudes.push(this.toDto(sol));
      }
    }

    // Solo retornar animales que tienen al menos una solicitud
    return Array.from(mapa.values()).filter((g) => g.solicitudes.length > 0);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findByIdOrFail(id: string): Promise<SolicitudDocument> {
    const sol = await this.repo.findById(id);
    if (!sol) {
      throw new NotFoundException({
        error: { code: 'SOLICITUD_NOT_FOUND', message: 'Solicitud no encontrada' },
      });
    }
    return sol;
  }

  private async assertRefugioPropietario(
    solicitud: SolicitudDocument,
    requestingUserId: string,
  ): Promise<void> {
    const animal = await this.animalModel.findById(solicitud.animalId).exec();
    if (!animal) {
      throw new NotFoundException({
        error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal no encontrado' },
      });
    }

    const refugio = await this.refugioModel.findById(animal.refugioId).exec();
    if (!refugio || refugio.userId.toString() !== requestingUserId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para gestionar esta solicitud',
        },
      });
    }
  }

  toDto(doc: SolicitudDocument): SolicitudDto {
    const raw = doc as SolicitudDocument & {
      animalId: Types.ObjectId & {
        nombre?: string;
        especie?: string;
        fotos?: { url: string; orden: number }[];
      };
      adoptanteId: Types.ObjectId & { email?: string };
    };

    const dto: SolicitudDto = {
      _id: doc._id.toString(),
      animalId: doc.animalId.toString(),
      adoptanteId: doc.adoptanteId?.toString() ?? '',
      estado: doc.estado,
      descripcionHogar: doc.descripcionHogar,
      experienciaMascotas: doc.experienciaMascotas,
      motivoRefugio: doc.motivoRefugio,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };

    // Si el campo fue populado por Mongoose
    if (raw.animalId?.nombre) {
      dto.animal = {
        _id: doc.animalId.toString(),
        nombre: raw.animalId.nombre,
        especie: raw.animalId.especie ?? '',
        fotos: raw.animalId.fotos ?? [],
      };
    }

    if (raw.adoptanteId?.email) {
      dto.adoptante = {
        _id: doc.adoptanteId.toString(),
        email: raw.adoptanteId.email,
      };
    }

    return dto;
  }
}
