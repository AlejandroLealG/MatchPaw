import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AnimalFilterDto, CreateAnimalDto, UpdateAnimalDto } from '@matchpaw/shared';
import { Animal, AnimalDocument } from './schemas/animal.schema';

export interface PaginatedAnimales {
  data: AnimalDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AnimalesRepository {
  constructor(
    @InjectModel(Animal.name)
    private readonly animalModel: Model<AnimalDocument>,
  ) {}

  async create(refugioId: string, dto: CreateAnimalDto): Promise<AnimalDocument> {
    const animal = new this.animalModel({
      ...dto,
      refugioId: new Types.ObjectId(refugioId),
    });
    return animal.save();
  }

  async findById(id: string): Promise<AnimalDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.animalModel.findById(id).exec();
  }

  /**
   * Búsqueda paginada con filtros.
   * Solo retorna animales de refugios con estado `verificado`.
   * El join con refugios se hace mediante $lookup para filtrar por estado.
   */
  async findAll(
    filters: AnimalFilterDto,
    verificadosIds: Types.ObjectId[],
  ): Promise<PaginatedAnimales> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<AnimalDocument> = {
      estado: 'disponible',
      refugioId: { $in: verificadosIds },
    };

    if (filters.especie) query.especie = filters.especie;
    if (filters.sexo) query.sexo = filters.sexo;
    if (filters.tamano) query.tamano = filters.tamano;
    if (filters.raza) query.raza = new RegExp(filters.raza, 'i');

    if (filters.edadMinMeses !== undefined || filters.edadMaxMeses !== undefined) {
      query.edadMeses = {};
      if (filters.edadMinMeses !== undefined) query.edadMeses.$gte = filters.edadMinMeses;
      if (filters.edadMaxMeses !== undefined) query.edadMeses.$lte = filters.edadMaxMeses;
    }

    // Búsqueda full-text
    if (filters.q) {
      query.$text = { $search: filters.q };
    }

    const sortOrder = filters.orderBy === 'antiguo' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.animalModel.find(query).sort({ createdAt: sortOrder }).skip(skip).limit(limit).exec(),
      this.animalModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: UpdateAnimalDto): Promise<AnimalDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.animalModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
  }

  async updateEstado(
    id: string,
    estado: 'disponible' | 'en_proceso' | 'adoptado',
  ): Promise<AnimalDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.animalModel.findByIdAndUpdate(id, { $set: { estado } }, { new: true }).exec();
  }

  async findByRefugioId(refugioId: string): Promise<AnimalDocument[]> {
    if (!Types.ObjectId.isValid(refugioId)) return [];
    return this.animalModel.find({ refugioId: new Types.ObjectId(refugioId) }).exec();
  }
}
