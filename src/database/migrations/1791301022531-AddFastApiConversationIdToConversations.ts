import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFastApiConversationIdToConversations1791301022531 implements MigrationInterface {
    name = 'AddFastApiConversationIdToConversations1791301022531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversations" ADD "fastApi_conversation_id" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."messages_role_enum" RENAME TO "messages_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."messages_role_enum" AS ENUM('user', 'assistant')`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "role" TYPE "public"."messages_role_enum" USING "role"::"text"::"public"."messages_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."messages_role_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."messages_role_enum_old" AS ENUM('user', 'bot', 'assistant')`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "role" TYPE "public"."messages_role_enum_old" USING "role"::"text"::"public"."messages_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."messages_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."messages_role_enum_old" RENAME TO "messages_role_enum"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "fastApi_conversation_id"`);
    }

}
