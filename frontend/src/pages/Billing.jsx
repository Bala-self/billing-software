/**
 * Billing Page - Optimized for Performance (Guide Implementation)
 *
 * Optimizations Applied:
 * 1. Component splitting - ProductSearch, Cart, Summary only re-render when needed
 * 2. Don't store huge data - search returns 8 products, not 1000s
 * 3. Debounce 250ms - don't call API on every keystroke
 * 4. Local cart calculations - instant, no API on qty change
 * 5. Prevent duplicate requests - button disabled when submitting
 * 6. Small API responses - select only needed fields
 * 7. Barcode fast lookup - uses indexed barcode field
 * 8. Loading states - small spinner, not whole page freeze
 * 9. Error handling - keep cart if API fails
 * 10. Keyboard shortcuts - only in Shortcuts modal (clean UI)
 * 11. Lazy loading - page loaded via React.lazy in App.jsx
 *
 * For 1 year MERN dev: simple, understandable, fast
 */

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlinePrinter,
  HiOutlineDocumentText,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";
import { HiOutlineCreditCard } from "react-icons/hi";
import { FiSave } from "react-icons/fi";
import { MdKeyboard } from "react-icons/md";

const fmt = (n) => (n ?? 0).toFixed(2);
const fmtN = (n) => (n ?? 0).toLocaleString("en-IN");

