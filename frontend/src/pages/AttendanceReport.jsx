import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { HiOutlineCalendar, HiOutlineChartBar, HiOutlineDownload, HiOutlineSearch } from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

const AttendanceReport = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState("");
  const [report, setReport] = useState([]);
  const [overall, setOverall] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month, year, ...(department && { department }) };
      const res = await API.get("/attendance/report", { params });
      setReport(res.data?.data?.report || []);
      setOverall(res.data?.data?.overall || null);
    } catch { setReport([]); }
    finally { setLoading(false); }
  }, [month, year, department]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const filtered = report.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.employee.name.toLowerCase().includes(s) || item.employee.employeeId.toLowerCase().includes(s) || item.employee.department.toLowerCase().includes(s);
  });

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Employee ID", "Name", "Department", "Present", "Absent", "Half Day", "Leave", "Total Hours"];
    const rows = filtered.map(r => [r.employee.employeeId, r.employee.name, r.employee.department, r.summary.present, r.summary.absent, r.summary.halfDay, r.summary.leave, r.summary.totalWorkingHours]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-report-${month}-${year}.csv`; a.click();
  };

  const inputCls = "w-full px-3 py-2.5 text-[12px] rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition";

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-[#111] flex items-center gap-2"><HiOutlineChartBar className="text-[#111]" /> Attendance Reports</h1>
          <p className="text-[13px] text-gray-500 mt-1">{overall ? `${overall.monthName} ${overall.year} • ${overall.totalEmployees} employees • Check-in/out hours` : "Monthly report"}</p>
        </div>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="bg-[#111] hover:bg-black disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2"><HiOutlineDownload />Export CSV</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Month</label><select value={month} onChange={e => setMonth(Number(e.target.value))} className={inputCls}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>)}</select></div>
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Year</label><select value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Department</label><select value={department} onChange={e => setDepartment(e.target.value)} className={inputCls}><option value="">All</option>{["Sales", "Store", "Admin", "Accounts", "Inventory", "HR", "Management", "Other"].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Search</label><div className="relative"><HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Employee..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2.5 text-[12px] rounded-xl border border-gray-200 outline-none focus:border-gray-400" /></div></div>
      </div>

      {overall && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200"><p className="text-[10px] uppercase font-bold text-gray-400">Employees</p><p className="text-[20px] font-bold text-[#111] mt-1">{overall.totalEmployees}</p></div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200"><p className="text-[10px] uppercase font-bold text-green-700">Present</p><p className="text-[20px] font-bold text-green-700 mt-1">{overall.totalPresent}</p></div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200"><p className="text-[10px] uppercase font-bold text-red-600">Absent</p><p className="text-[20px] font-bold text-red-700 mt-1">{overall.totalAbsent}</p></div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200"><p className="text-[10px] uppercase font-bold text-amber-700">Half Day</p><p className="text-[20px] font-bold text-amber-800 mt-1">{overall.totalHalfDay}</p></div>
          <div className="bg-[#111] p-4 rounded-xl border border-gray-800"><p className="text-[10px] uppercase font-bold text-gray-400">Total Hours</p><p className="text-[20px] font-bold text-white mt-1">{Math.floor(overall.totalWorkingHours / 60)}h</p></div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2"><HiOutlineCalendar className="text-[#111]" /><h3 className="text-[13px] font-bold">Monthly Report - Check-in/out Summary</h3><span className="text-[11px] text-gray-400">• {filtered.length} employees</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b"><tr><th className="py-3 px-4">Employee</th><th className="px-4">Dept</th><th className="px-4 text-center">Present</th><th className="px-4 text-center">Absent</th><th className="px-4 text-center">Half</th><th className="px-4 text-center">Leave</th><th className="px-4 text-center">Hours</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="py-20 text-center text-gray-400"><RiLoader4Line className="animate-spin mx-auto text-xl mb-2" />Loading...</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={7} className="py-20 text-center text-gray-400">No data</td></tr> :
                  filtered.map(item => (
                    <tr key={item.employee._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4"><p className="font-bold text-[#111]">{item.employee.name}</p><p className="font-mono text-[11px] text-gray-500">{item.employee.employeeId} • {item.employee.designation}</p></td>
                      <td className="px-4"><span className="bg-gray-100 px-2 py-0.5 rounded-full text-[11px] font-semibold">{item.employee.department}</span></td>
                      <td className="px-4 text-center"><span className="bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-1 rounded-full text-[11px]">{item.summary.present}</span></td>
                      <td className="px-4 text-center"><span className="bg-red-50 text-red-700 border border-red-200 font-bold px-2 py-1 rounded-full text-[11px]">{item.summary.absent}</span></td>
                      <td className="px-4 text-center"><span className="bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-full text-[11px]">{item.summary.halfDay}</span></td>
                      <td className="px-4 text-center"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-full text-[11px]">{item.summary.leave}</span></td>
                      <td className="px-4 text-center"><span className="bg-[#111] text-white font-mono font-bold px-2 py-1 rounded-lg text-[11px]">{item.summary.totalWorkingHours}</span><div className="text-[10px] text-gray-400 mt-1">{item.summary.totalHoursDecimal}h</div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceReport;
