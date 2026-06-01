import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedPassword',
    fullName: 'Test User',
    avatarUrl: null,
    status: 'active',
    userRoles: [{ role: { name: 'CUSTOMER' } }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            session: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'jwt.accessSecret': 'access_secret',
                'jwt.refreshSecret': 'refresh_secret',
                'jwt.accessExpires': '15m',
                'jwt.refreshExpires': '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            blacklistToken: jest.fn(),
            isTokenBlacklisted: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@example.com', password: 'Password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123',
        fullName: 'New User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.login({ email: 'notfound@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
