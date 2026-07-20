import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  console.log('Dropping orphaned composite type...');
  try {
    await db.execute(sql\`DROP TYPE IF EXISTS public.conversation_messages CASCADE\`);
    console.log('Type dropped successfully.');
  } catch(e) {
    console.error('Error dropping type:', e);
  }
  
  // Verify
  const result = await db.execute(sql\`SELECT t.typname, t.typtype FROM pg_type t WHERE t.typname LIKE '%conversation%'\`);
  console.log('Remaining types:', JSON.stringify(result.rows));
}
main().catch(console.error);
