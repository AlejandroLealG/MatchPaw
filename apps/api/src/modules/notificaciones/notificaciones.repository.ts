import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notificacion,
  NotificacionDocument,
  NotificacionTipo,
} from './schemas/notificacion.schema';
import { PushSubscription, PushSubscriptionDocument } from './schemas/push-subscription.schema';

export interface CreateNotificacionDto {
  userId: string;
  tipo: NotificacionTipo;
  titulo: string;
  cuerpo: string;
}

export interface SavePushSubscriptionDto {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

@Injectable()
export class NotificacionesRepository {
  constructor(
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    @InjectModel(PushSubscription.name)
    private readonly pushModel: Model<PushSubscriptionDocument>,
  ) {}

  async create(data: CreateNotificacionDto): Promise<NotificacionDocument> {
    return this.notificacionModel.create({
      userId: new Types.ObjectId(data.userId),
      tipo: data.tipo,
      titulo: data.titulo,
      cuerpo: data.cuerpo,
      leida: false,
    });
  }

  async findByUser(userId: string): Promise<NotificacionDocument[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    return this.notificacionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(id: string, userId: string): Promise<NotificacionDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) return null;
    return this.notificacionModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { leida: true } },
        { new: true },
      )
      .exec();
  }

  async savePushSubscription(data: SavePushSubscriptionDto): Promise<PushSubscriptionDocument> {
    // Upsert por endpoint — evita duplicados si el mismo dispositivo se re-registra
    return this.pushModel
      .findOneAndUpdate(
        { endpoint: data.endpoint },
        {
          $set: {
            userId: new Types.ObjectId(data.userId),
            p256dh: data.p256dh,
            auth: data.auth,
          },
        },
        { upsert: true, new: true },
      )
      .exec() as Promise<PushSubscriptionDocument>;
  }

  async deletePushSubscription(endpoint: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    await this.pushModel.deleteOne({ endpoint, userId: new Types.ObjectId(userId) }).exec();
  }

  async findPushSubscriptionsByUser(userId: string): Promise<PushSubscriptionDocument[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    return this.pushModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }
}
