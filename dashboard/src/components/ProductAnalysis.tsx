

const ProductAnalysis = () => {
  return <>
{/* Middle Row */}
<div className="grid grid-cols-3 gap-6 mb-8">
        {/* Category Performance Table */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex gap-4 mb-4">
            <button className="text-blue-600 border-b-2 border-blue-600 pb-2 font-medium">
              Top 10 Orders
            </button>
            <button className="text-gray-600 pb-2 font-medium">
              Top 10 Revenue
            </button>
          </div>

          <div className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-sm font-medium text-gray-600">
                    Category
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-600">
                    Orders
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-600">
                    Revenue
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-gray-600">
                    Avg Order Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  "Bed & Bath",
                  "Health & Beauty",
                  "Sports & Leisure",
                  "Electronics",
                  "Home & Garden",
                  "Fashion",
                ].map((category, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-800">{category}</td>
                    <td className="py-3 text-sm text-gray-600">--</td>
                    <td className="py-3 text-sm text-gray-600">--</td>
                    <td className="py-3 text-sm text-gray-600">--</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Delivery Status Distribution
          </h2>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Pie Chart</span>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Average Price by Category */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Average Price by Category
          </h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Bar Chart</span>
          </div>
        </div>

        {/* Delivery Time Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Delivery Time Distribution
          </h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Bar Chart</span>
          </div>
        </div>
      </div>
  </>
}

export default ProductAnalysis