import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../data-source';

dotenv.config();

const ROLES = [
  { name: 'Admin',       slug: 'admin',       level: 1, description: 'Super administrator' },
  { name: 'Agent',       slug: 'agent',       level: 2, description: 'Agent managing distributors' },
  { name: 'Distributor', slug: 'distributor', level: 3, description: 'Distributor managing managers' },
  { name: 'Manager',     slug: 'manager',     level: 4, description: 'Manager overseeing cashiers' },
  { name: 'Cashier',     slug: 'cashier',     level: 5, description: 'Cashier managing players' },
  { name: 'Player',      slug: 'player',      level: 6, description: 'End-user player' },
];

async function seed(ds: DataSource) {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');

    // Roles
    const roleMap: Record<string, number> = {};
    for (const role of ROLES) {
      const existing = await qr.query(`SELECT id FROM w_roles WHERE slug = $1`, [role.slug]);
      if (existing.length === 0) {
        const res = await qr.query(
          `INSERT INTO w_roles (name, slug, level, description) VALUES ($1,$2,$3,$4) RETURNING id`,
          [role.name, role.slug, role.level, role.description],
        );
        roleMap[role.slug] = res[0].id;
      } else {
        roleMap[role.slug] = existing[0].id;
      }
    }

    // Helper: create user + wallet + assign role
    const makeUser = async (
      username: string,
      email: string,
      plainPassword: string,
      roleSlug: string,
      parentId: number | null,
    ): Promise<number> => {
      const existing = await qr.query(`SELECT id FROM w_users WHERE username = $1`, [username]);
      if (existing.length > 0) {
        console.log(`  • skipped (exists): ${username}`);
        return existing[0].id;
      }

      const hash = await bcrypt.hash(plainPassword, rounds);
      const [user] = await qr.query(
        `INSERT INTO w_users (username, email, password, parent_id, status)
         VALUES ($1,$2,$3,$4,'active') RETURNING id`,
        [username, email, hash, parentId],
      );
      const userId: number = user.id;

      await qr.query(
        `INSERT INTO w_role_user (user_id, role_id) VALUES ($1,$2)`,
        [userId, roleMap[roleSlug]],
      );
      await qr.query(
        `INSERT INTO w_wallets (user_id, balance, currency) VALUES ($1,'0.00','USD')`,
        [userId],
      );

      console.log(`  ✓ created: ${username} (${roleSlug})`);
      return userId;
    };

    // Seed hierarchy
    const adminId       = await makeUser('admin',       'admin@fishthunder.com',   'Admin@1234',       'admin',       null);
    const agentId       = await makeUser('agent1',      'agent@fishthunder.com',   'Agent@1234',       'agent',       adminId);
    const distId        = await makeUser('distributor1','dist@fishthunder.com',    'Dist@1234',        'distributor', agentId);
    const managerId     = await makeUser('manager1',    'manager@fishthunder.com', 'Manager@1234',     'manager',     distId);
    const cashierId     = await makeUser('cashier1',    'cashier@fishthunder.com', 'Cashier@1234',     'cashier',     managerId);
    const playerId      = await makeUser('player1',     'player@fishthunder.com',  'Player@1234',      'player',      cashierId);

    // Sample transactions: credit player
    const addTx = async (userId: number, adminId: number, type: string, amount: number, reason: string) => {
      const [wallet] = await qr.query(`SELECT balance FROM w_wallets WHERE user_id = $1`, [userId]);
      const before = parseFloat(wallet.balance);
      const after  = type === 'credit' ? before + amount : Math.max(0, before - amount);

      await qr.query(
        `INSERT INTO w_transactions
          (transaction_id, user_id, admin_id, type, amount, balance_before, balance_after, reason, status, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'completed','127.0.0.1')`,
        [uuidv4(), userId, adminId, type, amount.toFixed(2), before.toFixed(2), after.toFixed(2), reason],
      );
      await qr.query(`UPDATE w_wallets SET balance = $1 WHERE user_id = $2`, [after.toFixed(2), userId]);
    };

    await addTx(adminId,  adminId,  'credit', 1000.00, 'Initial seed credit');
    await addTx(playerId, adminId,  'credit',  500.00, 'Initial seed credit');
    await addTx(playerId, adminId,  'debit',   100.00, 'Sample debit');

    await qr.commitTransaction();
    console.log('\nSeed complete.');
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await qr.release();
  }
}

AppDataSource.initialize()
  .then((ds) => seed(ds).then(() => ds.destroy()))
  .catch((err) => { console.error(err); process.exit(1); });
