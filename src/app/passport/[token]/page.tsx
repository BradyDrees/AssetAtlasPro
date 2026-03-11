import { Metadata } from "next";
import { getPropertyPassport } from "@/app/actions/home-property";
import { PassportPublicView } from "./passport-public-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Property Passport — Atlas Home",
};

export default async function PassportPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const passport = await getPropertyPassport(token);

  if (!passport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invalid Passport Link
          </h1>
          <p className="text-gray-600">
            This passport link is no longer valid or has been revoked.
          </p>
        </div>
      </div>
    );
  }

  return <PassportPublicView passport={passport} />;
}
