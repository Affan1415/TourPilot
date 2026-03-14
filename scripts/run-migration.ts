import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runCaptainMigration() {
  console.log('🚀 Running migration: Add Captain Assignment to Boats\n');

  try {
    // First check if column already exists by trying to select it
    console.log('📋 Checking if assigned_captain_id column exists...');
    const { data, error: checkError } = await supabase
      .from('boats')
      .select('assigned_captain_id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Column assigned_captain_id already exists!');
      console.log('   Migration has already been applied.\n');

      // Show current boat-captain assignments
      const { data: boats } = await supabase
        .from('boats')
        .select('name, assigned_captain_id, assigned_captain:staff(name)')
        .not('assigned_captain_id', 'is', null);

      if (boats && boats.length > 0) {
        console.log('📊 Current captain assignments:');
        boats.forEach(b => {
          const captain = b.assigned_captain as { name: string } | null;
          console.log(`   • ${b.name} → ${captain?.name || 'Unknown'}`);
        });
      } else {
        console.log('📊 No boats have captains assigned yet.');
      }
      return;
    }

    // Column doesn't exist - need to add via SQL
    // Use Supabase Management API to execute SQL
    console.log('📝 Column does not exist. Attempting to run migration...\n');

    // Try using the Supabase SQL API directly (requires Management API)
    const projectRef = 'khfxgysyqhdssgvruayu';
    const sqlApiUrl = `https://${projectRef}.supabase.co/rest/v1/`;

    // Since we can't execute DDL via REST API, we'll use a workaround
    // Try to create the column via a stored procedure if one exists
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE boats
        ADD COLUMN IF NOT EXISTS assigned_captain_id UUID REFERENCES staff(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_boats_assigned_captain ON boats(assigned_captain_id);
      `
    });

    if (!rpcError) {
      console.log('✅ Migration completed successfully via exec_sql RPC!');
      return;
    }

    // If that didn't work, provide manual instructions
    console.log('⚠️  Cannot execute DDL automatically.\n');
    console.log('Please run this SQL in your Supabase Dashboard:\n');
    console.log('─'.repeat(60));
    console.log(`
-- Migration: Add Captain Assignment to Boats
-- Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new

ALTER TABLE boats
ADD COLUMN IF NOT EXISTS assigned_captain_id UUID REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boats_assigned_captain ON boats(assigned_captain_id);
`);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runCaptainMigration();
