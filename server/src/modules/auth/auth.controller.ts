import { loginSchema, registerSchema } from './auth.schema';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(body: unknown) {
    const input = registerSchema.parse(body);
    const user = await this.authService.register(input);

    return {
      user,
    };
  }

  async login(body: unknown) {
    const input = loginSchema.parse(body);
    const user = await this.authService.login(input);

    return {
      user,
    };
  }
}
