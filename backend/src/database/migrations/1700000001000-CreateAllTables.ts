import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1700000001000 implements MigrationInterface {
  name = 'CreateAllTables1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── w_roles ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "w_roles" (
        "id"          SERIAL PRIMARY KEY,
        "name"        VARCHAR(50) NOT NULL UNIQUE,
        "slug"        VARCHAR(50) NOT NULL UNIQUE,
        "level"       SMALLINT NOT NULL,
        "description" VARCHAR(255),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── w_shops ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "w_shops" (
        "id"         SERIAL PRIMARY KEY,
        "name"       VARCHAR(100) NOT NULL,
        "code"       VARCHAR(20) UNIQUE,
        "status"     VARCHAR(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── w_users ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE user_status AS ENUM ('active', 'blocked', 'inactive');

      CREATE TABLE "w_users" (
        "id"                SERIAL PRIMARY KEY,
        "username"          VARCHAR(50)  NOT NULL UNIQUE,
        "email"             VARCHAR(150) NOT NULL UNIQUE,
        "password"          TEXT NOT NULL,
        "parent_id"         INTEGER REFERENCES "w_users"("id") ON DELETE RESTRICT,
        "shop_id"           INTEGER REFERENCES "w_shops"("id") ON DELETE SET NULL,
        "status"            user_status NOT NULL DEFAULT 'active',
        "email_verified_at" TIMESTAMPTZ,
        "last_login_at"     TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMPTZ
      );

      CREATE INDEX idx_users_parent_id ON "w_users"("parent_id");
      CREATE INDEX idx_users_status    ON "w_users"("status");
      CREATE INDEX idx_users_created   ON "w_users"("created_at");
    `);

    // ── w_role_user ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "w_role_user" (
        "user_id"    INTEGER NOT NULL REFERENCES "w_users"("id") ON DELETE CASCADE,
        "role_id"    INTEGER NOT NULL REFERENCES "w_roles"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("user_id", "role_id")
      )
    `);

    // ── w_wallets ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "w_wallets" (
        "id"         SERIAL PRIMARY KEY,
        "user_id"    INTEGER NOT NULL UNIQUE REFERENCES "w_users"("id") ON DELETE CASCADE,
        "balance"    NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "currency"   CHAR(3) NOT NULL DEFAULT 'USD',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_wallet_balance_non_negative CHECK (balance >= 0.00)
      )
    `);

    // ── w_transactions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE tx_type   AS ENUM ('credit', 'debit', 'adjustment', 'system');
      CREATE TYPE tx_status AS ENUM ('completed', 'failed', 'reversed', 'pending');

      CREATE TABLE "w_transactions" (
        "transaction_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"        INTEGER NOT NULL REFERENCES "w_users"("id") ON DELETE RESTRICT,
        "admin_id"       INTEGER          REFERENCES "w_users"("id") ON DELETE RESTRICT,
        "type"           tx_type NOT NULL,
        "amount"         NUMERIC(20,2) NOT NULL,
        "balance_before" NUMERIC(20,2) NOT NULL,
        "balance_after"  NUMERIC(20,2) NOT NULL,
        "reason"         TEXT NOT NULL,
        "reference_id"   UUID,
        "status"         tx_status NOT NULL DEFAULT 'completed',
        "ip_address"     VARCHAR(45),
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_tx_amount_positive CHECK (amount > 0)
      );

      CREATE INDEX idx_tx_user_id    ON "w_transactions"("user_id");
      CREATE INDEX idx_tx_admin_id   ON "w_transactions"("admin_id");
      CREATE INDEX idx_tx_type       ON "w_transactions"("type");
      CREATE INDEX idx_tx_status     ON "w_transactions"("status");
      CREATE INDEX idx_tx_created_at ON "w_transactions"("created_at");
    `);

    // ── w_user_activity ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "w_user_activity" (
        "id"                  SERIAL PRIMARY KEY,
        "user_id"             INTEGER REFERENCES "w_users"("id") ON DELETE SET NULL,
        "actor_id"            INTEGER REFERENCES "w_users"("id") ON DELETE SET NULL,
        "action"              VARCHAR(100) NOT NULL,
        "ip_address"          VARCHAR(45),
        "metadata"            JSONB,
        "attempted_username"  VARCHAR(50),
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_activity_user_id  ON "w_user_activity"("user_id");
      CREATE INDEX idx_activity_actor_id ON "w_user_activity"("actor_id");
      CREATE INDEX idx_activity_action   ON "w_user_activity"("action");
      CREATE INDEX idx_activity_created  ON "w_user_activity"("created_at");
    `);

    // ── w_password_resets ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "w_password_resets" (
        "id"         SERIAL PRIMARY KEY,
        "email"      VARCHAR(150) NOT NULL,
        "token"      VARCHAR(100) NOT NULL,
        "used"       BOOLEAN NOT NULL DEFAULT false,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_pw_resets_email      ON "w_password_resets"("email");
      CREATE INDEX idx_pw_resets_token      ON "w_password_resets"("token");
      CREATE INDEX idx_pw_resets_expires_at ON "w_password_resets"("expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "w_password_resets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_user_activity"   CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_transactions"    CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_wallets"         CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_role_user"       CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_users"           CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_shops"           CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_roles"           CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS tx_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS tx_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_status`);
  }
}
