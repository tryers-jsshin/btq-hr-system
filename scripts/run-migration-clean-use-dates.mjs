import { createClient } from '@supabase/supabase-js'

// Hardcode the environment variables (they're public keys anyway)
const supabaseUrl = 'https://xkrqxiurtswzcyubiqrj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcnF4aXVydHN3emN5dWJpcXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTE5NjksImV4cCI6MjA2OTMyNzk2OX0.UOO_BSvCnKOZb3puad7GClM9xDmRbeS4ejJR2qrDvVk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigration() {
  console.log('Starting migration to clean use transaction dates...')
  
  try {
    // 1. Update all use transactions to set grant_date and expire_date to NULL
    const { data, error } = await supabase
      .from('annual_leave_transactions')
      .update({ 
        grant_date: null,
        expire_date: null 
      })
      .eq('transaction_type', 'use')
      .select()
    
    if (error) {
      console.error('Error updating use transactions:', error)
      return
    }
    
    console.log(`Successfully updated ${data?.length || 0} use transactions`)
    
    // 2. Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('annual_leave_transactions')
      .select('id, member_name, transaction_type, amount, reason, grant_date, expire_date, reference_id')
      .eq('transaction_type', 'use')
      .limit(10)
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError)
      return
    }
    
    console.log('\nSample of updated use transactions:')
    verifyData?.forEach(tx => {
      console.log(`- ${tx.member_name}: ${tx.reason} (grant_date: ${tx.grant_date}, expire_date: ${tx.expire_date})`)
    })
    
    console.log('\nMigration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

runMigration()