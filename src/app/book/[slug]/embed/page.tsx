"use client";

import { useState, useEffect } from "react";
import { getBookingPageData, submitBookingRequest } from "../book-actions";
import type { BookingPageData, BookingInput } from "../book-actions";
import { useParams } from "next/navigation";

const TRADE_LABELS: Record<string, string> = {
  plumbing: "Plumbing", electrical: "Electrical", hvac: "HVAC",
  general: "General Maintenance", painting: "Painting", flooring: "Flooring",
  roofing: "Roofing", landscaping: "Landscaping", appliance: "Appliance Repair",
  carpentry: "Carpentry", drywall: "Drywall", pest_control: "Pest Control",
  locksmith: "Locksmith", cleaning: "Cleaning", other: "Other",
};

export default function EmbedBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [pageData, setPageData] = useState<BookingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      if (!data) setNotFound(true);
      else setPageData(data);
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
      // Notify parent frame
      if (window.parent !== window) {
        window.parent.postMessage(
          { type: "atlas-booking-success", tracking_url: result.tracking_url },
          "*"
        );
      }
    } else {
      setError(result.error || "Something went wrong.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
      </div>
    );
  }

  if (notFound || !pageData) {
    return <div className="p-4 text-center text-gray-500 text-sm">Booking not available.</div>;
  }

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Request Submitted!</h3>
        <p className="text-gray-600 text-sm mb-4">We&apos;ll be in touch shortly.</p>
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Track Your Service
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="(555) 123-4567" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="email@example.com" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Service address" />
        </div>

        {pageData.trades.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
            <select value={trade} onChange={(e) => setTrade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500">
              <option value="">Select...</option>
              {pageData.trades.map((t) => (
                <option key={t} value={t}>{TRADE_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Describe the issue *</label>
          <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            placeholder="What do you need help with?" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Date</label>
          <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}

        <button type="submit" disabled={submitting}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
          {submitting ? "Submitting..." : "Request Service"}
        </button>
      </form>
    </div>
  );
}
