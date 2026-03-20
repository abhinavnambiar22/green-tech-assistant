import { useState, useRef } from 'react';

export default function Scanner({ userDomain }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editableItems, setEditableItems] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null); 

  const startCamera = async () => {
    setHasConsent(true);
    setCameraError('');
    setCapturedImage(null);
    setEditableItems(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setCameraError("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setHasConsent(false);
    setCapturedImage(null);
    setEditableItems(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL('image/jpeg'));
      video.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setEditableItems(null);
    startCamera(); 
  };

  const submitToAI = async () => {
    setIsAnalyzing(true);
    setEditableItems(null);
    try {
      const response = await fetch('http://localhost:8000/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, domain: userDomain }), // <--- Locked to User's Domain!
      });
      const data = await response.json();
      setEditableItems(data.ai_analysis.items || []);
    } catch (error) {
      alert("Error connecting to backend AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editableItems];
    updatedItems[index][field] = value;
    setEditableItems(updatedItems);
  };

  // NEW: Function to handle changes inside the dynamic metadata dictionary
  const handleMetadataChange = (index, key, value) => {
    const updatedItems = [...editableItems];
    updatedItems[index].metadata[key] = value;
    setEditableItems(updatedItems);
  };

  const handleRemoveItem = (index) => {
    setEditableItems(editableItems.filter((_, i) => i !== index));
  };

  const handleSaveToDatabase = async () => {
    try {
      const response = await fetch('http://localhost:8000/save-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: editableItems, domain: userDomain }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert(`✅ Successfully saved ${editableItems.length} items to the database!`);
        retakePhoto();
      } else {
        alert("❌ Failed to save to database.");
      }
    } catch (error) {
      alert("Error connecting to database.");
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-md mx-auto">
      <div className="mb-6 flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
        <span className="text-sm font-bold text-green-800">Active Department:</span>
        <span className="bg-green-600 text-white py-1 px-3 rounded-full text-xs font-bold shadow-sm">
          {userDomain}
        </span>
      </div>

      {!hasConsent ? (
        <button onClick={startCamera} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors mt-2">
          Turn On Camera
        </button>
      ) : (
        <div className="flex flex-col items-center">
          {cameraError ? (
            <p className="text-red-500 font-semibold mb-4">{cameraError}</p>
          ) : (
             <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden mb-4">
                {!capturedImage ? (
                  <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
             </div>
          )}

          {!capturedImage && !cameraError ? (
             <div className="flex w-full gap-2">
               <button onClick={stopCamera} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
               <button onClick={capturePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">📸 Snap Photo</button>
             </div>
          ) : capturedImage && !editableItems ? (
             <div className="flex flex-col w-full gap-2">
               <button onClick={submitToAI} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded shadow-lg">✨ Scan Entire Scene</button>
               <button onClick={retakePhoto} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">Retake Photo</button>
             </div>
          ) : null}

          {isAnalyzing && (
            <div className="mt-4 p-4 text-center text-blue-600 font-bold animate-pulse w-full">
              🧠 AI is extracting items and details...
            </div>
          )}

          {editableItems && !isAnalyzing && (
            <div className="mt-4 w-full">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Found {editableItems.length} items:</h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {editableItems.map((item, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm relative">
                    <button onClick={() => handleRemoveItem(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold">✕</button>

                    <div className="mb-2 pr-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Item Name</label>
                      <input type="text" value={item.item_name} onChange={(e) => handleItemChange(index, 'item_name', e.target.value)} className="w-full border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-green-500 mt-1" />
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Qty</label>
                      <input type="number" value={item.estimated_count} onChange={(e) => handleItemChange(index, 'estimated_count', e.target.value)} className="w-24 border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-green-500 mt-1" />
                    </div>

                    {/* NEW: Render the dynamic metadata fields dynamically! */}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Extracted Attributes</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(item.metadata).map(([key, value]) => (
                            <div key={key}>
                              <label className="block text-[10px] font-semibold text-gray-500 capitalize">{key.replace('_', ' ')}</label>
                              <input 
                                type="text" 
                                value={value} 
                                onChange={(e) => handleMetadataChange(index, key, e.target.value)}
                                className="w-full border border-gray-200 rounded p-1 text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-green-500 mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex w-full gap-2 mt-4 pt-4 border-t border-gray-200">
                <button onClick={retakePhoto} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Discard All</button>
                <button onClick={handleSaveToDatabase} disabled={editableItems.length === 0} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-lg disabled:opacity-50">Log All Items</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}