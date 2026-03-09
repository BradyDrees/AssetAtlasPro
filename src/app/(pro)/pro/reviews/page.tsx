import { getOrgReviews, getReviewAnalytics } from "@/app/actions/vendor-reviews";
import { VendorReviewsPage } from "@/components/vendor/vendor-reviews-page";

export default async function ProReviewsPage() {
  const [reviewsResult, analyticsResult] = await Promise.all([
    getOrgReviews(),
    getReviewAnalytics(),
  ]);

  return (
    <VendorReviewsPage
      reviews={reviewsResult.data}
      total={reviewsResult.total}
      analytics={analyticsResult.data}
    />
  );
}
