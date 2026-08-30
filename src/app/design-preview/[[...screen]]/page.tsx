import { notFound } from "next/navigation";
import { DesignPreview } from "../DesignPreview";

const screens = new Set([
  "home",
  "properties",
  "properties/chiang-mai-mountain-view",
  "dashboard",
  "dashboard/properties",
  "dashboard/properties/new",
  "dashboard/properties/demo/edit",
  "dashboard/properties/demo/ai",
  "dashboard/leads",
  "dashboard/profile",
]);

export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  if (process.env.APP_ENV === "production") notFound();
  const selected = (await params).screen?.join("/") || "home";
  if (!screens.has(selected)) notFound();
  return <DesignPreview screen={selected} />;
}
