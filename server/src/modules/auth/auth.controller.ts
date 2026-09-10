import { loginSchema, registerSchema } from './auth.schema';
import { AuthService } from './auth.service';
import type { AuthTokenPayload } from './auth.types';

type JwtSigner = {
  sign: (payload: AuthTokenPayload) => Promise<string>;
};

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(body: unknown, jwt: JwtSigner) {
    const input = registerSchema.parse(body);
    const user = await this.authService.register(input);
    const token = await this.authService.generateToken(jwt, user);

    return {
      user,
      token,
    };
  }

  async login(body: unknown, jwt: JwtSigner) {
    const input = loginSchema.parse(body);
    const user = await this.authService.login(input);
    const token = await this.authService.generateToken(jwt, user);

    return {
      user,
      token,
    };
  }

  async me(userId: string) {
    const user = await this.authService.getUserById(userId);
    return user;
  }
}
