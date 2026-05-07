import { MigrationInterface, QueryRunner } from 'typeorm';

export class Milestone2Tables1700000002000 implements MigrationInterface {
  name = 'Milestone2Tables1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extend tx_type enum ────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'session_in'`);
    await queryRunner.query(`ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'session_out'`);
    await queryRunner.query(`ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'bet'`);
    await queryRunner.query(`ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'win'`);
    await queryRunner.query(`ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'refund'`);

    // ── Add new columns to w_transactions ─────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "w_transactions"
        ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "session_id"      UUID,
        ADD COLUMN IF NOT EXISTS "game_id"         INTEGER;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_idempotency
        ON "w_transactions"("idempotency_key")
        WHERE "idempotency_key" IS NOT NULL;
    `);

    // ── w_games ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE game_type   AS ENUM ('slot', 'fishing', 'table');
      CREATE TYPE game_status AS ENUM ('active', 'inactive', 'disabled');

      CREATE TABLE "w_games" (
        "id"          SERIAL PRIMARY KEY,
        "name"        VARCHAR(100) NOT NULL,
        "slug"        VARCHAR(50)  NOT NULL UNIQUE,
        "type"        game_type    NOT NULL DEFAULT 'slot',
        "status"      game_status  NOT NULL DEFAULT 'active',
        "rtp_target"  NUMERIC(5,2) NOT NULL DEFAULT 96.00,
        "bank_balance" NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "min_bet"     NUMERIC(20,2) NOT NULL DEFAULT 0.10,
        "max_bet"     NUMERIC(20,2) NOT NULL DEFAULT 100.00,
        "description" TEXT,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT chk_game_rtp     CHECK (rtp_target BETWEEN 1 AND 100),
        CONSTRAINT chk_game_bank    CHECK (bank_balance >= 0),
        CONSTRAINT chk_game_minbet  CHECK (min_bet > 0),
        CONSTRAINT chk_game_maxbet  CHECK (max_bet >= min_bet)
      );

      CREATE INDEX idx_games_status ON "w_games"("status");
    `);

    // ── w_game_sessions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE session_status AS ENUM ('active', 'ended', 'abandoned');

      CREATE TABLE "w_game_sessions" (
        "session_id"       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "player_id"        INTEGER      NOT NULL REFERENCES "w_users"("id") ON DELETE RESTRICT,
        "game_id"          INTEGER      NOT NULL REFERENCES "w_games"("id") ON DELETE RESTRICT,
        "session_balance"  NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "initial_transfer" NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "total_bet"        NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "total_win"        NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "status"           session_status NOT NULL DEFAULT 'active',
        "started_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "ended_at"         TIMESTAMPTZ,
        "expires_at"       TIMESTAMPTZ  NOT NULL,
        CONSTRAINT chk_session_balance CHECK (session_balance >= 0)
      );

      CREATE INDEX idx_sessions_player_id ON "w_game_sessions"("player_id");
      CREATE INDEX idx_sessions_game_id   ON "w_game_sessions"("game_id");
      CREATE INDEX idx_sessions_status    ON "w_game_sessions"("status");
      CREATE INDEX idx_sessions_expires   ON "w_game_sessions"("expires_at");

      -- Only one active session per player per game
      CREATE UNIQUE INDEX idx_sessions_active_player_game
        ON "w_game_sessions"("player_id", "game_id")
        WHERE "status" = 'active';
    `);

    // ── w_spins ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE spin_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

      CREATE TABLE "w_spins" (
        "spin_id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id"       UUID         NOT NULL REFERENCES "w_game_sessions"("session_id") ON DELETE RESTRICT,
        "player_id"        INTEGER      NOT NULL REFERENCES "w_users"("id") ON DELETE RESTRICT,
        "game_id"          INTEGER      NOT NULL REFERENCES "w_games"("id") ON DELETE RESTRICT,
        "idempotency_key"  VARCHAR(100) NOT NULL UNIQUE,
        "bet_amount"       NUMERIC(20,2) NOT NULL,
        "win_amount"       NUMERIC(20,2) NOT NULL DEFAULT 0.00,
        "balance_before"   NUMERIC(20,2) NOT NULL,
        "balance_after"    NUMERIC(20,2) NOT NULL,
        "outcome_data"     JSONB,
        "status"           spin_status  NOT NULL DEFAULT 'pending',
        "bet_tx_id"        UUID,
        "win_tx_id"        UUID,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "completed_at"     TIMESTAMPTZ,
        CONSTRAINT chk_spin_bet_positive CHECK (bet_amount > 0),
        CONSTRAINT chk_spin_win_nonneg   CHECK (win_amount >= 0)
      );

      CREATE INDEX idx_spins_session_id ON "w_spins"("session_id");
      CREATE INDEX idx_spins_player_id  ON "w_spins"("player_id");
      CREATE INDEX idx_spins_status     ON "w_spins"("status");
      CREATE INDEX idx_spins_created_at ON "w_spins"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "w_spins" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_game_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "w_games" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS spin_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS session_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS game_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS game_type`);
    await queryRunner.query(`
      ALTER TABLE "w_transactions"
        DROP COLUMN IF EXISTS "idempotency_key",
        DROP COLUMN IF EXISTS "session_id",
        DROP COLUMN IF EXISTS "game_id";
    `);
  }
}
