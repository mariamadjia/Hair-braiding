"use client";

import { useEffect, useState } from "react";
import { authApi } from "@/lib/api/auth";

interface LengthPricing {
  name: string;
  price: string;
}

interface SizePricing {
  name: string;
  lengths: LengthPricing[];
}

interface CategoryPricing {
  name: string;
  sizes: SizePricing[];
}

interface PricingData {
  categories: CategoryPricing[];
  depositAmount: string;
}

export default function Pricing() {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        const token = typeof window !== "undefined"
          ? (localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"))
          : null;
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://backend-hairbraiding.onrender.com";
        const response = await fetch(`${apiUrl}/api/admin/pricing`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch pricing data: ${response.status}`);
        }

        const data = await response.json();
        setPricingData(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch pricing data:", err);
        setError(err instanceof Error ? err.message : "Failed to load pricing data");
      } finally {
        setLoading(false);
      }
    };

    fetchPricingData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-neutral-200 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-neutral-200 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-neutral-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-red-200 rounded-lg p-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-sm hover:bg-neutral-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pricingData) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border-2 border-neutral-200 rounded-sm p-8">
          <h1 className="text-2xl font-light text-neutral-900 mb-8">Pricing</h1>

          {pricingData.categories.map((category, catIndex) => (
            <div key={catIndex} className="mb-8 last:mb-0">
              <h2 className="text-lg font-medium text-neutral-900 mb-4">{category.name}</h2>

              <div className="space-y-4">
                {category.sizes.map((size, sizeIndex) => (
                  <div
                    key={sizeIndex}
                    className="border-2 border-neutral-200 rounded-sm p-6"
                  >
                    <h3 className="text-base font-medium text-neutral-900 mb-4">
                      {size.name}
                    </h3>

                    <div className="space-y-2">
                      {size.lengths.map((length, lengthIndex) => (
                        <div
                          key={lengthIndex}
                          className="flex items-center justify-between text-sm text-neutral-700"
                        >
                          <span>• {length.name}</span>
                          <span className="font-medium text-neutral-900">
                            {length.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 border-t-2 border-neutral-200">
            <p className="text-sm text-neutral-700">
              <span className="font-medium text-neutral-900">Deposit:</span>{" "}
              {pricingData.depositAmount} required for all appointments
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
