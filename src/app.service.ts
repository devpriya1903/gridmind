import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  getHello2(): string {
    console.log('inside getHello2');
    return 'Hello World 2!';
  }
}
