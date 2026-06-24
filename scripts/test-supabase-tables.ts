import { supabase } from './_supabase.js';

async function main() {
  try {
    console.log('Probing plans table...');
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*');
    
    if (plansError) {
      console.log('Plans table does not exist or error:', plansError.message);
    } else {
      console.log(`Plans table exists and has ${plans?.length} rows.`);
      console.log(plans);
    }

    console.log('Probing owner_email_templates table...');
    const { data: templates, error: templatesError } = await supabase
      .from('owner_email_templates')
      .select('*');
    
    if (templatesError) {
      console.log('owner_email_templates table does not exist or error:', templatesError.message);
    } else {
      console.log(`owner_email_templates table exists and has ${templates?.length} rows.`);
    }
  } catch (err: any) {
    console.error('Error during query:', err);
  }
}

main().catch(console.error);
