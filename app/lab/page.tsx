import LabClient from './LabClient';

export default function LabPage() {
  return <LabClient naverClientId={process.env.NAVER_MAP_CLIENT_ID ?? ''} />;
}
