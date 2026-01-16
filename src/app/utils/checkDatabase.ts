// Simple utility to check TAMS360 database state
import { authenticatedFetch } from './auth';

export async function runDatabaseDiagnostic() {
  console.log('🔍 Running TAMS360 database diagnostic...');
  
  try {
    const response = await authenticatedFetch('/admin/diagnostic/tams360-check');
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Diagnostic failed:', data);
      return data;
    }
    
    console.log('✅ Diagnostic Results:', data);
    console.log('\n📊 Summary:');
    console.log(`  - Auth Users: ${data.checks.totalAuthUsers}`);
    console.log(`  - View Users: ${data.checks.totalViewUsers}`);
    console.log(`  - Orphaned: ${data.checks.orphanedAuthUsers}`);
    console.log(`  - In Your Tenant: ${data.checks.usersInYourTenant}`);
    
    if (data.recommendations.length > 0) {
      console.log('\n⚠️ Recommendations:');
      data.recommendations.forEach((rec: any) => {
        console.log(`  - ${rec.issue}`);
        console.log(`    Action: ${rec.action}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    throw error;
  }
}

// Call this from browser console: window.checkTAMS360Database()
if (typeof window !== 'undefined') {
  (window as any).checkTAMS360Database = runDatabaseDiagnostic;
}
