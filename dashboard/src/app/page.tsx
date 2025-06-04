"use client";
import CustomerAnalysis from "@/components/CustomerAnalysis";
import KPICard from "@/components/KPICard";
import OverviewAnalysis from "@/components/OverviewAnalysis";
import ProductAnalysis from "@/components/ProductAnalysis";
import { useCallback, useState } from "react";


export default function Dashboard() {
  const [buttons, setButtons] = useState<"product" | "customer">("product");

  const handleButtonClick = useCallback((button: "product" | "customer") => {
    setButtons(button);
  }, []);

  return (
    <div className="min-h-screen bg-gray-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Brazilian E-commerce Analysis
        </h1>
      </div>

      <KPICard />

      <OverviewAnalysis />
     

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex gap-4">
          <button
            className={`px-6 py-2 rounded-lg font-medium ${
              buttons === "product"
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-700"
            }`}
            onClick={() => handleButtonClick("product")}>
            Product and Category
          </button>
          <button
            className={`px-6 py-2 rounded-lg font-medium ${
              buttons === "customer"
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-700"
            }`}
            onClick={() => handleButtonClick("customer")}>
            Customer Analysis
          </button>
        </div>
      </div>

      {buttons === "product" && <ProductAnalysis />}
      {buttons === "customer" && <CustomerAnalysis />}
    </div>
  );
}
