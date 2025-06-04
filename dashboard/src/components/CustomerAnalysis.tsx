
const CustomerAnalysis = () => {
    return <>
      {/* Middle Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Customer Growth Trend */}
          <div className="col-span-2 bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  Customer Growth Trend
              </h2>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">Line Graph</span>
            </div>
      </div>
  
          {/* Delivery Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Customer review Distribution
            </h2>
            <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">Bar Chart</span>
            </div>
          </div>
        </div>
  
        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Average Price by Category */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Customer Distribution by State
            </h2>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">State Map</span>
            </div>
          </div>
  
          {/* Delivery Time Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Order By Hours
            </h2>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">Line Graph</span>
            </div>
          </div>
        </div>
    </>
  };
  
  export default CustomerAnalysis;