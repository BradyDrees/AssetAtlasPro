import { notFound } from "next/navigation";
import { getInvoiceByToken } from "@/app/actions/public-invoice";
import { PublicInvoiceView } from "./public-invoice-view";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicPaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    notFound();
  }

  const { data, error } = await getInvoiceByToken(token);

  if (error === "already_paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Already Paid</h1>
          <p className="text-gray-600">This invoice has already been paid. Thank you!</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">This payment link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return <PublicInvoiceView invoice={data} token={token} />;
}
