import { aggregate } from '@/app/lib/aggregate';
import Dashboard from '@/app/components/Dashboard';
import MobileDashboard from '@/app/components/MobileDashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await aggregate();
  return (
    <>
      <div className="hidden md:block">
        <Dashboard data={data} />
      </div>
      <div className="md:hidden">
        <MobileDashboard data={data} />
      </div>
    </>
  );
}
