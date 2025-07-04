import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Upload, Target, Calendar, Edit2, Trash2 } from 'lucide-react';

interface Campaign {
  id: string;
  avatar: string | null;
  offer: string | null;
  calendar_url: string | null;
  goal: string | null;
  status: string | null;
  created_at: string;
}

export function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    offer: '',
    calendar_url: '',
    goal: '',
    status: 'draft',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const handleWebhookTrigger = async (campaign: Campaign, file: File) => {
    if (!user || !file) return;

    const formData = new FormData();
    formData.append("user_id", user.id);
    formData.append("campaign", JSON.stringify(campaign));
    formData.append("csv", file);

    try {
      const res = await fetch("https://mazirhx.app.n8n.cloud/webhook/start-campaign-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Webhook failed");
      alert("CSV uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }
  };

  const fetchCampaigns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('campaigns').insert({
        user_id: user.id,
        ...formData,
      });

      if (error) throw error;

      // Trigger webhook on campaign creation
      try {
        await fetch('https://mazirhx.app.n8n.cloud/webhook/campaign-created', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            campaign: formData,
          }),
        });
      } catch (webhookError) {
        console.error('Error triggering webhook:', webhookError);
      }

      setFormData({ offer: '', calendar_url: '', goal: '', status: 'draft' });
      setShowCreateForm(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleFileUpload = async (campaignId: string) => {
    if (!csvFile || !user) return;

    setUploadLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const leads = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const lead: any = {
            user_id: user.id,
            campaign_id: campaignId,
            status: 'pending',
          };

          headers.forEach((header, index) => {
            if (values[index]) {
              switch (header) {
                case 'name':
                  lead.name = values[index];
                  break;
                case 'phone':
                  lead.phone = values[index];
                  break;
                case 'email':
                  lead.email = values[index];
                  break;
                case 'company_name':
                  lead.company_name = values[index];
                  break;
                case 'job_title':
                  lead.job_title = values[index];
                  break;
                case 'source_url':
                  lead.source_url = values[index];
                  break;
                case 'source_platform':
                  lead.source_platform = values[index];
                  break;
              }
            }
          });

          return lead;
        });

      // Insert leads
      const { error } = await supabase
        .from('uploaded_leads')
        .insert(leads);

      if (error) throw error;

      // Trigger n8n webhook
      try {
        await fetch('https://mazirhx.app.n8n.cloud/webhook/start-campaign-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            user_id: user.id,
            leads_count: leads.length,
          }),
        });
      } catch (webhookError) {
        console.error('Error triggering webhook:', webhookError);
      }

      setCsvFile(null);
      setShowUploadModal(null);
      alert('Leads uploaded successfully!');
    } catch (error) {
      console.error('Error uploading leads:', error);
      alert('Error uploading leads. Please check your CSV format.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-2 text-gray-600">
            Manage your outreach campaigns and upload leads
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </button>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Create New Campaign
          </h2>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Description
                </label>
                <input
                  type="text"
                  value={formData.offer}
                  onChange={(e) =>
                    setFormData({ ...formData, offer: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Free consultation call"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar URL
                </label>
                <input
                  type="url"
                  value={formData.calendar_url}
                  onChange={(e) =>
                    setFormData({ ...formData, calendar_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://calendly.com/..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Goal
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) =>
                  setFormData({ ...formData, goal: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                placeholder="Describe your campaign objectives..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  campaign.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : campaign.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {campaign.status || 'Draft'}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {campaign.offer || 'Untitled Campaign'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {campaign.goal || 'No goal set'}
            </p>

            {campaign.calendar_url && (
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="truncate">Calendar linked</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-500">
                {new Date(campaign.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => setShowUploadModal(campaign.id)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </button>
            </div>

            <div className="flex justify-between gap-2">
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                onClick={() => window.location.href = `/campaigns/${campaign.id}/chat`}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                onClick={() => handleDeleteCampaign(campaign.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No campaigns yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first campaign to start reaching out to leads.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Campaign
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Leads CSV
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file with columns: name, phone, email, company_name, job_title, source_url, source_platform
            </p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(null);
                    setCsvFile(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleFileUpload(showUploadModal)}
                  disabled={!csvFile || uploadLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}