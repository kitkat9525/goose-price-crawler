import { aggregate } from '@/app/lib/aggregate';
import Dashboard from '@/app/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await aggregate();
  return <Dashboard data={data} />;
}
