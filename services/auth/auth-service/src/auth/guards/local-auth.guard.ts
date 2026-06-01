import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for POST /auth/login.
 * Triggers LocalStrategy.validate(email, password) before the controller runs.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
