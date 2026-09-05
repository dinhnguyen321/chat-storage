import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

@Injectable()
export class DatabaseService implements OnModuleInit{
    private readonly logger = new Logger(DatabaseService.name)

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    onModuleInit() {
        if(this.dataSource.isInitialized) {
        this.logger.log('✅ PostgreSQL connected successfully');
        } else {
        this.logger.error('❌ PostgreSQL connection failed');
        }
    }
}
