import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  HiOutlineCalendar,
  HiOutlineSearch,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineX,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

const AttendanceHistory = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeInfo, setEmployeeInfo] = useState(null);

  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", status: "Present", remarks: "" });
  const [editSaving, setEditSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await API.get("/employees", { params: { limit: 100, status: "Active" } });
      setEmployees(res.data?.data?.employees || []);
    } catch {}
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const fetchHistory = useCallback(async (page = 1) => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const params = { page, limit: 31, ...(fromDate && { fromDate }), ...(toDate && { toDate }), ...(statusFilter && { status: statusFilter }) };
      const res = await API.get(`/attendance/employee/${selectedEmployee}`, { params });
      setAttendance(res.data?.data?.attendance || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0 });
      setEmployeeInfo(res.data?.data?.employee || null);
    } catch {}
    finally { setLoading(false); }
  }, [selectedEmployee, fromDate, toDate, statusFilter]);

  useEffect(() => { if (selectedEmployee) fetchHistory(1); }, [selectedEmployee, fromDate, toDate, statusFilter, fetchHistory]);

  const handleEdit = (record) => {
    setEditRecord(record);
    setEditForm({
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : "",
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : "",
      status: record.status,
      remarks: record.remarks || "",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await API.put(`/attendance/${editRecord._id}`, editForm);
      setEditRecord(null);
      fetchHistory(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally { setEditSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      await API.delete(`/attendance/${id}`);
      fetchHistory(pagination.page);
    } catch {}
  };

  const inputCls = "w-full px-3 py-2.5 text-[12px] rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition";

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111] flex items-center gap-2"><HiOutlineClock className="text-[#111]" /> Attendance History</h1>
        <p className="text-[13px] text-gray-500 mt-1">View individual employee attendance with check-in/out times • Black theme</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Employee *</label>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className={inputCls}>
            <option value="">-- Choose Employee --</option>
            {employees.map(emp => <option key={emp._id} value={emp.employeeId}>{emp.employeeId} - {emp.name}</option>)}
          </select>
        </div>
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">From</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls} /></div>
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">To</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls} /></div>
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}><option value="">All</option><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></div>
      </div>

      {employeeInfo && (
        <div className="bg-[#111] text-white p-4 rounded-xl mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white text-[#111] rounded-xl flex items-center justify-center font-bold">{employeeInfo.name?.charAt(0)}</div>
          <div><p className="text-[13px] font-bold">{employeeInfo.name} <span className="font-mono text-[11px] text-gray-400">({employeeInfo.employeeId})</span></p><p className="text-[11px] text-gray-400">{employeeInfo.department} • {employeeInfo.designation}</p></div>
          <div className="ml-auto text-[11px] text-gray-400">{pagination.total} records • Check-in/out history</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b"><tr><th className="py-3 px-4">Date</th><th className="px-4 text-center">Check In</th><th className="px-4 text-center">Check Out</th><th className="px-4 text-center">Hours</th><th className="px-4 text-center">Status</th><th className="px-4">Remarks</th><th className="px-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {!selectedEmployee ? <tr><td colSpan={7} className="py-20 text-center text-gray-400"><HiOutlineSearch className="mx-auto text-xl mb-2" />Select employee to view check-in/out history</td></tr> :
                loading ? <tr><td colSpan={7} className="py-20 text-center text-gray-400"><RiLoader4Line className="animate-spin mx-auto text-xl mb-2" />Loading...</td></tr> :
                  attendance.length === 0 ? <tr><td colSpan={7} className="py-20 text-center text-gray-400">No records</td></tr> :
                    attendance.map(rec => (
                      <tr key={rec._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4"><p className="font-semibold">{new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="text-[10px] text-gray-400">{new Date(rec.date).toLocaleDateString("en-IN", { weekday: "short" })}</p></td>
                        <td className="px-4 text-center">{rec.checkIn ? <span className="font-mono font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg text-[11px]">{new Date(rec.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span> : "--"}</td>
                        <td className="px-4 text-center">{rec.checkOut ? <span className="font-mono font-bold bg-[#111] text-white px-2 py-1 rounded-lg text-[11px]">{new Date(rec.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span> : "--"}</td>
                        <td className="px-4 text-center font-mono font-bold">{rec.workingHoursFormatted || "--"}</td>
                        <td className="px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.status === "Present" ? "bg-green-50 text-green-700" : rec.status === "Absent" ? "bg-red-50 text-red-600" : rec.status === "Half Day" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-600"}`}>{rec.status}</span>{rec.isManual && <span className="ml-1 text-[9px] bg-gray-100 px-1 rounded">M</span>}</td>
                        <td className="px-4 text-gray-500 max-w-[150px] truncate">{rec.remarks || "--"}</td>
                        <td className="px-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => handleEdit(rec)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"><HiOutlinePencil className="text-[12px]" /></button><button onClick={() => handleDelete(rec._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"><HiOutlineTrash className="text-[12px]" /></button></div></td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="p-3 border-t flex justify-between items-center text-[11px] text-gray-500">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-1.5">
              <button disabled={pagination.page <= 1} onClick={() => fetchHistory(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 flex items-center gap-1"><HiOutlineChevronLeft />Prev</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchHistory(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 flex items-center gap-1">Next<HiOutlineChevronRight /></button>
            </div>
          </div>
        )}
      </div>

      {editRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border">
            <div className="flex justify-between items-center px-6 py-4 border-b"><h3 className="text-[13px] font-bold">Edit Check-in/out - {new Date(editRecord.date).toLocaleDateString()}</h3><button onClick={() => setEditRecord(null)} className="p-2 hover:bg-gray-100 rounded-lg"><HiOutlineX /></button></div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold mb-1">Check In</label><input type="time" value={editForm.checkIn} onChange={e => setEditForm({ ...editForm, checkIn: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-[11px] font-semibold mb-1">Check Out</label><input type="time" value={editForm.checkOut} onChange={e => setEditForm({ ...editForm, checkOut: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className="block text-[11px] font-semibold mb-1">Status</label><select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></div>
              <div><label className="block text-[11px] font-semibold mb-1">Remarks</label><textarea rows={2} value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} className={inputCls + " resize-none"} /></div>
              <div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={() => setEditRecord(null)} className="px-4 py-2.5 text-[12px] border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button><button type="submit" disabled={editSaving} className="bg-[#111] hover:bg-black disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2">{editSaving && <RiLoader4Line className="animate-spin" />}Save</button></div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AttendanceHistory;
