import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  HiOutlineCheckCircle,
  HiOutlineCog,
  HiOutlineCreditCard,
  HiOutlineExclamation,
  HiOutlineOfficeBuilding,
  HiOutlineX,
} from "react-icons/hi";

// Full list of Indian states (name + 2-digit GST state code)
const INDIAN_STATES = [
  { name: "Andhra Pradesh", code: "37" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chandigarh", code: "04" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Delhi", code: "07" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jammu and Kashmir", code: "01" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Odisha", code: "21" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // Business Profile Form State
  const [profile, setProfile] = useState({
    name: "",
    legalName: "",
    email: "",
    phone: "",
    address: { street: "", city: "", state: "Tamil Nadu", stateCode: "33", pincode: "", country: "India" },
    taxInfo: { gstin: "", pan: "", isGstRegistered: false },
    logoUrl: "",
  });

  // Billing & Print Preferences State
  const [settings, setSettings] = useState({
    currency: "INR",
    currencySymbol: "₹",
    invoicePrefix: "INV-",
    billPrefix: "BILL-",
    quotationPrefix: "QTN-",
    poPrefix: "PUR-",
    defaultGstRate: 18,
    autoRoundOff: true,
    defaultPaymentTermsDays: 15,
    defaultTermsAndConditions: "",
    defaultInvoiceNotes: "",
    printLayout: "A4",
  });

  // Bank & Remittance State
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    upiId: "",
  });

  // Fetch Business Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await API.get("/settings");
        const b = res.data?.data;
        if (b) {
          setProfile({
            name: b.name || "",
            legalName: b.legalName || "",
            email: b.email || "",
            phone: b.phone || "",
            address: b.address || { street: "", city: "", state: "Tamil Nadu", stateCode: "33", pincode: "" },
            taxInfo: b.taxInfo || { gstin: "", pan: "", isGstRegistered: false },
            logoUrl: b.logoUrl || "",
          });
          setSettings(b.settings || {
            currency: "INR",
            currencySymbol: "₹",
            invoicePrefix: "INV-",
            billPrefix: "BILL-",
            quotationPrefix: "QTN-",
            poPrefix: "PUR-",
            defaultGstRate: 18,
            autoRoundOff: true,
            defaultPaymentTermsDays: 15,
            defaultTermsAndConditions: "",
            defaultInvoiceNotes: "",
            printLayout: "A4",
          });
          setBankDetails(b.bankDetails || {
            bankName: "",
            accountName: "",
            accountNumber: "",
            ifscCode: "",
            branch: "",
            upiId: "",
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load business settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await API.put("/settings/profile", profile);
      setSuccessMessage("Business profile and GST tax info updated.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // Save Billing Preferences
  const handleSaveBilling = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await API.put("/settings/billing-preferences", { settings });
      setSuccessMessage("Billing numbering and print layout preferences saved.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update billing preferences.");
    } finally {
      setSaving(false);
    }
  };

  // Save Bank Details
  const handleSaveBank = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await API.put("/settings/bank-details", { bankDetails });
      setSuccessMessage("Bank payout and UPI remittance details saved.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update bank details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Company & Billing Settings">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("profile")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "profile"
                ? "bg-[#111111] text-white shadow-sm shadow-rose-600/30"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <HiOutlineOfficeBuilding className="text-base" aria-hidden="true" />
            <span>Company & GST Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "billing"
                ? "bg-[#111111] text-white shadow-sm shadow-rose-600/30"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <HiOutlineCog className="text-base" aria-hidden="true" />
            <span>Invoice & Numbering</span>
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "bank"
                ? "bg-[#111111] text-white shadow-sm shadow-rose-600/30"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <HiOutlineCreditCard className="text-base" aria-hidden="true" />
            <span>Bank & UPI Remittance</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2"><HiOutlineCheckCircle className="text-base" aria-hidden="true" />{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="font-bold" aria-label="Dismiss success message"><HiOutlineX className="text-base" /></button>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-[#111111] text-xs p-3 rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2"><HiOutlineExclamation className="text-base" aria-hidden="true" />{error}</span>
          <button onClick={() => setError("")} className="font-bold" aria-label="Dismiss error message"><HiOutlineX className="text-base" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 max-w-4xl">
          {/* ================= SECTION 1: BUSINESS PROFILE ================= */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Company & Tax Profile</h3>
                <p className="text-xs text-gray-400">This information appears directly on your PDF invoices and tax reports</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Trading / Business Name <span className="text-gray-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Legal Company Name</label>
                  <input
                    type="text"
                    value={profile.legalName}
                    onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                    placeholder="e.g. Balakrishnan Enterprises Pvt Ltd"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Business Email</label>
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Business Phone</label>
                  <input
                    type="tel"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Tax GSTIN & PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Business GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={profile.taxInfo.gstin}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        taxInfo: { ...profile.taxInfo, gstin: e.target.value.toUpperCase() },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AAAAA0000A"
                    value={profile.taxInfo.pan}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        taxInfo: { ...profile.taxInfo, pan: e.target.value.toUpperCase() },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Physical Address & Location</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Street Address / Building"
                      value={profile.address.street}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, street: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={profile.address.city}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, city: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={profile.address.state}
                      onChange={(e) => {
                        const sName = e.target.value;
                        const match = INDIAN_STATES.find((s) => s.name === sName);
                        setProfile({
                          ...profile,
                          address: { ...profile.address, state: sName, stateCode: match ? match.code : "" },
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-semibold"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>{s.name} (Code: {s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={profile.address.pincode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, pincode: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#111111] hover:bg-black disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= SECTION 2: BILLING & INVOICE NUMBERING ================= */}
          {activeTab === "billing" && (
            <form onSubmit={handleSaveBilling} className="space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Invoice Numbering & Print Format</h3>
                <p className="text-xs text-gray-400">Configure sequential prefixes, default tax rates, and PDF layout</p>
              </div>

              {/* Prefixes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Bill Prefix</label>
                  <input
                    type="text"
                    value={settings.billPrefix}
                    onChange={(e) => setSettings({ ...settings, billPrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Quotation Prefix</label>
                  <input
                    type="text"
                    value={settings.quotationPrefix}
                    onChange={(e) => setSettings({ ...settings, quotationPrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">PO Prefix</label>
                  <input
                    type="text"
                    value={settings.poPrefix}
                    onChange={(e) => setSettings({ ...settings, poPrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase font-bold"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default GST Rate (%)</label>
                  <select
                    value={settings.defaultGstRate}
                    onChange={(e) => setSettings({ ...settings, defaultGstRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-bold"
                  >
                    {[0, 5, 12, 18, 28].map((r) => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Credit Payment Days</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.defaultPaymentTermsDays}
                    onChange={(e) => setSettings({ ...settings, defaultPaymentTermsDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Print Layout</label>
                  <select
                    value={settings.printLayout}
                    onChange={(e) => setSettings({ ...settings, printLayout: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  >
                    <option value="A4">A4 Full Sheet (Tax Invoice)</option>
                    <option value="Thermal 80mm">Thermal 80mm (POS Receipt)</option>
                    <option value="Thermal 58mm">Thermal 58mm (Mini Receipt)</option>
                  </select>
                </div>
              </div>

              {/* Auto Round-Off Toggle */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="autoRoundOff"
                  checked={settings.autoRoundOff}
                  onChange={(e) => setSettings({ ...settings, autoRoundOff: e.target.checked })}
                  className="rounded text-[#111111] focus:ring-gray-300 w-4 h-4"
                />
                <label htmlFor="autoRoundOff" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Auto Round-Off Invoice Totals
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                    Automatically round invoice grand total to the nearest rupee
                  </span>
                </label>
              </div>

              {/* Default Terms & Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Terms & Conditions on Invoices</label>
                <textarea
                  rows={2}
                  value={settings.defaultTermsAndConditions}
                  onChange={(e) => setSettings({ ...settings, defaultTermsAndConditions: e.target.value })}
                  placeholder="e.g. Goods once sold cannot be returned. Subject to local jurisdiction."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Invoice Notes / Footer</label>
                <textarea
                  rows={2}
                  value={settings.defaultInvoiceNotes}
                  onChange={(e) => setSettings({ ...settings, defaultInvoiceNotes: e.target.value })}
                  placeholder="e.g. Thank you for your business! Payment due within 15 days."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#111111] hover:bg-black disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Billing Preferences</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= SECTION 3: BANK DETAILS ================= */}
          {activeTab === "bank" && (
            <form onSubmit={handleSaveBank} className="space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Bank Remittance & UPI Footers</h3>
                <p className="text-xs text-gray-400">Printed on the bottom of invoices for direct NEFT/RTGS/UPI payments</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Beneficiary Account Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Balakrishnan Enterprises Pvt Ltd"
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50200012345678"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Guindy, Chennai"
                    value={bankDetails.branch}
                    onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">UPI ID for Quick QR Remittance</label>
                  <input
                    type="text"
                    placeholder="e.g. store@okaxis"
                    value={bankDetails.upiId}
                    onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#111111] hover:bg-black disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Bank Details</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Settings;
