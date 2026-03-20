import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // This function runs automatically when the component loads
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      // Pass the userDomain as a URL parameter to the backend
      const response = await fetch(`http://localhost:8000/get-inventory?domain=${encodeURIComponent(userDomain)}`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setInventory(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to connect to the database.");
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Helper function to calculate shelf-life alerts
  const getExpiryAlert = (dateString) => {
    if (!dateString) return null;
    
    const expiryDate = new Date(dateString);
    const today = new Date();
    // Calculate the difference in days
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: "Expired! Waste Risk", styles: "bg-red-100 text-red-800 border-red-300 font-bold animate-pulse" };
    } else if (diffDays <= 7) {
      return { text: `Expiring in ${diffDays} days`, styles: "bg-orange-100 text-orange-800 border-orange-300 font-bold" };
    } else {
      return { text: `Expires: ${dateString}`, styles: "bg-green-50 text-green-700 border-green-200" };
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Live Inventory</h2>
        <button 
          onClick={fetchInventory}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-4 border border-blue-200 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <span>🔄</span> Refresh Data
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8 animate-pulse">Loading database records...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : inventory.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No items found. Start scanning!</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dynamic Details</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">{item.item_name}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-700">{item.estimated_count}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    <span className="bg-gray-100 text-gray-700 py-1 px-2 rounded-md text-xs font-medium border border-gray-200">
                      {item.domain}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {item.metadata && Object.keys(item.metadata).length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {/* 1. Render the Expiration Alert (if it exists) */}
                        {item.metadata.expiration_date && (
                          <span className={`inline-block py-1 px-2 rounded-md text-[11px] border shadow-sm ${getExpiryAlert(item.metadata.expiration_date).styles}`}>
                            ⚠️ {getExpiryAlert(item.metadata.expiration_date).text}
                          </span>
                        )}
                        
                        {/* 2. Render all other normal metadata tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(item.metadata).map(([key, value]) => {
                            if (key === 'expiration_date') return null; // Skip date here since we showed it above
                            return (
                              <span key={key} className="bg-blue-50 text-blue-700 py-0.5 px-2 rounded text-[11px] font-medium border border-blue-100">
                                <span className="capitalize">{key.replace('_', ' ')}</span>: {value}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No details</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}