// --- Small Component: ProductSearch (only re-renders when search changes) ---
const ProductSearch = memo(
  ({
    search,
    setSearch,
    results,
    searching,
    selectedIdx,
    onSelect,
    onKeyDown,
    inputRef,
  }) => {
    return (
      <div className="relative">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search product (name / barcode)..."
          className="w-full pl-10 pr-10 py-3 text-[13px] rounded-xl bg-white border border-gray-200 outline-none focus:border-[#111]"
        />
        {searching && (
          <RiLoader4Line className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-[48px] z-30 bg-white rounded-xl shadow-xl border max-h-[320px] overflow-y-auto">
            {results.map((prod, idx) => (
              <button
                id={`search-row-${idx}`}
                key={prod._id}
                onClick={() => onSelect(prod)}
                className={`w-full text-left px-4 py-3 flex justify-between border-b last:border-0 ${idx === selectedIdx ? "bg-[#111] text-white" : "hover:bg-gray-50"}`}
              >
                <div>
                  <p
                    className={`text-[13px] font-semibold ${idx === selectedIdx ? "text-white" : "text-gray-900"}`}
                  >
                    {prod.name}
                  </p>
                  <p
                    className={`text-[11px] font-mono ${idx === selectedIdx ? "text-gray-300" : "text-gray-400"}`}
                  >
                    {prod.sku} · Stock {prod.stock}
                  </p>
                </div>
                <span className="text-[13px] font-bold">
                  ₹{fmt(prod.sellingPrice)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

// --- Small Component: Cart (only re-renders when cart changes) ---
const Cart = memo(
  ({ items, selectedIdx, onSelect, onUpdateQty, onRemove, containerRef }) => {
    if (items.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
          <HiOutlineDocumentText className="text-4xl mb-2 text-gray-200" />
          <p className="text-[13px]">No items added</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-gray-50">
        {items.map((item, idx) => (
          <div
            id={`cart-row-${idx}`}
            key={idx}
            onClick={() => onSelect(idx)}
            className={`grid grid-cols-[40px_1fr_110px_90px_90px_40px] gap-2 px-4 py-3 items-center text-[13px] cursor-pointer ${idx === selectedIdx ? "bg-[#111] text-white" : "hover:bg-gray-50"}`}
          >
            <div>{idx + 1}</div>
            <div>
              <div className="font-medium truncate">{item.product.name}</div>
            </div>
            <div className="flex justify-center">
              <div
                className={`flex items-center border rounded-lg overflow-hidden ${idx === selectedIdx ? "border-gray-600 bg-[#222]" : "border-gray-200 bg-white"}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateQty(idx, item.quantity - 1);
                  }}
                  className="w-7 h-7 flex items-center justify-center"
                >
                  <HiOutlineMinus className="text-[12px]" />
                </button>
                <span className="w-8 h-7 flex items-center justify-center text-[12px] font-semibold border-x">
                  {item.quantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateQty(idx, item.quantity + 1);
                  }}
                  className="w-7 h-7 flex items-center justify-center"
                >
                  <HiOutlinePlus className="text-[12px]" />
                </button>
              </div>
            </div>
            <div className="text-right">{fmt(item.unitPrice)}</div>
            <div className="text-right font-medium">{fmt(item.gross)}</div>
          </div>
        ))}
      </div>
    );
  },
);

// --- Small Component: Summary (only re-renders when totals change) ---
const Summary = memo(
  ({
    billNo,
    dateDisplay,
    timeDisplay,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    calc,
    discountPercent,
    setDiscountPercent,
    discountRef,
    onPay,
    submitting,
    isInterstate,
    paymentMethod,
    setPaymentMethod,
    isRegisteredCustomer,
  }) => {
    return (
      <div className="w-[340px] flex flex-col gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="space-y-3 text-[12px]">
            <div className="flex justify-between">
              <span className="text-gray-600">Bill No</span>
              <span className="font-mono font-bold">{billNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span>
                {dateDisplay} {timeDisplay}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="text-[11px] border rounded-lg px-2 py-1 max-w-[160px]"
              >
                <option value="WALK_IN">Walk-in Customer</option>
                {customers
                  .filter((c) => !c.name.toLowerCase().includes("walk-in"))
                  .slice(0, 20)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>GST Rate</span>
              <span className="font-semibold text-gray-700">From Settings</span>
            </div>
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-bold">{calc.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₹ {fmt(calc.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount</span>
                <div className="flex gap-1">
                  <input
                    ref={discountRef}
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-[60px] px-2 py-1 text-[11px] border rounded-lg text-right"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="bg-[#f9fafb] rounded-lg p-2.5 space-y-1">
                {isInterstate ? (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>IGST</span>
                    <span>₹ {fmt(calc.totalTax)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>CGST</span>
                      <span>₹ {fmt(calc.totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>SGST</span>
                      <span>₹ {fmt(calc.totalSgst)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-[11px] font-medium border-t pt-1">
                  <span>Tax</span>
                  <span>₹ {fmt(calc.totalTax)}</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="text-right">
                <span className="text-[26px] font-bold">
                  ₹ {fmtN(calc.grandTotal)}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t">
              <p className="text-gray-600 mb-2">Payment Type</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Cash",
                  "UPI",
                  "Card",
                  "Bank Transfer",
                  ...(isRegisteredCustomer ? ["Credit"] : []),
                ].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`border rounded-lg py-2 text-[11px] font-semibold ${paymentMethod === method ? "bg-[#111] text-white border-[#111]" : "bg-white text-gray-700"}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              {!isRegisteredCustomer && (
                <p className="text-[10px] text-amber-700 mt-2">
                  Unregistered customers must pay the full bill.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={onPay}
            disabled={submitting || calc.count === 0}
            className="w-full bg-[#111] text-white py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <HiOutlineCreditCard />
            )}
            Proceed to Payment
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-white border py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1">
              <HiOutlinePrinter />
              Print Bill
            </button>
            <button
              onClick={onPay}
              disabled={submitting || calc.count === 0}
              className="bg-white border py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1"
            >
              <FiSave />
              Save Bill
            </button>
          </div>
        </div>
      </div>
    );
  },
);

// --- Main Billing Component ---
const Billing = () => {
  const { business } = useAuth();
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const searchRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("WALK_IN");

  const [cartItems, setCartItems] = useState([]);
  const [selectedCartIdx, setSelectedCartIdx] = useState(-1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstRate, setGstRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState(null);
  const [billNo, setBillNo] = useState(
    () => `BILL-${String(Date.now()).slice(-6)}`,
  );

  const [showHistory, setShowHistory] = useState(false);
  const [billHistory, setBillHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bill_history") || "[]");
    } catch {
      return [];
    }
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const selectedCustomer = customers.find(
    (customer) => customer._id === selectedCustomerId,
  );
  const isInterstate = Boolean(
    business?.address?.state &&
    selectedCustomer?.billingAddress?.state &&
    business.address.state.toLowerCase() !==
      selectedCustomer.billingAddress.state.toLowerCase(),
  );
  const isRegisteredCustomer = Boolean(selectedCustomer?.isGstRegistered);

  const discountRef = useRef(null);
  const cartContainerRef = useRef(null);

  useEffect(() => {
    if (business?.settings?.defaultGstRate !== undefined) {
      setGstRate(Number(business.settings.defaultGstRate));
    }
  }, [business]);

  useEffect(() => {
    if (!isRegisteredCustomer && paymentMethod === "Credit") {
      setPaymentMethod("Cash");
    }
  }, [isRegisteredCustomer, paymentMethod]);

  // Load customers - cached, stable data
  useEffect(() => {
    // Simple cache: if we have customers in sessionStorage, use it
    const cached = sessionStorage.getItem("customers_cache");
    if (cached) {
      try {
        const cachedCustomers = JSON.parse(cached);
        if (Array.isArray(cachedCustomers) && cachedCustomers.length > 0) {
          setCustomers(cachedCustomers);
          return;
        }
      } catch {}
    }
    API.get("/customers", { params: { limit: 200 } })
      .then((res) => {
        const list = res.data?.data?.customers || [];
        setCustomers(list);
        sessionStorage.setItem("customers_cache", JSON.stringify(list)); // cache
      })
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const saved = localStorage.getItem("bill_history");
      setBillHistory(saved ? JSON.parse(saved) : []);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Debounced search - 250ms (guide: 250-400ms)
  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      setSelectedSearchIdx(0);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // Performance: limit 8, only needed fields (backend select)
        const res = await API.get("/products", {
          params: { search: productSearch.trim(), limit: 8 },
        });
        setSearchResults(res.data?.data?.products || []);
        setSelectedSearchIdx(0);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleAddToCart = useCallback(
    (product) => {
      if (product.stock <= 0) {
        setError(`${product.name} out of stock`);
        return;
      }
      setError("");
      setCartItems((prev) => {
        const idx = prev.findIndex((i) => i.product._id === product._id);
        if (idx > -1) {
          if (prev[idx].quantity + 1 > product.stock) {
            setError(`Only ${product.stock} available`);
            return prev;
          }
          const upd = [...prev];
          upd[idx] = { ...upd[idx], quantity: upd[idx].quantity + 1 };
          setSelectedCartIdx(idx);
          return upd;
        }
        setSelectedCartIdx(prev.length);
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.sellingPrice,
            taxRate: gstRate,
          },
        ];
      });
      setProductSearch("");
      setSearchResults([]);
      setTimeout(() => searchRef.current?.focus(), 50);
    },
    [gstRate],
  );

  const updateQty = useCallback(
    (index, newQty) => {
      const qty = Number(newQty);
      if (isNaN(qty) || qty < 1) return;
      if (qty > cartItems[index].product.stock) {
        setError(`Only ${cartItems[index].product.stock} available`);
        return;
      }
      setError("");
      setCartItems((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], quantity: qty };
        return copy;
      });
    },
    [cartItems],
  );

  const removeItem = useCallback(
    (index) => {
      setCartItems((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) setSelectedCartIdx(-1);
        else if (selectedCartIdx >= next.length)
          setSelectedCartIdx(next.length - 1);
        return next;
      });
    },
    [selectedCartIdx],
  );

  // Local cart calculation - instant, no API (guide: billing cart optimization)
  const calc = useMemo(() => {
    let subtotal = 0,
      totalCgst = 0,
      totalSgst = 0,
      totalIgst = 0;
    const items = cartItems.map((item) => {
      const gross = item.unitPrice * item.quantity;
      const rate = gstRate;
      const cgst = isInterstate ? 0 : (gross * rate) / 200;
      const sgst = isInterstate ? 0 : (gross * rate) / 200;
      const igst = isInterstate ? (gross * rate) / 100 : 0;
      subtotal += gross;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      return { ...item, gross, rate, taxRate: gstRate, igst };
    });
    const discountRate = Math.min(
      Math.max(Number(discountPercent) || 0, 0),
      100,
    );
    const discountAmt = (subtotal * discountRate) / 100;
    const afterDiscount = subtotal - discountAmt;
    const factor = subtotal > 0 ? afterDiscount / subtotal : 0;
    const finalCgst = totalCgst * factor;
    const finalSgst = totalSgst * factor;
    const finalIgst = totalIgst * factor;
    return {
      items,
      subtotal,
      discountAmt,
      totalCgst: finalCgst,
      totalSgst: finalSgst,
      totalTax: finalCgst + finalSgst + finalIgst,
      grandTotal: Math.round(afterDiscount + finalCgst + finalSgst + finalIgst),
      count: cartItems.length,
    };
  }, [cartItems, discountPercent, gstRate, isInterstate]);

  // Generate bill - prevent duplicate requests (guide: disable button)
  const handleGenerate = useCallback(async () => {
    if (cartItems.length === 0) {
      setError("Add product");
      return;
    }
    if (submitting) return; // prevent double click
    try {
      setSubmitting(true);
      setError("");

      let finalCustomerId = selectedCustomerId;
      if (selectedCustomerId === "WALK_IN") {
        let walkIn = customers.find((c) =>
          c.name.toLowerCase().includes("walk-in"),
        );
        if (!walkIn) {
          const r = await API.post("/customers", {
            name: "Walk-in Customer",
            phone: "0000000000",
            billingAddress: {
              street: "Counter",
              city: "Chennai",
              state: "Tamil Nadu",
              stateCode: "33",
            },
          });
          walkIn = r.data?.data;
          setCustomers((prev) => [...prev, walkIn]);
        }
        finalCustomerId = walkIn._id;
      }

      const discount = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
      const payload = {
        customerId: finalCustomerId,
        taxRate: gstRate,
        items: cartItems.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
          discount,
          discountType: "PERCENTAGE",
        })),
        paidAmount: paymentMethod === "Credit" ? 0 : calc.grandTotal,
        paymentMethod,
      };
      const res = await API.post("/invoices", payload);
      const invoice = res.data?.data;
      const billData = {
        _id: invoice?._id || Date.now().toString(),
        billNumber: invoice?.invoiceNumber || billNo,
        customerSnapshot: {
          name:
            customers.find((c) => c._id === finalCustomerId)?.name || "Walk-in",
        },
        items: cartItems.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
        })),
        grandTotal: invoice?.grandTotal ?? calc.grandTotal,
        billDate: invoice?.invoiceDate || new Date().toISOString(),
      };
      const updated = [billData, ...billHistory].slice(0, 50);
      setBillHistory(updated);
      localStorage.setItem("bill_history", JSON.stringify(updated));
      setInvoiceSuccess({ ...invoice, billNumber: billNo });

      setBillNo(`BILL-${String(Date.now()).slice(-6)}`);
      setCartItems([]);
      setSelectedCartIdx(-1);
      setDiscountPercent(0);
      setPaymentMethod("Cash");
    } catch (err) {
      // Keep cart if API fails (guide: error handling - never lose cart)
      setError(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    cartItems,
    selectedCustomerId,
    customers,
    calc,
    discountPercent,
    gstRate,
    paymentMethod,
    billNo,
    billHistory,
    submitting,
  ]);

  // Keyboard handling
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedSearchIdx((prev) =>
            Math.min(prev + 1, searchResults.length - 1),
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedSearchIdx((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (searchResults[selectedSearchIdx])
            handleAddToCart(searchResults[selectedSearchIdx]);
        } else if (e.key === "Escape") {
          setSearchResults([]);
          setProductSearch("");
        }
      }
    },
    [searchResults, selectedSearchIdx, handleAddToCart],
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      const isOtherInput =
        e.target.tagName === "INPUT" &&
        e.target !== searchRef.current &&
        e.target !== discountRef.current;
      if (isOtherInput && !(e.ctrlKey || e.metaKey)) return;

      if (e.key === "F1" || (e.key === "?" && !e.ctrlKey)) {
        e.preventDefault();
        setShowShortcuts((p) => !p);
        return;
      }
      if (e.key === "Escape") {
        if (showShortcuts) return setShowShortcuts(false);
        if (showHistory) return setShowHistory(false);
        if (invoiceSuccess) return setInvoiceSuccess(null);
        if (searchResults.length > 0) {
          setSearchResults([]);
          setProductSearch("");
          return;
        }
        if (selectedCartIdx !== -1) return setSelectedCartIdx(-1);
      }
      if (
        (e.key === "/" && e.target.tagName !== "INPUT") ||
        (e.ctrlKey && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "F2" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (!submitting && cartItems.length > 0) handleGenerate();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowHistory((p) => {
          const n = !p;
          if (n) fetchHistory();
          return n;
        });
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        if (cartItems.length > 0 && confirm("Clear all?")) {
          setCartItems([]);
          setSelectedCartIdx(-1);
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCartItems([]);
        setSelectedCartIdx(-1);
        setDiscountPercent(0);
        setBillNo(`BILL-${String(Date.now()).slice(-6)}`);
        searchRef.current?.focus();
        return;
      }

      if (cartItems.length > 0) {
        const isSearchFocused = document.activeElement === searchRef.current;
        const hasSel = selectedCartIdx !== -1;
        if (!isSearchFocused || hasSel) {
          if (e.key === "ArrowDown" && (searchResults.length === 0 || hasSel)) {
            e.preventDefault();
            setSelectedCartIdx((p) =>
              p === -1 ? 0 : Math.min(p + 1, cartItems.length - 1),
            );
          } else if (
            e.key === "ArrowUp" &&
            (searchResults.length === 0 || hasSel)
          ) {
            e.preventDefault();
            setSelectedCartIdx((p) => (p <= 0 ? 0 : p - 1));
          } else if (e.key === "ArrowRight" && hasSel) {
            e.preventDefault();
            updateQty(selectedCartIdx, cartItems[selectedCartIdx].quantity + 1);
          } else if (e.key === "ArrowLeft" && hasSel) {
            e.preventDefault();
            const nq = cartItems[selectedCartIdx].quantity - 1;
            if (nq >= 1) updateQty(selectedCartIdx, nq);
            else removeItem(selectedCartIdx);
          } else if (e.key === "Delete" && hasSel) {
            e.preventDefault();
            removeItem(selectedCartIdx);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    cartItems,
    selectedCartIdx,
    searchResults,
    selectedSearchIdx,
    showHistory,
    showShortcuts,
    invoiceSuccess,
    submitting,
    handleGenerate,
    updateQty,
    removeItem,
    fetchHistory,
  ]);

  useEffect(() => {
    if (selectedCartIdx !== -1)
      document
        .getElementById(`cart-row-${selectedCartIdx}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [selectedCartIdx]);
  useEffect(() => {
    document
      .getElementById(`search-row-${selectedSearchIdx}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedSearchIdx]);

  const now = new Date();
  const dateDisplay = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Layout noPadding>
      <div className="min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] flex flex-col bg-[#fafafa] overflow-auto lg:overflow-hidden">
        {error && (
          <div className="mx-4 sm:mx-6 mt-3 mb-3 bg-red-50 border border-red-200 text-red-600 text-[12px] px-4 py-2.5 rounded-lg flex items-center gap-2">
            <HiOutlineExclamation /> {error}
            <button onClick={() => setError("")} className="ml-auto">
              <HiOutlineX />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 px-4 sm:px-6 pt-3 pb-4 overflow-visible lg:overflow-hidden">
          <div className="min-w-0 min-h-0 flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h1 className="text-[22px] font-bold text-[#111]">Billing</h1>
                <p className="text-[12px] text-gray-500">
                  Scan barcode or search product
                </p>
              </div>
            </div>
            <ProductSearch
              search={productSearch}
              setSearch={setProductSearch}
              results={searchResults}
              searching={searching}
              selectedIdx={selectedSearchIdx}
              onSelect={handleAddToCart}
              onKeyDown={handleSearchKeyDown}
              inputRef={searchRef}
            />
            <div className="flex-1 min-h-[320px] flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_70px_75px_32px] lg:grid-cols-[40px_1fr_110px_90px_90px_40px] gap-2 px-2 sm:px-4 py-3 bg-[#f9fafb] border-b text-[10px] sm:text-[11px] font-semibold text-gray-600">
                <div>#</div>
                <div>Product</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Rate</div>
                <div className="text-right">Amount</div>
                <div></div>
              </div>
              <div
                ref={cartContainerRef}
                tabIndex={0}
                className="flex-1 overflow-y-auto"
              >
                <Cart
                  items={calc.items}
                  selectedIdx={selectedCartIdx}
                  onSelect={setSelectedCartIdx}
                  onUpdateQty={updateQty}
                  onRemove={removeItem}
                  containerRef={cartContainerRef}
                />
              </div>
              <div className="p-3 border-t flex gap-2 bg-white flex-wrap">
                <button
                  onClick={() => setCartItems([])}
                  className="px-4 py-2 rounded-lg border text-[12px] flex items-center gap-2"
                >
                  <HiOutlineTrash />
                  Clear All
                </button>
                <button
                  onClick={() => searchRef.current?.focus()}
                  className="px-4 py-2 rounded-lg border text-[12px] flex items-center gap-2"
                >
                  <HiOutlinePlus />
                  Add Product
                </button>
                <div className="ml-auto flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowShortcuts(true)}
                    className="px-3 py-2 rounded-lg border text-[12px] flex items-center gap-2"
                  >
                    <MdKeyboard />
                    Shortcuts
                  </button>
                  <button
                    onClick={() => {
                      setShowHistory(true);
                      fetchHistory();
                    }}
                    className="px-3 py-2 rounded-lg border text-[12px] flex items-center gap-2"
                  >
                    <HiOutlineClock />
                    Bill History ({billHistory.length})
                  </button>
                  <button
                    onClick={() => {
                      setShowHistory(true);
                      fetchHistory();
                    }}
                    className="px-4 py-2 rounded-lg bg-[#111] text-white text-[12px] flex items-center gap-2"
                  >
                    <HiOutlineEye />
                    View Bills
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 min-h-0 lg:overflow-y-auto">
            <Summary
              billNo={billNo}
              dateDisplay={dateDisplay}
              timeDisplay={timeDisplay}
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              calc={calc}
              discountPercent={discountPercent}
              setDiscountPercent={setDiscountPercent}
              discountRef={discountRef}
              onPay={handleGenerate}
              submitting={submitting}
              isInterstate={isInterstate}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              isRegisteredCustomer={isRegisteredCustomer}
            />
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-[13px] font-bold flex items-center gap-2">
                <HiOutlineClock /> Bill History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="py-20 text-center">
                  <RiLoader4Line className="animate-spin mx-auto" />
                  Loading...
                </div>
              ) : billHistory.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-[12px]">
                  No bills yet
                </div>
              ) : (
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-[#f9fafb] text-[9px] uppercase text-gray-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-4">Bill No</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {billHistory.map((b) => (
                      <tr key={b._id}>
                        <td className="py-3 px-4 font-mono font-bold">
                          {b.billNumber}
                        </td>
                        <td>{new Date(b.billDate).toLocaleDateString()}</td>
                        <td>{b.customerSnapshot?.name}</td>
                        <td className="text-right font-bold">
                          ₹{fmtN(b.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowHistory(false)}
                className="px-4 py-2 border rounded-xl text-[11px]"
              >
                Close
              </button>
              <Link
                to="/invoices"
                className="px-4 py-2 bg-[#111] text-white rounded-xl text-[11px]"
              >
                Go to Invoices
              </Link>
            </div>
          </div>
        </div>
      )}

      {invoiceSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <HiOutlineCheckCircle className="text-green-600 text-3xl" />
            </div>
            <div>
              <h3 className="font-bold">Bill Saved!</h3>
              <p className="text-[12px] text-gray-500">
                {invoiceSuccess.billNumber} • ₹{fmtN(invoiceSuccess.grandTotal)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInvoiceSuccess(null);
                  setBillNo(`BILL-${String(Date.now()).slice(-6)}`);
                  searchRef.current?.focus();
                }}
                className="flex-1 bg-[#111] text-white py-2.5 rounded-xl text-[11px] font-bold"
              >
                New Bill
              </button>
              <button
                onClick={() => {
                  setInvoiceSuccess(null);
                  setShowHistory(true);
                }}
                className="flex-1 border py-2.5 rounded-xl text-[11px]"
              >
                View Bills
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="text-[14px] font-bold flex items-center gap-2">
                <MdKeyboard className="text-[18px]" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX />
              </button>
            </div>
            <div className="p-6 space-y-5 text-[12px]">
              <div>
                <h4 className="font-bold text-[11px] uppercase text-gray-500 mb-2">
                  Search
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span>Focus search</span>
                    <span>
                      <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                        /
                      </kbd>{" "}
                      <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                        Ctrl+K
                      </kbd>
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Navigate</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      ↑ ↓
                    </kbd>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Add</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      Enter
                    </kbd>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[11px] uppercase text-gray-500 mb-2">
                  Cart
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span>Select</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      ↑ ↓
                    </kbd>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Qty</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      + -
                    </kbd>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Remove</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      Del
                    </kbd>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Clear</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      Ctrl+L
                    </kbd>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[11px] uppercase text-gray-500 mb-2">
                  Billing
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span>Pay</span>
                    <span>
                      <kbd className="px-2 py-1 bg-[#111] text-white rounded text-[10px]">
                        F2
                      </kbd>{" "}
                      <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                        Ctrl+Enter
                      </kbd>
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>New Bill</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      Ctrl+N
                    </kbd>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>History</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded text-[10px]">
                      Ctrl+H
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowShortcuts(false)}
                className="px-5 py-2.5 bg-[#111] text-white rounded-xl text-[12px] font-bold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Billing;
