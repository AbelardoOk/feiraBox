import { prisma } from '../../database/prisma';
import { hashPassword, verifyPassword } from '../../shared/utils/hash';

import type { LoginInput, RegisterInput } from './auth.schema';
import type { AuthTokenPayload } from './auth.types';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (existingUser) {
      throw new Error('E-mail já cadastrado');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (!user) {
      throw new Error('E-mail ou senha inválidos');
    }

    const passwordValid = await verifyPassword(user.passwordHash, input.password);

    if (!passwordValid) {
      throw new Error('E-mail ou senha inválidos');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,

        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  async generateToken(
    jwt: {
      sign: (payload: AuthTokenPayload) => Promise<string>;
    },
    user: {
      id: string;
      email: string;
    },
  ) {
    return jwt.sign({
      sub: user.id,
      email: user.email,
    });
  }
}
