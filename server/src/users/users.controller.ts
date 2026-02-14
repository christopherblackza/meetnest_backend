import { Controller, Get, Post, Patch, Query, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';
import { UserRoleResponseDto } from './dto/user-role-response.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateVerificationStatusDto } from './dto/update-verification-status.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get users list',
    description: 'Retrieve a paginated list of users with optional filtering by search term, location, gender, age range, status, role, verification, trust score, and date.'
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

  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Retrieve overall user statistics including total count, active users, verified users, and average trust score.'
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: UserStatsDto,
  })
  async getUserStats(): Promise<UserStatsDto> {
    this.logger.log('GET /users/stats called');
    return this.usersService.getUserStats();
  }

  @Get('analytics/overview')
  @ApiOperation({ 
    summary: 'Get analytics overview',
    description: 'Retrieve analytics overview data including total users, active users, subscriptions, and reports.'
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview retrieved successfully',
  })
  async getAnalyticsOverview(@Query() filter: AnalyticsFilterDto) {
    this.logger.log('GET /users/analytics/overview called', filter);
    return this.usersService.getAnalyticsOverview(filter);
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

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update user status',
    description: 'Update the status of a user (active, suspended, banned).'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: 200, description: 'User status updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`PATCH /users/${id}/status called`, updateDto);
    return this.usersService.updateUserStatus(id, updateDto);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'Update user role',
    description: 'Update the role of a user (user, moderator, admin).'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`PATCH /users/${id}/role called`, updateDto);
    return this.usersService.updateUserRole(id, updateDto);
  }

  @Patch(':id/verify')
  @ApiOperation({
    summary: 'Update verification status',
    description: 'Update the verification status of a user.'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateVerificationStatusDto })
  @ApiResponse({ status: 200, description: 'Verification status updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateVerificationStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateVerificationStatusDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`PATCH /users/${id}/verify called`, updateDto);
    return this.usersService.updateVerificationStatus(id, updateDto);
  }

  @Post(':id/trust-score')
  @ApiOperation({
    summary: 'Recalculate trust score',
    description: 'Recalculate the trust score for a user based on their profile and activity.'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Trust score recalculated successfully', schema: { type: 'object', properties: { score: { type: 'number' } } } })
  @ApiResponse({ status: 404, description: 'User not found' })
  async recalculateTrustScore(@Param('id') id: string) {
    const score = await this.usersService.recalculateTrustScore(id);
    return { score };
  }
}
