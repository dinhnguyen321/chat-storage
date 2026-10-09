// src/modules/auth/jwt.strategy.ts (ở chat-storage)
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Lấy token từ Cookie có tên 'access_token'
      jwtFromRequest: (req: Request) => {
        if (req && req.cookies && req.cookies['access_token']) {
          return req.cookies['access_token'];
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-shared-jwt-secret', // Phải khớp với SECRET của auth-service
    });
  }

  // Giải mã token và trả về thông tin user
  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    // Payload chứa thông tin do auth-service mã hóa
    return { userId: payload.sub || payload.userId };
  }
}