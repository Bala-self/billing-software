import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineSearch,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineUserGroup,
  HiOutlineLogin,
  HiOutlineLogout,
  HiOutlineCalendar,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

const Attendance = () => {
  const [todayData, setTodayData] = useState({ summary: {}, attendance: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [quickId, setQuickId] = useState("");

  // Manual modal
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "",
    checkOut: "",
    status: "Present",
    remarks: "",
  });
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/attendance/today");
      setTodayData(res.data?.data || { summary: {}, attendance: [] });
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleCheckIn = async (employeeId) => {
    const id = employeeId || quickId;
    if (!id) { showToast("error", "Enter Employee ID"); return; }
    setActionLoading(id + "-in");
    try {
      await API.post("/attendance/check-in", { employeeId: id.toUpperCase() });
      showToast("success", `${id.toUpperCase()} checked in - ${new Date().toLocaleTimeString()}`);
      setQuickId("");
      fetchToday();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Check-in failed");
    } finally { setActionLoading(""); }
  };

  const handleCheckOut = async (employeeId) => {
    const id = employeeId || quickId;
    if (!id) { showToast("error", "Enter Employee ID"); return; }
    setActionLoading(id + "-out");
    try {
      await API.post("/attendance/check-out", { employeeId: id.toUpperCase() });
      showToast("success", `${id.toUpperCase()} checked out - ${new Date().toLocaleTimeString()}`);
      setQuickId("");
      fetchToday();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Check-out failed");
    } finally { setActionLoading(""); }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualError("");
    if (!manualForm.employeeId) { setManualError("Employee ID required"); return; }
    try {
      setManualSaving(true);
      await API.post("/attendance", manualForm);
      showToast("success", "Manual attendance saved");
      setIsManualOpen(false);
      setManualForm({ employeeId: "", date: new Date().toISOString().split("T")[0], checkIn: "", checkOut: "", status: "Present", remarks: "" });
      fetchToday();
    } catch (err) {
      setManualError(err.response?.data?.message || "Failed to save");
    } finally { setManualSaving(false); }
  };

  const filtered = todayData.attendance?.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.employee.name.toLowerCase().includes(s) || item.employee.employeeId.toLowerCase().includes(s) || item.employee.department.toLowerCase().includes(s);
  }) || [];

  const summary = todayData.summary || {};
  const inputCls = "w-full px-3 py-2.5 text-[12px] rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition";

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-[#111] flex items-center gap-2"><HiOutlineClock className="text-[#111]" /> Attendance</h1>
          <p className="text-[13px] text-gray-500 mt-1">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • {summary.totalEmployees || 0} active employees • Check-in/out feature</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchToday} className="bg-white border border-gray-200 hover:bg-gray-50 text-[#111] px-3 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1"><HiOutlineRefresh className={loading ? "animate-spin" : ""} />Refresh</button>
          <button onClick={() => setIsManualOpen(true)} className="bg-[#111] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1"><HiOutlinePlus />Manual</button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 flex items-center gap-2 text-[12px] px-4 py-3 rounded-xl border ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />} {toast.message}
          <button onClick={() => setToast(null)} className="ml-auto"><HiOutlineX /></button>
        </div>
      )}

      {/* Quick Check-in/out - Prominent Feature */}
      <div className="bg-[#111] rounded-xl p-5 mb-6 text-white">
        <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2"><HiOutlineClock /> Quick Check-in / Check-out</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Enter Employee ID (e.g. EMP001)" value={quickId} onChange={e => setQuickId(e.target.value.toUpperCase())} className="flex-1 px-4 py-3 rounded-xl bg-white text-[#111] text-[13px] font-mono font-bold outline-none placeholder:text-gray-400" />
          <div className="flex gap-2">
            <button disabled={actionLoading} onClick={() => handleCheckIn()} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
              {actionLoading === quickId + "-in" ? <RiLoader4Line className="animate-spin" /> : <HiOutlineLogin />} Check In
            </button>
            <button disabled={actionLoading} onClick={() => handleCheckOut()} className="flex-1 sm:flex-none bg-white hover:bg-gray-100 disabled:opacity-50 text-[#111] px-6 py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
              {actionLoading === quickId + "-out" ? <RiLoader4Line className="animate-spin" /> : <HiOutlineLogout />} Check Out
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Backend timestamp auto - no manual time entry needed • Prevents double check-in</p>
      </div>

      {/* Summary Cards - Black Theme */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-[10px] uppercase font-bold text-gray-400">Total</p><p className="text-[22px] font-bold text-[#111] mt-1">{summary.totalEmployees || 0}</p><p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><HiOutlineUserGroup />Active</p></div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-200"><p className="text-[10px] uppercase font-bold text-green-700">Present</p><p className="text-[22px] font-bold text-green-700 mt-1">{summary.present || 0}</p><p className="text-[10px] text-green-600 mt-1">Checked in</p></div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-200"><p className="text-[10px] uppercase font-bold text-red-600">Absent</p><p className="text-[22px] font-bold text-red-700 mt-1">{summary.absent || 0}</p><p className="text-[10px] text-red-500 mt-1">Not marked</p></div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200"><p className="text-[10px] uppercase font-bold text-amber-700">Half Day</p><p className="text-[22px] font-bold text-amber-800 mt-1">{summary.halfDay || 0}</p></div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200"><p className="text-[10px] uppercase font-bold text-blue-600">Leave</p><p className="text-[22px] font-bold text-blue-700 mt-1">{summary.leave || 0}</p></div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 mb-5 flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2.5 text-[12px] rounded-xl border border-gray-200 outline-none focus:border-gray-400" />
        </div>
        <span className="text-[11px] text-gray-500 py-2.5">{filtered.length} records • Today {new Date().toLocaleDateString()}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <HiOutlineCalendar className="text-[#111]" />
          <h3 className="text-[13px] font-bold">Today's Attendance - Check-in/out Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b">
              <tr><th className="py-3 px-4">Employee</th><th className="px-4">Dept</th><th className="px-4 text-center">Check In</th><th className="px-4 text-center">Check Out</th><th className="px-4 text-center">Hours</th><th className="px-4 text-center">Status</th><th className="px-4 text-right">Check-in/out Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="py-20 text-center text-gray-400"><RiLoader4Line className="animate-spin mx-auto text-xl mb-2" />Loading...</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={7} className="py-20 text-center text-gray-400">No employees</td></tr> :
                  filtered.map(item => (
                    <tr key={item.employee._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4"><p className="font-bold text-[#111]">{item.employee.name}</p><p className="font-mono text-[11px] text-gray-500">{item.employee.employeeId}</p></td>
                      <td className="px-4"><span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-semibold">{item.employee.department}</span></td>
                      <td className="px-4 text-center">{item.checkIn ? <span className="font-mono font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg text-[11px]">{new Date(item.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span> : <span className="text-gray-300">--</span>}</td>
                      <td className="px-4 text-center">{item.checkOut ? <span className="font-mono font-bold bg-[#111] text-white px-2 py-1 rounded-lg text-[11px]">{new Date(item.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span> : <span className="text-gray-300">--</span>}</td>
                      <td className="px-4 text-center font-mono font-bold">{item.workingHours || "--"}</td>
                      <td className="px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === "Present" ? "bg-green-50 text-green-700" : item.status === "Absent" ? "bg-red-50 text-red-600" : item.status === "Half Day" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-600"}`}>{item.status}</span></td>
                      <td className="px-4 text-right">
                        <div className="flex justify-end gap-1">
                          {!item.checkIn && <button disabled={actionLoading === item.employee.employeeId + "-in"} onClick={() => handleCheckIn(item.employee.employeeId)} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"><HiOutlineLogin />In</button>}
                          {item.checkIn && !item.checkOut && <button disabled={actionLoading === item.employee.employeeId + "-out"} onClick={() => handleCheckOut(item.employee.employeeId)} className="bg-[#111] hover:bg-black disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"><HiOutlineLogout />Out</button>}
                          {item.checkIn && item.checkOut && <span className="text-[11px] text-gray-400 flex items-center gap-1"><HiOutlineCheckCircle className="text-green-500" />Done {item.workingHours}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {isManualOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border">
            <div className="flex justify-between items-center px-6 py-4 border-b"><h3 className="text-[13px] font-bold">Manual Attendance</h3><button onClick={() => setIsManualOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><HiOutlineX /></button></div>
            {manualError && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-[11px] px-3 py-2 rounded-xl">{manualError}</div>}
            <form onSubmit={handleManualSubmit} className="p-6 space-y-3">
              <div><label className="block text-[11px] font-semibold mb-1">Employee ID *</label><input type="text" required placeholder="EMP001" value={manualForm.employeeId} onChange={e => setManualForm({ ...manualForm, employeeId: e.target.value.toUpperCase() })} className={inputCls + " font-mono uppercase"} /></div>
              <div><label className="block text-[11px] font-semibold mb-1">Date *</label><input type="date" required value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold mb-1">Check In</label><input type="time" value={manualForm.checkIn} onChange={e => setManualForm({ ...manualForm, checkIn: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-[11px] font-semibold mb-1">Check Out</label><input type="time" value={manualForm.checkOut} onChange={e => setManualForm({ ...manualForm, checkOut: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className="block text-[11px] font-semibold mb-1">Status</label><select value={manualForm.status} onChange={e => setManualForm({ ...manualForm, status: e.target.value })} className={inputCls}><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></div>
              <div><label className="block text-[11px] font-semibold mb-1">Remarks</label><textarea rows={2} value={manualForm.remarks} onChange={e => setManualForm({ ...manualForm, remarks: e.target.value })} className={inputCls + " resize-none"} /></div>
              <div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={() => setIsManualOpen(false)} className="px-4 py-2.5 text-[12px] border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button><button type="submit" disabled={manualSaving} className="bg-[#111] hover:bg-black disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2">{manualSaving && <RiLoader4Line className="animate-spin" />}Save</button></div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Attendance;
