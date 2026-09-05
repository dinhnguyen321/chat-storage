import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1788603988469 implements MigrationInterface {
    name = 'InitSchema1788603988469'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL, "user_id" character varying(255) NOT NULL, "title" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "conversation_documents" ("id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "document_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_05250063eab7faa0a9dff7fb425" UNIQUE ("conversation_id", "document_id"), CONSTRAINT "PK_c927191dfaf21c2f69546efdbda" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."documents_type_enum" AS ENUM('pdf', 'md', 'docx')`);
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum" AS ENUM('pending', 'processing', 'ready', 'failed')`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "selector_choices" character varying(255) NOT NULL, "type" "public"."documents_type_enum" NOT NULL, "path" text NOT NULL, "upload_by" text NOT NULL, "status" "public"."documents_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_abd5cb2eb8cc73d1afe100f0f9c" UNIQUE ("selector_choices"), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."messages_role_enum" AS ENUM('user', 'bot')`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "content" text NOT NULL, "role" "public"."messages_role_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3bc55a7c3f9ed54b520bb5cfe2" ON "messages"  ("conversation_id") `);
        await queryRunner.query(`ALTER TABLE "conversation_documents" ADD CONSTRAINT "FK_70d28dd23e47ea982aa65349a06" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_documents" ADD CONSTRAINT "FK_af8ff71625c28f6061c478ff923" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`);
        await queryRunner.query(`ALTER TABLE "conversation_documents" DROP CONSTRAINT "FK_af8ff71625c28f6061c478ff923"`);
        await queryRunner.query(`ALTER TABLE "conversation_documents" DROP CONSTRAINT "FK_70d28dd23e47ea982aa65349a06"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3bc55a7c3f9ed54b520bb5cfe2"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TYPE "public"."messages_role_enum"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."documents_type_enum"`);
        await queryRunner.query(`DROP TABLE "conversation_documents"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
    }

}
