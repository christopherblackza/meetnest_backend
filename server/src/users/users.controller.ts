import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';
import { UserRoleResponseDto } from './dto/user-role-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get users list',
    description: 'Retrieve a paginated list of users with optional filtering by search term, location, gender, and age range.'
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
    type: UsersListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUsers(@Query() query: GetUsersQueryDto): Promise<UsersListResponseDto> {
    this.logger.log('GET /users called', { query });
    return this.usersService.getUsers(query);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID.'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    this.logger.log(`GET /users/${id} called`);
    return this.usersService.getUserById(id);
  }

  @Get(':id/role')
  @ApiOperation({ 
    summary: 'Get user role by ID',
    description: 'Retrieve the role of a specific user by their ID.'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'User role retrieved successfully',
    type: UserRoleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserRole(@Param('id') id: string): Promise<UserRoleResponseDto> {
    this.logger.log(`GET /users/${id}/role called`);
    return this.usersService.getUserRole(id);
  }
}