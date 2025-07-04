
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function EditCampaign() {
  const { id } = useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      supabase.from('campaigns').select('*').eq('id', id).single().then(({ data }) => {
        setCampaign(data);
      });
    }
  }, [id]);

  const handleUpload = async () => {
    if (!csvFile || !campaign || !user?.id) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('campaign', JSON.stringify(campaign));
    formData.append('csv', csvFile);

    try {
      await fetch('https://mazirhx.app.n8n.cloud/webhook/start-campaign-upload', {
        method: 'POST',
        body: formData
      });
      alert('Upload successful and webhook sent.');
    } catch (e) {
      alert('Upload failed.');
    }
    setUploading(false);
  };

  if (!campaign) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Upload Leads to: {campaign.offer}</h2>
      <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
      <button
        onClick={handleUpload}
        disabled={uploading || !csvFile}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload CSV"}
      </button>
    </div>
  );
}
