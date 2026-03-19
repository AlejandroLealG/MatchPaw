import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefugioEstado } from '@matchpaw/shared';
import { Refugio, RefugioDocument } from './schemas/refugio.schema';

@Injectable()
export class RefugiosRepository {
  constructor(
    @InjectModel(Refugio.name)
    private readonly refugioModel: Model<RefugioDocument>,
  ) {}

  async create(data: {
    userId: string;
    nombre: string;
    descripcion: string;
    ciudad: string;
    direccion: string;
    telefono: string;
    fotoUrl?: string;
  }): Promise<RefugioDocument> {
    const refugio = new this.refugioModel({
      userId: new Types.ObjectId(data.userId),
      nombre: data.nombre,
      descripcion: data.descripcion,
      ciudad: data.ciudad,
      direccion: data.direccion,
      telefono: data.telefono,
      fotoUrl: data.fotoUrl ?? null,
    });
    return refugio.save();
  }

  async findById(id: string): Promise<RefugioDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.refugioModel.findById(id).exec();
  }

  async findByUserId(userId: string): Promise<RefugioDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return this.refugioModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  async update(
    id: string,
    data: Partial<{
      nombre: string;
      descripcion: string;
      ciudad: string;
      direccion: string;
      telefono: string;
      fotoUrl: string | null;
      estado: RefugioEstado;
      motivoRechazo: string | null;
    }>,
  ): Promise<RefugioDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.refugioModel.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async findByEstado(estado: RefugioEstado): Promise<RefugioDocument[]> {
    return this.refugioModel.find({ estado }).exec();
  }
}
