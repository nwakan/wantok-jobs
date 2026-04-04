import React, { useState, useEffect } from 'react';
import api from '../api';

const WhatsAppConnect = () => {
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState(null);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await api.get('/whatsapp/activation-status');
      if (res.data.success) setStatus(res.data);
    } catch (err) {
      console.error('Status check failed:', err);
    }
  };

  const connect = async () => {
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/generate-activation-code');
      if (res.data.success) {
        setCode(res.data.activation_code);
        setUrl(res.data.whatsapp_url);
      }
    } catch (err) {
      alert('Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect WhatsApp?')) return;
    setLoading(true);
    try {
      await api.delete('/whatsapp/disconnect');
      setStatus({ connected: false });
      setCode(null);
      setUrl(null);
      alert('Disconnected successfully');
    } catch (err) {
      alert('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (status?.connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-green-900">✅ WhatsApp Connected</p>
            <p className="text-sm text-green-700">{status.phone_number}</p>
          </div>
          <button onClick={disconnect} disabled={loading}
            className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (code && url) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium mb-2">Activation Code: {code}</p>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
          📱 Open WhatsApp
        </a>
        <p className="text-sm text-gray-600 mt-2">Click the button above and send the message</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">WhatsApp Not Connected</p>
          <p className="text-sm text-gray-600">Connect to receive job notifications</p>
        </div>
        <button onClick={connect} disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          {loading ? 'Loading...' : 'Connect'}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppConnect;
