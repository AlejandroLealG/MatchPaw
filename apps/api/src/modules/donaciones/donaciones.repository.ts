import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DonacionEstado } from '@matchpaw/shared';
import { Donacion, DonacionDocument } from './schemas/donacion.schema';
import {
  SuscripcionDonacion,
  SuscripcionDonacionDocument,
} from './schemas/suscripcion-donacion.schema';

export interface PaginatedDonaciones {
  data: DonacionDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DonacionesRepository {
  constructor(
    @InjectModel(Donacion.name)
    private readonly donacionModel: Model<DonacionDocument>,
    @InjectModel(SuscripcionDonacion.name)
    private readonly suscripcionModel: Model<SuscripcionDonacionDocument>,
  ) {}

  async create(data: Partial<Donacion>): Promise<DonacionDocument> {
    return this.donacionModel.create(data);
  }

  async findById(id: string): Promise<DonacionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.donacionModel.findById(id).exec();
  }

  async findByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<DonacionDocument | null> {
    return this.donacionModel.findOne({ stripePaymentIntentId }).exec();
  }

  /**
   * Retorna solo donaciones completadas del refugio, ordenadas por createdAt desc,
   * con el donante populado (campo email).
   */
  async findByRefugio(
    refugioId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedDonaciones> {
    if (!Types.ObjectId.isValid(refugioId)) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const filter = {
      refugioId: new Types.ObjectId(refugioId),
      estado: 'completada',
    };

    const [data, total] = await Promise.all([
      this.donacionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('donanteId', 'email')
        .exec(),
      this.donacionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateEstado(id: string, estado: DonacionEstado): Promise<DonacionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.donacionModel.findByIdAndUpdate(id, { $set: { estado } }, { new: true }).exec();
  }

  async createSuscripcion(
    data: Partial<SuscripcionDonacion>,
  ): Promise<SuscripcionDonacionDocument> {
    return this.suscripcionModel.create(data);
  }

  async cancelarSuscripcion(id: string): Promise<SuscripcionDonacionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.suscripcionModel
      .findByIdAndUpdate(id, { $set: { estado: 'cancelada' } }, { new: true })
      .exec();
  }

  async findSuscripcionById(id: string): Promise<SuscripcionDonacionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.suscripcionModel.findById(id).exec();
  }
}
