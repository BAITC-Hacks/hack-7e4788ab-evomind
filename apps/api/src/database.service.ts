import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createMigratedDatabase } from '@evomind/db';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly connection = createMigratedDatabase();
  readonly db = this.connection.db;

  onModuleDestroy() {
    this.connection.sqlite.close();
  }
}
