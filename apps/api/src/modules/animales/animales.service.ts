import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnimalFilterDto, CreateAnimalDto, IAnimal, UpdateAnimalDto } from '@matchpaw/shared';
import { AnimalesRepository, PaginatedAnimales } from './animales.repository';
import { AnimalDocument } from './schemas/animal.schema';
import { RefugioDocument } from '../refugios/schemas/refugio.schema';

export interface AnimalWithRefugio extends IAnimal {
  refugio: {
    nombre: string;
    telefono: string;
    ciudad: string;
  };
  canRequest: boolean;
}

export interface PaginatedAnimalesDto {
  data: AnimalWithRefugio[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AnimalesService {
  constructor(
    private readonly repo: AnimalesRepository,
    @InjectModel('Refugio')
    private readonly refugioModel: Model<RefugioDocument>,
  ) {}

  // ── Publicar animal ───────────────────────────────────────────────────────

  async publicar(requestingUserId: string, dto: CreateAnimalDto): Promise<AnimalDocument> {
    const refugio = await this.refugioModel
      .findOne({ userId: new Types.ObjectId(requestingUserId) })
      .exec();

    if (!refugio) {
      throw new NotFoundException({
        error: {
          code: 'REFUGIO_NOT_FOUND',
          message: 'No tienes un perfil de refugio registrado',
        },
      });
    }

    if (refugio.estado !== 'verificado') {
      throw new ForbiddenException({
        error: {
          code: 'REFUGIO_NOT_VERIFIED',
          message: 'Tu refugio debe estar verificado para publicar animales',
        },
      });
    }

    this.validateCamposObligatorios(dto);

    return this.repo.create(refugio._id.toString(), dto);
  }

  // ── Editar animal ─────────────────────────────────────────────────────────

  async editar(
    animalId: string,
    requestingUserId: string,
    dto: UpdateAnimalDto,
  ): Promise<AnimalDocument> {
    const animal = await this.findByIdOrFail(animalId);
    await this.assertRefugioPropietario(animal, requestingUserId);

    const updated = await this.repo.update(animalId, dto);
    return updated!;
  }

  // ── Cambiar estado ────────────────────────────────────────────────────────

  async cambiarEstado(
    animalId: string,
    requestingUserId: string,
    estado: 'disponible' | 'en_proceso' | 'adoptado',
  ): Promise<AnimalDocument> {
    const animal = await this.findByIdOrFail(animalId);
    await this.assertRefugioPropietario(animal, requestingUserId);

    const updated = await this.repo.updateEstado(animalId, estado);
    return updated!;
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────

  async buscar(filters: AnimalFilterDto): Promise<PaginatedAnimalesDto> {
    // Obtener IDs de refugios verificados (filtrando por ciudad si aplica)
    const refugioQuery: Record<string, unknown> = { estado: 'verificado' };
    if (filters.ciudad) refugioQuery.ciudad = new RegExp(filters.ciudad, 'i');

    const refugiosVerificados = await this.refugioModel
      .find(refugioQuery, { _id: 1, nombre: 1, telefono: 1, ciudad: 1 })
      .lean()
      .exec();

    const verificadosIds = refugiosVerificados.map((r) => r._id as Types.ObjectId);

    if (verificadosIds.length === 0) {
      const page = Math.max(1, filters.page ?? 1);
      const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const result: PaginatedAnimales = await this.repo.findAll(filters, verificadosIds);

    // Construir mapa de refugios para enriquecer la respuesta
    const refugioMap = new Map(
      refugiosVerificados.map((r) => [
        (r._id as Types.ObjectId).toString(),
        r as { nombre: string; telefono: string; ciudad: string },
      ]),
    );

    const data: AnimalWithRefugio[] = result.data.map((doc) => {
      const refugioInfo = refugioMap.get(doc.refugioId.toString()) ?? {
        nombre: '',
        telefono: '',
        ciudad: '',
      };
      return {
        ...this.toDto(doc),
        refugio: {
          nombre: refugioInfo.nombre,
          telefono: refugioInfo.telefono,
          ciudad: refugioInfo.ciudad,
        },
        canRequest: doc.estado === 'disponible',
      };
    });

    return { ...result, data };
  }

  // ── Detalle ───────────────────────────────────────────────────────────────

  async findById(id: string): Promise<AnimalWithRefugio> {
    const animal = await this.findByIdOrFail(id);

    const refugio = await this.refugioModel.findById(animal.refugioId).lean().exec();

    const refugioInfo = refugio
      ? {
          nombre: (refugio as { nombre: string }).nombre,
          telefono: (refugio as { telefono: string }).telefono,
          ciudad: (refugio as { ciudad: string }).ciudad,
        }
      : { nombre: '', telefono: '', ciudad: '' };

    return {
      ...this.toDto(animal),
      refugio: refugioInfo,
      canRequest: animal.estado === 'disponible',
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findByIdOrFail(id: string): Promise<AnimalDocument> {
    const animal = await this.repo.findById(id);
    if (!animal) {
      throw new NotFoundException({
        error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal no encontrado' },
      });
    }
    return animal;
  }

  private async assertRefugioPropietario(
    animal: AnimalDocument,
    requestingUserId: string,
  ): Promise<void> {
    const refugio = await this.refugioModel.findById(animal.refugioId).lean().exec();

    if (
      !refugio ||
      (refugio as { userId: Types.ObjectId }).userId.toString() !== requestingUserId
    ) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para modificar este animal',
        },
      });
    }
  }

  private validateCamposObligatorios(dto: CreateAnimalDto): void {
    const faltantes: string[] = [];

    if (!dto.nombre?.trim()) faltantes.push('nombre');
    if (!dto.especie) faltantes.push('especie');
    if (!dto.raza?.trim()) faltantes.push('raza');
    if (dto.edadMeses === undefined || dto.edadMeses === null) faltantes.push('edadMeses');
    if (!dto.sexo) faltantes.push('sexo');
    if (!dto.tamano) faltantes.push('tamano');
    if (!dto.descripcion?.trim()) faltantes.push('descripcion');
    if (!dto.estadoSalud?.trim()) faltantes.push('estadoSalud');
    if (!dto.fotos || dto.fotos.length === 0) faltantes.push('fotos');

    if (faltantes.length > 0) {
      throw new BadRequestException({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Faltan campos obligatorios',
          details: faltantes,
        },
      });
    }
  }

  toDto(doc: AnimalDocument): IAnimal {
    return {
      _id: doc._id.toString(),
      refugioId: doc.refugioId.toString(),
      nombre: doc.nombre,
      especie: doc.especie,
      raza: doc.raza,
      edadMeses: doc.edadMeses,
      sexo: doc.sexo,
      tamano: doc.tamano,
      descripcion: doc.descripcion,
      estadoSalud: doc.estadoSalud,
      vacunado: doc.vacunado,
      esterilizado: doc.esterilizado,
      estado: doc.estado,
      fotos: doc.fotos,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
