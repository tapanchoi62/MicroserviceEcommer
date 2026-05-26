import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../services/auth.service';

/**
 * Local (email + password) Passport strategy.
 * Follows the same pattern as GitHub/Google OAuth strategies.
 *
 * Flow:
 *   POST /auth/login  →  LocalAuthGuard  →  validate()  →  req.user  →  controller
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // map "username" field → "email"
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateLocalUser(email, password);
    if (!user) {
      this.logger.warn(`Local auth failed for: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    return user; // attached to req.user by Passport
  }
}
