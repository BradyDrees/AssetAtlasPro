import { verifyPaymentStatus } from "@/app/actions/public-invoice";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Always verify payment status server-side — never trust query params
  const { paid, invoiceNumber, total } = await verifyPaymentStatus(token);

  if (!paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Processing</h1>
          <p className="text-gray-600 mb-4">
            Your payment is still being processed. This usually takes a few moments.
          </p>
          <a
            href={`/pay/${token}`}
            className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Check Status
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-1">Thank you for your payment.</p>

        {invoiceNumber && (
          <p className="text-sm text-gray-500 mb-4">
            Invoice #{invoiceNumber}
          </p>
        )}

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-700 font-medium">Amount Paid</p>
          <p className="text-2xl font-bold text-green-800">${total.toFixed(2)}</p>
        </div>

        <p className="text-xs text-gray-400">
          A receipt will be sent to your email. You can close this page.
        </p>

        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by Asset Atlas Pro
        </p>
      </div>
    </div>
  );
}
