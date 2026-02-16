export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h1>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">
          Platform settings and configuration options will be available here.
        </p>
        
        <div className="mt-8 space-y-6">
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">System Information</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Platform:</span> WantokJobs</p>
              <p><span className="font-medium">Version:</span> 1.0.0</p>
              <p><span className="font-medium">Environment:</span> {import.meta.env.MODE}</p>
            </div>
          </div>

          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <div className="space-y-2">
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                Export Data
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm ml-2">
                View Logs
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Support</h2>
            <p className="text-sm text-gray-600">
              For technical support or feature requests, contact the development team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
