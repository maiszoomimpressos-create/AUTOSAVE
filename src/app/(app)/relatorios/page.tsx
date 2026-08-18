import PlateLookupReportPanel from "@/components/PlateLookupReportPanel";
import { getPlateLookupReport } from "@/lib/plate-lookup-report";

export default async function RelatoriosPage() {
  const plateLookupReport = await getPlateLookupReport();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Relatórios</h1>
      </div>

      <PlateLookupReportPanel report={plateLookupReport} defaultOpen />
    </div>
  );
}
