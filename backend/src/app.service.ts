
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Sanika’s Boutique API is running!';
  }
}
