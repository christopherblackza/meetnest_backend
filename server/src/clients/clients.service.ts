import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sharp from 'sharp';
import { Client } from './entities/client.entity';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    private supabaseService: SupabaseService,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const clientData = {
      ...createClientDto,
      latitude: createClientDto.latitude?.toString(),
      longitude: createClientDto.longitude?.toString(),
    };
    const client = this.clientsRepository.create(clientData);
    return await this.clientsRepository.save(client);
  }

  async findAll(): Promise<Client[]> {
    return await this.clientsRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    
    const updateData = {
      ...updateClientDto,
      latitude: updateClientDto.latitude?.toString(),
      longitude: updateClientDto.longitude?.toString(),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    this.clientsRepository.merge(client, updateData);
    return await this.clientsRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const result = await this.clientsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
  }

  async uploadImages(clientId: string, files: MulterFile[]): Promise<string[]> {
    const client = await this.clientsRepository.findOne({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const uploadedUrls: string[] = [];
    const clientNameSlug = client.name.toLowerCase().replace(/\s+/g, '_');

    for (const file of files) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      // Convert to WebP for optimization
      const extension = 'webp';
      const path = `${clientNameSlug}/${timestamp}-${randomString}.${extension}`;

      const optimizedBuffer = await sharp(file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const publicUrl = await this.supabaseService.uploadFile(
        'client-images',
        path,
        optimizedBuffer,
        'image/webp',
      );
      uploadedUrls.push(publicUrl);
    }

    // Append new URLs to existing ones
    const currentImages = client.imageUrls || [];
    client.imageUrls = [...currentImages, ...uploadedUrls];

    await this.clientsRepository.save(client);

    return uploadedUrls;
  }

  async uploadLogo(clientId: string, file: MulterFile): Promise<string> {
    const client = await this.clientsRepository.findOne({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Delete old logo if exists
    // We strictly await this operation before proceeding to upload to ensure sequential execution
    if (client.logoUrl) {
      try {
        const oldPath = client.logoUrl.split('/client-images/')[1];
        if (oldPath) {
          await this.supabaseService.deleteFile('client-images', oldPath);
        }
      } catch (error) {
        this.logger.error(`Failed to delete old logo: ${client.logoUrl}`, error.stack);
      }
    }

    const timestamp = Date.now();
    const clientNameSlug = client.name.toLowerCase().replace(/\s+/g, '_');
    const extension = 'webp';
    const path = `${clientNameSlug}/${timestamp}.${extension}`;

    const optimizedBuffer = await sharp(file.buffer)
      .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const publicUrl = await this.supabaseService.uploadFile(
      'client-images',
      path,
      optimizedBuffer,
      'image/webp',
    );

    client.logoUrl = publicUrl;
    await this.clientsRepository.save(client);

    return publicUrl;
  }

  async removeImage(clientId: string, imageUrl: string): Promise<void> {
    const client = await this.clientsRepository.findOne({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    if (client.imageUrls && client.imageUrls.includes(imageUrl)) {
      // Try to delete from storage
      try {
        const path = imageUrl.split('/client-images/')[1];
        if (path) {
          await this.supabaseService.deleteFile('client-images', path);
        } else {
            this.logger.warn(`Could not extract path from URL: ${imageUrl}`);
        }
      } catch (error) {
        this.logger.error(`Failed to delete file from storage: ${imageUrl}`, error.stack);
        // Continue to remove from DB even if storage deletion fails
      }

      client.imageUrls = client.imageUrls.filter(url => url !== imageUrl);
      await this.clientsRepository.save(client);
    }
  }
}
