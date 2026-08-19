import PlateLookupReportPanel from "@/components/PlateLookupReportPanel";
import { getPlateLookupReport } from "@/lib/plate-lookup-report";

export default async function RelatoriosPage() {
  const plateLookupReport = await getPlateLookupReport();

  return (
    <div className="flex flex-col gap-6">
      <PlateLookupReportPanel report={plateLookupReport} defaultOpen />
    </div>
  );
}
