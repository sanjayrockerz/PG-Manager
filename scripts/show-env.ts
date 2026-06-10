console.log("Keys in process.env:");
console.log(Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("SERVICE") || k.includes("ROLE") || k.includes("KEY") || k.includes("SECRET") || k.includes("VERCEL")));
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("SUPABASE_ACCESS_TOKEN exists:", !!process.env.SUPABASE_ACCESS_TOKEN);
