"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';

interface User {
  id: string;
  name: string;
  email: string;
}

interface ContactData {
  name: string;
  phone: string;
  email: string;
}

export default function ReactivationCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [hasReactivationBot, setHasReactivationBot] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [editingData, setEditingData] = useState<ContactData[]>([]);

  const checkReactivationBotAccess = useCallback(async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("reactivation_bot")
        .eq("client_id", user.id)
        .single();

      if (error) {
        console.error("Error checking reactivation bot access:", error);
        return;
      }

      setHasReactivationBot(data?.reactivation_bot || false);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return;

    const user = JSON.parse(userData);
    setUser(user);
    checkReactivationBotAccess(user);
  }, [checkReactivationBotAccess]);

  const parseCSV = (csvText: string): ContactData[] => {
    const lines = csvText.split('\n');
    
    const data: ContactData[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          data.push({
            name: values[0] || '',
            phone: values[1] || '',
            email: values[2] || ''
          });
        }
      }
    }
    return data;
  };

  const parseXLSX = async (file: File): Promise<ContactData[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error("File must contain at least a header row and one data row");
      }
      
      const data: ContactData[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (row && row.length >= 3) {
          data.push({
            name: (row[0]?.toString() || '').trim(),
            phone: (row[1]?.toString() || '').trim(),
            email: (row[2]?.toString() || '').trim()
          });
        }
      }
      
      return data;
    } catch (error) {
      console.error("XLSX parsing error:", error);
      throw new Error("Error parsing XLSX file. Please ensure it has the correct format with name, phone, and email columns.");
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const isValidType = file.type === "text/csv" || 
                         file.name.endsWith(".csv") || 
                         file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                         file.name.endsWith(".xlsx");
      
      if (!isValidType) {
        setUploadError("Please select a valid CSV or XLSX file");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(false);

      try {
        let parsedData: ContactData[];
        
        if (file.name.endsWith('.xlsx')) {
          parsedData = await parseXLSX(file);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            const csvText = e.target?.result as string;
            const parsedData = parseCSV(csvText);
            setEditingData([...parsedData]);
            setShowDataTable(true);
          };
          reader.readAsText(file);
          return;
        }
        
        setEditingData([...parsedData]);
        setShowDataTable(true);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Error parsing file. Please ensure it has the correct format.");
      }
    }
  };

  const handleDataEdit = (index: number, field: keyof ContactData, value: string) => {
    const newData = [...editingData];
    newData[index] = { ...newData[index], [field]: value };
    setEditingData(newData);
  };

  const handleConfirmCampaign = async () => {
    if (!user) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Convert edited data back to CSV
      const csvContent = [
        'name,phone,email',
        ...editingData.map(row => `${row.name},${row.phone},${row.email}`)
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append("csv_file", blob, "campaign.csv");
      formData.append("clinic_name", user.name);
      formData.append("outbound_type", "reactivation");

      // Send to webhook
      const response = await fetch("https://n8n.cliniclab.ai/webhook/outbound", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      setUploadSuccess(true);
      setShowDataTable(false);
      setEditingData([]);
      
      // Close modal after successful upload
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
        resetModal();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,phone,email\nJohn Doe,1234567890,john@example.com\nJane Smith,9876543210,jane@example.com";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reactivation_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(false);
    setEditingData([]);
    setShowDataTable(false);
    const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(true);
  };

  const handleModalClose = () => {
    if (showDataTable && editingData.length > 0) {
      setShowConfirmDialog(true);
    } else {
      setShowUploadModal(false);
      resetModal();
    }
  };

  const confirmClose = () => {
    setShowConfirmDialog(false);
    setShowUploadModal(false);
    resetModal();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Reactivation Campaigns</h1>
          <p className="text-neutral-400 mt-2">Loading...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!hasReactivationBot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Reactivation Campaigns</h1>
          <p className="text-neutral-400 mt-2">Access denied</p>
        </div>
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Access Restricted
              </h3>
              <p className="text-neutral-400 mb-4">
                You don&apos;t have access to reactivation campaigns. Please contact your administrator to enable this feature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reactivation Campaigns</h1>
          <p className="text-neutral-400 mt-2">
            Manage your patient reactivation campaigns
          </p>
        </div>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="bg-sky-500 hover:bg-sky-600 text-white"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Upload Contact List
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Active Campaigns
            </CardTitle>
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">3</div>
            <p className="text-xs text-green-400">+1 this week</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Total Contacts
            </CardTitle>
            <svg
              className="h-4 w-4 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">1,247</div>
            <p className="text-xs text-blue-400">+89 this month</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Response Rate
            </CardTitle>
            <svg
              className="h-4 w-4 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">24.5%</div>
            <p className="text-xs text-yellow-400">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Appointments Booked
            </CardTitle>
            <svg
              className="h-4 w-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">89</div>
            <p className="text-xs text-purple-400">+12 this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Campaigns</CardTitle>
          <CardDescription className="text-neutral-400">
            Your latest reactivation campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-neutral-400 mb-4">
              Upload a CSV or XLSX file to create your first reactivation campaign
            </p>
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              Upload Contact List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={handleModalClose}
        title="Upload Contact List"
        description="Upload a CSV or XLSX file with patient contact information to start a reactivation campaign"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6 p-2">
          {!showDataTable ? (
            <>
              {/* File Upload Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => document.getElementById("csv-upload")?.click()}
                    variant="outline"
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Choose File
                  </Button>
                  <Button
                    onClick={downloadTemplate}
                    variant="ghost"
                    className="text-sky-500 hover:text-sky-400 hover:bg-sky-500/10"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Template
                  </Button>
                </div>

                {selectedFile && (
                  <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <p className="text-white font-medium">{selectedFile.name}</p>
                          <p className="text-neutral-400 text-sm">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedFile(null)}
                        variant="ghost"
                        size="sm"
                        className="text-neutral-400 hover:text-white"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Success/Error Messages */}
                {uploadSuccess && (
                  <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-green-400 font-medium">
                        Campaign uploaded successfully! Your reactivation campaign has been queued.
                      </p>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-red-400 font-medium">{uploadError}</p>
                    </div>
                  </div>
                )}

                {/* File Format Instructions */}
                <div className="p-4 bg-neutral-800/30 rounded-lg border border-neutral-700">
                  <h4 className="text-sm font-semibold text-neutral-300 mb-3">
                    File Format Requirements
                  </h4>
                  <ul className="text-sm text-neutral-400 space-y-1">
                    <li>• File must be in CSV or XLSX format (.csv, .xlsx)</li>
                    <li>• Required columns: <code className="text-sky-400">name</code>, <code className="text-sky-400">phone</code>, <code className="text-sky-400">email</code></li>
                    <li>• First row should contain column headers</li>
                    <li>• Maximum file size: 10MB</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Data Table Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Review & Edit Contact Data
                  </h3>
                  <span className="text-sm text-neutral-400">
                    {editingData.length} contacts
                  </span>
                </div>

                {/* Scrollable Table */}
                <div className="max-h-96 overflow-y-auto border border-neutral-700 rounded-lg">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300 w-20 min-w-[80px]">
                          Sr No.
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                          Phone
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingData.map((contact, index) => (
                        <tr key={index} className="border-b border-neutral-700/50 hover:bg-neutral-800/30">
                          <td className="py-3 px-4 text-neutral-400 text-sm font-medium w-20 min-w-[80px]">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="text"
                              value={contact.name}
                              onChange={(e) => handleDataEdit(index, 'name', e.target.value)}
                              className="bg-transparent border-neutral-600 text-white placeholder-neutral-400 focus:border-sky-500 focus:ring-sky-500"
                              placeholder="Enter name"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="text"
                              value={contact.phone}
                              onChange={(e) => handleDataEdit(index, 'phone', e.target.value)}
                              className="bg-transparent border-neutral-600 text-white placeholder-neutral-400 focus:border-sky-500 focus:ring-sky-500"
                              placeholder="Enter phone"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => handleDataEdit(index, 'email', e.target.value)}
                              className="bg-transparent border-neutral-600 text-white placeholder-neutral-400 focus:border-sky-500 focus:ring-sky-500"
                              placeholder="Enter email"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-700">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmCampaign}
                    disabled={uploading}
                    className="bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Campaign...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Confirm Campaign
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Confirm Close"
        description="Are you sure you want to close without saving?"
        maxWidth="max-w-lg"
      >
        <div className="flex items-center justify-end gap-3 pt-4 mr-4 mb-4">
          <Button
            onClick={() => setShowConfirmDialog(false)}
            variant="outline"
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            Keep Editing
          </Button>
          <Button
            onClick={confirmClose}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Close Without Saving
          </Button>
        </div>
      </Modal>
    </div>
  );
}
