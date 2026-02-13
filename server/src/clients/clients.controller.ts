import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ClientsService } from './clients.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Post(':id/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Array<any>, // Using any to avoid Multer type issues, handled in service
  ) {
    return this.clientsService.uploadImages(id, files);
  }

  @Post(':id/logo')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('file', 1)) // Expecting a single file with field name 'file'
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Array<any>,
  ) {
    // FilesInterceptor returns an array, so we take the first one
    return this.clientsService.uploadLogo(id, files[0]);
  }

  @Delete(':id/images')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    await this.clientsService.removeImage(id, imageUrl);
  }
}
