import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Scanner from './Scanner';
import Dashboard from './Dashboard';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <Auth />;

  // Safety fallback for the organization name
  const userOrg = session?.user?.user_metadata?.organization || "IT Equipment";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold">G</div>
            <h1 className="text-xl font-bold">Green-Tech</h1>
          </div>
          <div className="flex space-x-8">
            <button onClick={() => setActiveTab('scan')} className={`pb-1 border-b-2 font-semibold ${activeTab === 'scan' ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500'}`}>Scan</button>
            <button onClick={() => setActiveTab('inventory')} className={`pb-1 border-b-2 font-semibold ${activeTab === 'inventory' ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500'}`}>Inventory</button>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-400 hover:text-red-500">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold">{activeTab === 'scan' ? 'AI Visual Scanner' : 'Inventory Dashboard'}</h2>
          <p className="text-gray-500">Department: <span className="font-bold text-green-600">{userOrg}</span></p>
        </div>
        {activeTab === 'scan' ? <Scanner userDomain={userOrg} /> : <Dashboard userDomain={userOrg} />}
      </main>
    </div>
  );
}
export default App;