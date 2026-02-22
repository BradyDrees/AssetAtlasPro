import { getInvoiceDetail } from "@/app/actions/vendor-invoices";
import { InvoiceBuilder } from "@/components/vendor/invoice-builder";
import { redirect } from "next/navigation";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const { invoice, items, error } = await getInvoiceDetail(id);

  if (error || !invoice) {
    redirect("/vendor/invoices");
  }

  return <InvoiceBuilder invoice={invoice} items={items} />;
}
