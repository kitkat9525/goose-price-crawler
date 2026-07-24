import { aggregate } from '@/app/lib/aggregate';
import Home from '@/app/components/Home';
import MobileHome from '@/app/components/MobileHome';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await aggregate();
  return (
    <>
      <div className="hidden md:block">
        <Home data={data} />
      </div>
      <div className="md:hidden">
        <MobileHome data={data} />
      </div>
    </>
  );
}
