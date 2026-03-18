import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSolicitudDto, SolicitudEstado } from '@matchpaw/shared';
import { Solicitud, SolicitudDocument } from './schemas/solicitud.schema';

export interface SolicitudConAnimal extends SolicitudDocument {
  animal?: {
    _id: Types.ObjectId;
    nombre: string;
    especie: string;
    fotos: { url: string; orden: number }[];
    refugioId: Types.ObjectId;
  };
}

@Injectable()
export class SolicitudesRepository {
  constructor(
    @InjectModel(Solicitud.name)
    private readonly solicitudModel: Model<SolicitudDocument>,
  ) {}

  async create(
    adoptanteId: string,
    dto: CreateSolicitudDto,
  ): Promise<SolicitudDocument> {
    const solicitud = new this.solicitudModel({
      animalId: new Types.ObjectId(dto.animalId),
      adoptanteId: new Types.ObjectId(adoptanteId),
      descripcionHogar: dto.descripcionHogar,
      experienciaMascotas: dto.experienciaMascotas,
      motivoRefugio: dto.motivoRefugio,
    });
    return solicitud.save();
  }

  async findById(id: string): Promise<SolicitudDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.solicitudModel.findById(id).exec();
  }

  /** Historial del adoptante — todas sus solicitudes, más reciente primero */
  async findByAdoptante(adoptanteId: string): Promise<SolicitudConAnimal[]> {
    if (!Types.ObjectId.isValid(adoptanteId)) return [];
    return this.solicitudModel
      .find({ adoptanteId: new Types.ObjectId(adoptanteId) })
      .sort({ createdAt: -1 })
      .populate('animalId', 'nombre especie fotos refugioId')
      .exec() as unknown as SolicitudConAnimal[];
  }

  /**
   * Solicitudes recibidas por un refugio.
   * Retorna todas las solicitudes de animales que pertenecen al refugio,
   * con datos del adoptante, ordenadas de más reciente a más antigua.
   * Requisito 5.5, 7.2
   */
  async findByRefugio(
    animalIds: Types.ObjectId[],
  ): Promise<SolicitudDocument[]> {
    if (animalIds.length === 0) return [];
    return this.solicitudModel
      .find({ animalId: { $in: animalIds } })
      .sort({ createdAt: -1 })
      .populate('adoptanteId', 'email')
      .exec();
  }

  /** Verifica si existe una solicitud activa (pendiente o aprobada) para el par (animal, adoptante) */
  async findActiveByAnimalAndAdoptante(
    animalId: string,
    adoptanteId: string,
  ): Promise<SolicitudDocument | null> {
    if (!Types.ObjectId.isValid(animalId) || !Types.ObjectId.isValid(adoptanteId)) {
      return null;
    }
    return this.solicitudModel
      .findOne({
        animalId: new Types.ObjectId(animalId),
        adoptanteId: new Types.ObjectId(adoptanteId),
        estado: { $in: ['pendiente', 'aprobada'] },
      })
      .exec();
  }

  async updateEstado(
    id: string,
    estado: SolicitudEstado,
    motivoCambioEstado?: string,
  ): Promise<SolicitudDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.solicitudModel
      .findByIdAndUpdate(
        id,
        { $set: { estado, ...(motivoCambioEstado ? { motivoCambioEstado } : {}) } },
        { new: true },
      )
      .exec();
  }

  /** Solicitudes aprobadas de un animal (para notificar al adoptante al marcar adoptado) */
  async findAprobadaByAnimal(animalId: string): Promise<SolicitudDocument | null> {
    if (!Types.ObjectId.isValid(animalId)) return null;
    return this.solicitudModel
      .findOne({
        animalId: new Types.ObjectId(animalId),
        estado: 'aprobada',
      })
      .exec();
  }
}
