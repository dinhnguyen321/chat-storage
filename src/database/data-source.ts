import { DataSource } from "typeorm";
import 'dotenv/config';

// import { ConversationEntity } from "../modules/entities/conversations.entity.js";
// import { ConversationDocument } from "../modules/entities/conversation_docs.entity.js";
// import { DocumentEntity } from "../modules/entities/documents.entity.js";
// import { MessageEntity } from "../modules/entities/messages.entity.js";

export default new DataSource({
    type: 'postgres',

    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE, 

    entities: [
        'src/modules/entities/*.entity.ts'
    ],

    migrations: [
        'src/database/migrations/*.ts'
    ],

    logging: true,
})