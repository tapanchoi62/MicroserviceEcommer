import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // Generate TOTP secret and QR code
  async generateMfaSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(email, 'EcommerceApp', secret);
    const qrCode = await qrcode.toDataURL(otpAuthUrl);

    // Temporarily store secret until verified
    await this.redisService.set(`mfa:setup:${userId}`, secret, 300);

    return { secret, qrCode, otpAuthUrl };
  }

  // Verify and enable MFA
  async enableMfa(userId: string, otp: string): Promise<void> {
    const secret = await this.redisService.get(`mfa:setup:${userId}`);
    if (!secret) throw new BadRequestException('MFA setup session expired');

    const isValid = authenticator.verify({ token: otp, secret });
    if (!isValid) throw new BadRequestException('Invalid OTP code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: true, mfaSecret: secret },
    });

    await this.redisService.del(`mfa:setup:${userId}`);
  }

  // Validate TOTP during login
  async validateMfa(userId: string, otp: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new UnauthorizedException('MFA not configured');

    return authenticator.verify({ token: otp, secret: user.mfaSecret });
  }

  // Disable MFA
  async disableMfa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: false, mfaSecret: null },
    });
  }
}
