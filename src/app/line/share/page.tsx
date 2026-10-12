import { LineMiniAppSession } from "@/components/line-mini-app-session";
import { normalizeReturnPath } from "@/features/line/session";

export default async function LineSharePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return <LineMiniAppSession liffId={process.env.LINE_MINI_APP_LIFF_ID ?? null} returnTo={normalizeReturnPath(returnTo)} />;
}
