import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, display_name } = signUpDto;
    
    this.logger.log(`Attempting to sign up user: ${email}`);

    const { data, error } = await this.supabaseService.getClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: display_name,
        },
      },
    });

    if (error) {
      this.logger.error(`Sign up failed for ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`User signed up successfully: ${email}`);
    return data;
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    this.logger.log(`Attempting to sign in user: ${email}`);

    const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.logger.error(`Sign in failed for ${email}: ${error.message}`);
      throw new UnauthorizedException(error.message);
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await this.supabaseService.getClient()
      .from('user_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    if (profileError) {
      this.logger.error(`Failed to fetch profile for ${email}: ${profileError.message}`);
      await this.supabaseService.getClient().auth.signOut();
      throw new UnauthorizedException('Failed to verify user role');
    }

    if (profile?.role !== 'admin') {
      this.logger.warn(`User ${email} attempted login but is not an admin (role: ${profile?.role})`);
      await this.supabaseService.getClient().auth.signOut();
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    this.logger.log(`User signed in successfully: ${email}`);
    return data;
  }
}
