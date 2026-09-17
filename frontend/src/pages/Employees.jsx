import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineUserGroup,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

const DEPARTMENTS = ["Sales", "Store", "Admin", "Accounts", "Inventory", "HR", "Management", "Other"];
const DESIGNATIONS = ["Sales Executive", "Store Manager", "Cashier", "Accountant", "Inventory Staff", "Admin", "Manager", "HR Executive", "Staff"];

const INITIAL_FORM = {
  employeeId: "",
  name: "",
  phone: "",
  email: "",
  department: "Sales",
  designation: "Staff",
  joiningDate: new Date().toISOString().split("T")[0],
  salary: "",
  status: "Active",
};

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(search && { search }), ...(statusFilter && { status: statusFilter }), ...(deptFilter && { department: deptFilter }) };
      const res = await API.get("/employees", { params });
      setEmployees(res.data?.data?.employees || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 20 });
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to load");
    } finally { setLoading(false); }
  }, [search, statusFilter, deptFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchEmployees(1), 300);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  const openCreate = () => {
    setModalMode("create"); setSelectedId(null); setFormData(INITIAL_FORM); setFormError(""); setIsModalOpen(true);
  };

  const openEdit = (emp) => {
    setModalMode("edit"); setSelectedId(emp._id);
    setFormData({
      employeeId: emp.employeeId || "",
      name: emp.name || "",
      phone: emp.phone || "",
      email: emp.email || "",
      department: emp.department || "Sales",
      designation: emp.designation || "Staff",
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      salary: emp.salary || "",
      status: emp.status || "Active",
    });
    setFormError(""); setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) { setFormError("Name required"); return; }
    if (!/^[0-9]{10}$/.test(formData.phone)) { setFormError("Phone 10 digits"); return; }
    const payload = { ...formData, salary: Number(formData.salary) || 0 };
    if (!payload.employeeId) delete payload.employeeId;
    if (!payload.email) delete payload.email;
    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/employees", payload);
        showToast("success", `${formData.name} created`);
      } else {
        await API.put(`/employees/${selectedId}`, payload);
        showToast("success", `${formData.name} updated`);
      }
      setIsModalOpen(false);
      fetchEmployees(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Deactivate ${emp.name} (${emp.employeeId})?`)) return;
    try {
      await API.delete(`/employees/${emp._id}`);
      showToast("success", `${emp.name} deactivated`);
      fetchEmployees(pagination.page);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed");
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-[12px] rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition";

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-[#111] flex items-center gap-2"><HiOutlineUserGroup className="text-[#111]" /> Employees</h1>
          <p className="text-[13px] text-gray-500 mt-1">{pagination.total} employees • Check-in/out enabled • Black theme</p>
        </div>
        <button onClick={openCreate} className="bg-[#111] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2"><HiOutlinePlus />Add Employee</button>
      </div>

      {toast && (
        <div className={`mb-4 flex items-center gap-2 text-[12px] px-4 py-3 rounded-xl border ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />} {toast.message}
          <button onClick={() => setToast(null)} className="ml-auto"><HiOutlineX /></button>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Search</label>
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Name, ID, phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2.5 text-[12px] rounded-xl border border-gray-200 outline-none focus:border-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}><option value="">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Department</label>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={inputCls}><option value="">All</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b">
              <tr><th className="py-3 px-4">ID</th><th className="px-4">Name</th><th className="px-4">Department</th><th className="px-4">Designation</th><th className="px-4">Phone</th><th className="px-4">Joining</th><th className="px-4 text-center">Status</th><th className="px-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={8} className="py-20 text-center text-gray-400"><RiLoader4Line className="animate-spin mx-auto text-xl mb-2" />Loading...</td></tr> :
                employees.length === 0 ? <tr><td colSpan={8} className="py-20 text-center text-gray-400">No employees</td></tr> :
                  employees.map(emp => (
                    <tr key={emp._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-bold text-[#111]">{emp.employeeId}</td>
                      <td className="py-3 px-4"><p className="font-semibold text-[#111]">{emp.name}</p><p className="text-[10px] text-gray-400">{emp.email || "No email"}</p></td>
                      <td className="px-4"><span className="bg-gray-100 px-2 py-0.5 rounded-full text-[11px] font-semibold">{emp.department}</span></td>
                      <td className="px-4"><span className="bg-[#111] text-white px-2 py-0.5 rounded-full text-[11px] font-semibold">{emp.designation}</span></td>
                      <td className="px-4 font-mono">{emp.phone}</td>
                      <td className="px-4 text-gray-500">{new Date(emp.joiningDate).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.status === "Active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>{emp.status}</span></td>
                      <td className="px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(emp)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"><HiOutlinePencil className="text-[12px]" /></button>
                          {emp.status === "Active" && <button onClick={() => handleDeactivate(emp)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"><HiOutlineTrash className="text-[12px]" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="p-3 border-t flex justify-between items-center text-[11px] text-gray-500">
            <span>Page {pagination.page} of {pagination.pages} • {pagination.total} employees</span>
            <div className="flex gap-1.5">
              <button disabled={pagination.page <= 1} onClick={() => fetchEmployees(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 flex items-center gap-1"><HiOutlineChevronLeft />Prev</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchEmployees(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 flex items-center gap-1">Next<HiOutlineChevronRight /></button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b"><h3 className="text-[13px] font-bold">{modalMode === "create" ? "Add Employee" : "Edit Employee"}</h3><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><HiOutlineX /></button></div>
            {formError && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-[11px] px-3 py-2 rounded-xl">{formError}</div>}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold mb-1">Employee ID (auto)</label><input type="text" placeholder="EMP001" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })} className={inputCls + " font-mono uppercase"} /></div>
                <div><label className="block text-[11px] font-semibold mb-1">Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={inputCls}><option>Active</option><option>Inactive</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold mb-1">Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-[11px] font-semibold mb-1">Phone *</label><input type="tel" required maxLength={10} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })} className={inputCls + " font-mono"} /></div>
              </div>
              <div><label className="block text-[11px] font-semibold mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold mb-1">Department *</label><select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className={inputCls}>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="block text-[11px] font-semibold mb-1">Designation *</label><select value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className={inputCls}>{DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold mb-1">Joining Date</label><input type="date" value={formData.joiningDate} onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-[11px] font-semibold mb-1">Salary</label><input type="number" min="0" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-[12px] border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button><button type="submit" disabled={saving} className="bg-[#111] hover:bg-black disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2">{saving && <RiLoader4Line className="animate-spin" />}{modalMode === "create" ? "Create" : "Update"}</button></div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Employees;
