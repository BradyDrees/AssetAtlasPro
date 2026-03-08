"use client";

import { useState, useEffect } from "react";
import { getBookingPageData, submitBookingRequest } from "./book-actions";
import type { BookingPageData, BookingInput } from "./book-actions";
import { useParams } from "next/navigation";

const TRADE_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  general: "General Maintenance",
  painting: "Painting",
  flooring: "Flooring",
  roofing: "Roofing",
  landscaping: "Landscaping",
  appliance: "Appliance Repair",
  carpentry: "Carpentry",
  drywall: "Drywall",
  pest_control: "Pest Control",
  locksmith: "Locksmith",
  cleaning: "Cleaning",
  demolition: "Demolition",
  concrete: "Concrete",
  fencing: "Fencing",
  gutters: "Gutters",
  windows_doors: "Windows & Doors",
  fire_safety: "Fire Safety",
  other: "Other",
};

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [pageData, setPageData] = useState<BookingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [trade, setTrade] = useState("");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await getBookingPageData(slug);
      if (!data) {
        setNotFound(true);
      } else {
        setPageData(data);
      }
      setLoading(false);
    })();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const input: BookingInput = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      trade: trade || undefined,
      description: description.trim(),
      preferred_date: preferredDate || undefined,
    };

    const result = await submitBookingRequest(slug, input);

    if (result.success) {
      setSubmitted(true);
      setTrackingUrl(result.tracking_url);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (notFound || !pageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600">This booking page is not available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you! <strong>{pageData.name}</strong> will review your request and contact you shortly.
          </p>
          {trackingUrl && (
            <a
              href={trackingUrl}
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Track Your Service
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {pageData.logo_url && (
              <img
                src={pageData.logo_url}
                alt={pageData.name}
                className="w-14 h-14 rounded-xl object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{pageData.name}</h1>
              {pageData.city && pageData.state && (
                <p className="text-sm text-gray-500">
                  {pageData.city}, {pageData.state}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Headline */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {pageData.booking_headline || "Request a Service"}
          </h2>
          {pageData.booking_description && (
            <p className="text-gray-600">{pageData.booking_description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="email@example.com"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="123 Main St, City, State"
            />
          </div>

          {/* Service Type */}
          {pageData.trades.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Needed</label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select a service...</option>
                {pageData.trades.map((t) => (
                  <option key={t} value={t}>
                    {TRADE_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe the issue <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              placeholder="Please describe what you need help with..."
            />
          </div>

          {/* Preferred Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {submitting ? "Submitting..." : "Request Service"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Powered by Asset Atlas Pro
          </p>
        </form>
      </div>
    </div>
  );
}
