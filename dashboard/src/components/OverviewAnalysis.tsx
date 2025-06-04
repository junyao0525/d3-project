
function OverviewAnalysis() {
  return <>
   <div className="grid grid-cols-4 gap-6 mb-8">
        {/* Total Order By State */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Total Order By State
          </h2>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Map Visualization</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Payment Methods
          </h2>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Pie Chart</span>
          </div>
        </div>

        {/* Sales Performance over time */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Sales Performance over time
          </h2>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Candlestick Chart</span>
          </div>
        </div>

        {/* Product Rating Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Product Rating Distribution
          </h2>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Pie Chart</span>
          </div>
        </div>
      </div>
  </>
}

export default OverviewAnalysis