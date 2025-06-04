
function KPICard() {
  return <>
        {/* KPI Cards */}
    <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Total Profit
          </h3>
          <p className="text-3xl font-bold text-gray-800">000000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Total Order
          </h3>
          <p className="text-3xl font-bold text-gray-800">000000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Total Customer
          </h3>
          <p className="text-3xl font-bold text-gray-800">000000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Rating</h3>
          <p className="text-3xl font-bold text-gray-800">000000</p>
        </div>
      </div>
  </>
}

export default KPICard