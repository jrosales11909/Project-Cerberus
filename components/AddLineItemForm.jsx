import React, { useState, useEffect, useRef } from "react";
import "./AddLineItemForm.css";

  // Configure RESTlet script IDs/URLs here. Deploy the new RESTlet and set the script id below.
  const RESTLET_GET_BASE = '/app/site/hosting/restlet.nl?script=4334&deploy=1'; // <-- update script id after deployment

export default function AddLineItemForm() {
  const [authHeader, setAuthHeader] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Theme state: 'hatfield' (default) or 'legacy'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('aliTheme') || 'hatfield'; } catch { return 'hatfield'; }
  });

  useEffect(() => {
    try { localStorage.setItem('aliTheme', theme); } catch { /* ignore */ }
  }, [theme]);

  
  const [lines, setLines] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [shipToLocation, setShipToLocation] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageFields, setPageFields] = useState({});
  
  // Header fields
  const [headerNotes, setHeaderNotes] = useState("");
  const [commissionCustomer, setCommissionCustomer] = useState("");
  const [vendor, setVendor] = useState("");
  const [headerLocation, setHeaderLocation] = useState("");
  const [branch, setBranch] = useState("");
  
  // Dropdown data for header fields
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false); // fields posted from the parent page

  // Determine UI mode: prefer `mode` URL param, then `window.initialVendorPOMode`.
  // If mode is 'view' or 'edit' we hide editing controls (Add / Save).
  const paramsMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mode') : null;
  const mode = paramsMode || (typeof window !== 'undefined' ? window.initialVendorPOMode : null) || '';
  const isViewOnly = mode === 'view' || mode === 'edit';

  // Combined loading flag for a simple loader overlay/toast
  const isLoading = saving || loadingAuth || autoLoading || locationsLoading || customersLoading || vendorsLoading || branchesLoading;
  const loaderMessage = saving
    ? 'Saving changes...'
    : loadingAuth
    ? 'Loading authorization...'
    : autoLoading
    ? 'Auto-loading saved lines...'
    : locationsLoading
    ? 'Loading locations...'
    : 'Loading...';

    useEffect(() => {
      // Load auth header (your existing suitelet)
      fetch("/app/site/hosting/scriptlet.nl?script=4330&deploy=1", { credentials: 'same-origin' })
        .then((res) => res.json())
        .then((data) => setAuthHeader(data.header))
        .catch((err) => {
          console.error("Failed to load auth header:", err);
          setAuthHeader(null);
        })
        .finally(() => setLoadingAuth(false));

      // Load locations for ship-to select
      loadLocations();
      // Load customers, vendors, and branches for header dropdowns
      loadCustomers();
      loadVendors();
      loadBranches();
    }, []);

    // No parent handshake: iframe will POST directly to RESTlet.

    // loadLocations: fetch the same RESTlet used for locations. Call on mount and when per-line select is focused.
    const loadLocations = async (force = false) => {
      if (!force && locations.length > 0) return;
      try {
        setLocationsLoading(true);
        const headers = {};
        if (authHeader) headers['Authorization'] = authHeader;
        const res = await fetch('/app/site/hosting/restlet.nl?script=4332&deploy=1', {
          method: "GET",
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          credentials: 'same-origin',
        });
        const d = await res.json();
        console.log(d);
        if (Array.isArray(d)) setLocations(d);
        else if (Array.isArray(d.locations)) setLocations(d.locations);
      } catch (e) {
        console.debug('Could not load locations', e);
      } finally {
        setLocationsLoading(false);
      }
    };

    const loadCustomers = async (searchQuery = '', force = false) => {
      if (!force && !searchQuery && customers.length > 0) return;
      try {
        setCustomersLoading(true);
        const headers = {};
        if (authHeader) headers['Authorization'] = authHeader;
        let url = '/app/site/hosting/restlet.nl?script=4336&deploy=1&type=customer';
        if (searchQuery) url += `&query=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { 'Content-Type': 'application/json', ...headers },
          credentials: 'same-origin',
        });
        const d = await res.json();
        if (Array.isArray(d)) setCustomers(d);
        else if (Array.isArray(d.customers)) setCustomers(d.customers);
      } catch (e) {
        console.debug('Could not load customers', e);
      } finally {
        setCustomersLoading(false);
      }
    };

    const loadVendors = async (searchQuery = '', force = false) => {
      if (!force && !searchQuery && vendors.length > 0) return;
      try {
        setVendorsLoading(true);
        const headers = {};
        if (authHeader) headers['Authorization'] = authHeader;
        let url = '/app/site/hosting/restlet.nl?script=4336&deploy=1&type=vendor';
        if (searchQuery) url += `&query=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { 'Content-Type': 'application/json', ...headers },
          credentials: 'same-origin',
        });
        const d = await res.json();
        if (Array.isArray(d)) setVendors(d);
        else if (Array.isArray(d.vendors)) setVendors(d.vendors);
      } catch (e) {
        console.debug('Could not load vendors', e);
      } finally {
        setVendorsLoading(false);
      }
    };

    const loadBranches = async (force = false) => {
      if (!force && branches.length > 0) return;
      try {
        setBranchesLoading(true);
        const headers = {};
        if (authHeader) headers['Authorization'] = authHeader;
        const res = await fetch('/app/site/hosting/restlet.nl?script=4335&deploy=1&type=subsidiary', {
          method: "GET",
          headers: { 'Content-Type': 'application/json', ...headers },
          credentials: 'same-origin',
        });
        const d = await res.json();
        if (Array.isArray(d)) setBranches(d);
        else if (Array.isArray(d.subsidiaries)) setBranches(d.subsidiaries);
      } catch (e) {
        console.debug('Could not load branches', e);
      } finally {
        setBranchesLoading(false);
      }
    };

    const emptyLine = () => ({ id: Date.now().toString(), itemId: "", commissionItem: "", vendorItem: "", notes: "", quantity: 1, rate: "", mfgSellingPrice: "", commAmount: "", cost: "" });

    const tableWrapRef = useRef(null);
    const lastAddedLineRef = useRef(null);
    const customerDropdownRef = useRef(null);
    const vendorDropdownRef = useRef(null);

    const addBlankLine = () => {
      const nl = { ...emptyLine(), shipToLocation: shipToLocation || "" };
      lastAddedLineRef.current = nl.id;
      setLines((prev) => [...prev, nl]);
    };
    const updateLine = (id, field, value) => setLines((prev) => prev.map((ln) => (ln.id === id ? { ...ln, [field]: value } : ln)));
    const removeLine = (id) => setLines((prev) => prev.filter((ln) => ln.id !== id));

    // Close customer dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
          setCustomerDropdownOpen(false);
        }
        if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
          setVendorDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Ensure the table starts with one blank line on first mount
    useEffect(() => {
      if (lines.length === 0) addBlankLine();

      // Try to populate initial lines from several possible sources:
      // 1) `window.initialVendorPO` (object or JSON string)
      // 2) URL param `vendorPoJson` (encoded JSON)
      try {
        if (window && window.initialVendorPO) {
          populateFromJson(window.initialVendorPO);
        } else {
          const params = new URLSearchParams(window.location.search);
          const j = params.get('vendorPoJson');
          if (j) {
            try { populateFromJson(decodeURIComponent(j)); } catch (e) { populateFromJson(j); }
          }
        }
      } catch (e) { /* ignore */ }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Populate lines from an incoming JSON array/object
    const populateFromJson = (json) => {
      console.debug('populateFromJson called with:', json);
      if (!json) return;
      let arr = null;
      try {
        if (typeof json === 'string') arr = JSON.parse(json);
        else arr = json;
      } catch (e) {
        console.debug('invalid json for populate', e);
        return;
      }
      if (!Array.isArray(arr)) {
        console.debug('populateFromJson: arr is not an array', arr);
        return;
      }

      console.debug('Mapping', arr.length, 'lines...');
      const mapped = arr.map(it => ({
        id: it.id ? String(it.id) : Date.now().toString() + Math.random().toString(36).slice(2,6),
        itemId: it.itemId || it.item_id || it.item || '',
        commissionItem: it.commissionItem || it.commission_item || it.commission || '',
        vendorItem: it.vendorItem || it.vendor_item || it.vendor || '',
        notes: it.notes || it.note || '',
        quantity: it.quantity != null ? it.quantity : 1,
        rate: it.rate != null ? it.rate : '',
        mfgSellingPrice: it.mfgSellingPrice || it.mfg_selling_price || '',
        commAmount: it.commAmount || it.comm_amount || '',
        cost: it.cost != null ? it.cost : '',
        shipToLocation: it.shipToLocation || it.ship_to_location || ''
      }));

      console.debug('Mapped lines:', mapped);
      console.debug('Setting lines state with', mapped.length, 'items');
      setLines(mapped);
    };

    const filteredCustomers = customers.filter(c => {
      const search = customerSearch.toLowerCase();
      return c.name.toLowerCase().includes(search) || 
             (c.entitynumber && c.entitynumber.toString().includes(search));
    });

    const selectCustomer = (customerId) => {
      setCommissionCustomer(customerId);
      const selected = customers.find(c => c.id === customerId);
      setCustomerSearch(selected ? selected.entitynumber + ' ' + selected.name : "");
      setCustomerDropdownOpen(false);
    };

    const handleCustomerSearchChange = (value) => {
      setCustomerSearch(value);
      setCustomerDropdownOpen(true);
      if (!value) {
        setCommissionCustomer("");
        loadCustomers('', true); // Load all customers when cleared
      } else {
        // Trigger search with the typed value
        loadCustomers(value, true);
      }
    };

    const filteredVendors = vendors.filter(v => {
      const search = vendorSearch.toLowerCase();
      return v.name.toLowerCase().includes(search) || 
             (v.entitynumber && v.entitynumber.toString().includes(search));
    });

    const selectVendor = (vendorId) => {
      setVendor(vendorId);
      const selected = vendors.find(v => v.id === vendorId);
      setVendorSearch(selected ? selected.entitynumber + ' ' + selected.name : "");
      setVendorDropdownOpen(false);
    };

    const handleVendorSearchChange = (value) => {
      setVendorSearch(value);
      setVendorDropdownOpen(true);
      if (!value) {
        setVendor("");
        loadVendors('', true); // Load all vendors when cleared
      } else {
        // Trigger search with the typed value
        loadVendors(value, true);
      }
    };

    const lineTotal = (ln) => {
      const q = parseFloat(ln.quantity) || 0;
      const r = parseFloat(ln.rate) || 0;
      return q * r;
    };
    const lineProfit = (ln) => {
      const q = parseFloat(ln.quantity) || 0;
      const r = parseFloat(ln.rate) || 0;
      const c = parseFloat(ln.cost) || 0;
      return q * (r - c);
    };

    const orderTotal = lines.reduce((acc, ln) => acc + lineTotal(ln), 0);
    const orderProfit = lines.reduce((acc, ln) => acc + lineProfit(ln), 0);

    const validate = (lns = lines) => {
      if (!lns || lns.length === 0) return { ok: false, message: "Add at least one line item." };
      for (const ln of lns) {
        if (!(ln.itemId || ln.vendorItem)) return { ok: false, message: "All lines require an Item ID or Vendor Item." };
        if (!ln.quantity || isNaN(Number(ln.quantity)) || Number(ln.quantity) <= 0) return { ok: false, message: "Quantities must be numbers greater than 0." };
        if (ln.rate === "" || isNaN(Number(ln.rate))) return { ok: false, message: "All lines require a numeric rate." };
      }
      return { ok: true };
    };

    const isEmptyLine = (ln) => {
      if (!ln) return true;
      const hasText = (v) => typeof v === 'string' && v.trim() !== '';
      return !(
        ln.itemId ||
        ln.vendorItem ||
        ln.commissionItem ||
        hasText(ln.notes) ||
        (ln.rate !== "" && ln.rate != null) ||
        (ln.cost !== "" && ln.cost != null) ||
        (ln.mfgSellingPrice !== "" && ln.mfgSellingPrice != null) ||
        (ln.commAmount !== "" && ln.commAmount != null)
      );
    };

    // Scroll the newly added row into view when lines change and focus its first control
    useEffect(() => {
      const id = lastAddedLineRef.current;
      if (!id) return;
      // allow DOM to update first
      requestAnimationFrame(() => {
        try {
          const wrap = tableWrapRef.current;
          if (!wrap) { lastAddedLineRef.current = null; return; }
          const row = wrap.querySelector(`tr[data-lineid="${id}"]`);
          if (!row) { lastAddedLineRef.current = null; return; }

          // Compute desired scroll so the row is visible and ideally centered in the wrapper
          const wrapRect = wrap.getBoundingClientRect();
          const rowRect = row.getBoundingClientRect();
          const offset = rowRect.top - wrapRect.top; // row position inside wrapper
          const desiredTop = Math.max(0, offset - (wrap.clientHeight / 2) + (row.clientHeight / 2));

          // Smoothly scroll the wrapper to the desired position
          if (typeof wrap.scrollTo === 'function') {
            wrap.scrollTo({ top: desiredTop + wrap.scrollTop, behavior: 'smooth' });
          } else {
            wrap.scrollTop = desiredTop;
          }

          // Focus the first focusable control in the new row (select/input/textarea)
          const control = row.querySelector('select, input, textarea');
          if (control && typeof control.focus === 'function') {
            control.focus({ preventScroll: true });
            // If it's an input, select its contents so typing replaces it
            if (control.tagName === 'INPUT') try { control.select(); } catch (e) { /* ignore */ }
          }

          lastAddedLineRef.current = null;
        } catch (e) {
          // ignore errors
          lastAddedLineRef.current = null;
        }
      });
    }, [lines]);

    // Auto-load saved JSON from the backend if a record id is available
    useEffect(() => {
      // wait for auth header to be loaded
      if (loadingAuth) return;
      // if the parent already provided initial JSON, skip
      if (window && window.initialVendorPO) return;

      const params = new URLSearchParams(window.location.search);
      // Prefer `id` URL param first (common for NetSuite record view/edit URLs)
      const recordId = params.get('id') || window.initialVendorPORecordId || params.get('recordId') || params.get('recid');
      const recordType = window.initialVendorPORecordType || params.get('recordType') || null;
      const fileId = window.initialVendorPOFileId || params.get('fileId') || null;
      if (!recordId) return;

      const fetchSaved = async () => {
        setAutoLoading(true);
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (authHeader) headers['Authorization'] = authHeader;
          // send both `id` (what you're passing in the iframe URL) and `recordId` for compatibility
          let url = `${RESTLET_GET_BASE}&id=${encodeURIComponent(recordId)}&recordId=${encodeURIComponent(recordId)}&fileId=${encodeURIComponent(fileId)}`;
          if (recordType) url += `&recordType=${encodeURIComponent(recordType)}`;
          const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...headers },
          credentials: 'same-origin',
        });
          const d = await res.json();
          console.debug('Fetched saved vendor PO JSON', d);
          
          // Load header fields from response
          if (d.fields || d.record) {
            const fields = d.fields || d.record || {};
            console.debug('Loading header fields:', fields);
            
            if (fields.custrecord_notes) setHeaderNotes(fields.custrecord_notes);
            
            if (fields.custrecord_commission_customer) {
              const custId = String(fields.custrecord_commission_customer);
              setCommissionCustomer(custId);
              // Use the name returned from RESTlet
              if (fields.custrecord_commission_customer_name) {
                setCustomerSearch(fields.custrecord_commission_customer_name);
                console.debug('Set customer:', custId, fields.custrecord_commission_customer_name);
              }
            }
            
            if (fields.custrecord_vendor) {
              const vendId = String(fields.custrecord_vendor);
              setVendor(vendId);
              // Use the name returned from RESTlet
              if (fields.custrecord_vendor_name) {
                setVendorSearch(fields.custrecord_vendor_name);
                console.debug('Set vendor:', vendId, fields.custrecord_vendor_name);
              }
            }
            
            if (fields.custrecord_location) setHeaderLocation(String(fields.custrecord_location));
            if (fields.custrecord_branch) setBranch(String(fields.custrecord_branch));
            if (fields.custrecord_ship_to_location) setShipToLocation(String(fields.custrecord_ship_to_location));
          }
          
          // Load line items from response
          let json = null;
          console.debug('Checking for lines in response...');
          console.debug('d.lines:', d.lines);
          console.debug('d is array?', Array.isArray(d));
          
          if (Array.isArray(d)) {
            json = d;
            console.debug('Lines from direct array:', json);
          } else if (Array.isArray(d.lines)) {
            json = d.lines;
            console.debug('Lines from d.lines:', json);
          } else if (d.custrecord_vendor_po_json_detail) {
            const val = d.custrecord_vendor_po_json_detail;
            if (typeof val === 'string') {
              try { json = JSON.parse(val); } catch (e) { json = null; }
            } else if (Array.isArray(val)) json = val;
            console.debug('Lines from custrecord_vendor_po_json_detail:', json);
          } else if (d.success && Array.isArray(d.lines)) {
            json = d.lines;
            console.debug('Lines from d.success && d.lines:', json);
          }

          console.debug('Final json to populate:', json);
          if (Array.isArray(json) && json.length > 0) {
            console.debug('Calling populateFromJson with', json.length, 'lines');
            populateFromJson(json);
          } else {
            console.debug('No lines to populate - json is not an array or is empty');
          }
        } catch (e) {
          console.debug('Could not auto-load saved vendor PO JSON', e);
        } finally {
          setAutoLoading(false);
        }
      };

      fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingAuth, authHeader]);

    const saveToSalesOrder = async () => {
      if (!authHeader) { alert("Missing auth header."); return; }
      // Remove empty lines before validating/sending
      const cleaned = lines.filter(ln => !isEmptyLine(ln));
      if (cleaned.length !== lines.length) setLines(cleaned);

      const v = validate(cleaned);
      if (!v.ok) { alert("Validation: " + v.message); return; }

      const params = new URLSearchParams(window.location.search);
      const paramRecordId = params.get('id') || params.get('recordId') || params.get('recid') || null;
      let recordIdToUse = null;
      if (pageFields && pageFields.recordId) recordIdToUse = String(pageFields.recordId);
      else if (window.initialVendorPORecordId) recordIdToUse = String(window.initialVendorPORecordId);
      else if (paramRecordId) recordIdToUse = String(paramRecordId);

      const _params = params;
      const iframeFileId = _params.get('fileId') || window.initialVendorPOFileId || null;

      const payload = {
        recordId: recordIdToUse || undefined,
        fileId: iframeFileId || undefined,
        fields: {
          ...pageFields,
          // Persist the parent record id to the custom record so the link is stored server-side.
          // Replace `custrecord_parent_record_id` with your actual custom field id if different.
          custrecord_parent_record_id: recordIdToUse || null,
          custrecord_ship_to_location: shipToLocation || null,
          custrecord_order_total: Number.isFinite(orderTotal) ? orderTotal : null,
          custrecord_order_profit: Number.isFinite(orderProfit) ? orderProfit : null,
          // Header fields
          custrecord_notes: headerNotes || null,
          custrecord_commission_customer: commissionCustomer || null,
          custrecord_vendor: vendor || null,
          custrecord_location: headerLocation || null,
          custrecord_branch: branch || null,
        },
        lines: cleaned.map((ln) => ({
          itemId: ln.itemId || ln.commissionItem || null,
          vendorItem: ln.vendorItem || null,
          commissionItem: ln.commissionItem || null,
          notes: ln.notes || null,
          quantity: ln.quantity === "" ? null : Number(ln.quantity),
          rate: ln.rate === "" ? null : Number(ln.rate),
          mfgSellingPrice: ln.mfgSellingPrice === "" ? null : Number(ln.mfgSellingPrice),
          commAmount: ln.commAmount === "" ? null : Number(ln.commAmount),
          cost: ln.cost === "" ? null : Number(ln.cost),
          shipToLocation: ln.shipToLocation || null,
        })),
      };
      // Debug: show the final record id we will send to the RESTlet

      setSaving(true);
      try {
        const response = await fetch("/app/site/hosting/restlet.nl?script=4329&deploy=1", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.success) {
          // Ensure iframe knows the saved custom-record id so future saves/use can reference it
          const newSavedId = data.updatedRecordId || data.savedRecordId || null;
          if (newSavedId) {
            try { window.initialVendorPORecordId = String(newSavedId); } catch (e) { /* ignore */ }
            setPageFields((pf) => ({ ...pf, custrecord_parent_record_id: String(newSavedId) }));
            console.debug('AddLineItemForm: recorded saved custom record id', newSavedId);
          }
          // If the RESTlet returned a recordUrl, redirect the parent/top window to it.
          if (data.recordUrl) {
            try {
              // If we're embedded in an iframe, navigate the top window; otherwise navigate current window
              if (window.top && window.top !== window) window.top.location.href = data.recordUrl;
              else window.location.href = data.recordUrl;
              return;
            } catch (e) {
              // fall through to reload attempt below
            }
          }

          // No recordUrl provided (or navigation failed). Force a top-level reload so the parent reflects saved changes.
          try {
            if (window.top && window.top !== window && typeof window.top.location.reload === 'function') {
              window.top.location.reload();
            } else {
              window.location.reload();
            }
            return;
          } catch (e) {
            // If reload is blocked (cross-origin), fallback to showing a simple alert so user can manually refresh
            try { alert("Updated Quote: " + (data.updatedRecordId || data.savedRecordId || '')); } catch (e2) { /* ignore */ }
            setLines([]);
            return;
          }
        } else { alert("ERROR: " + (data.message || JSON.stringify(data))); }
      } catch (err) { console.error(err); alert("Network error: " + err.message); }
      finally { setSaving(false); }
    };

    // Parent messaging removed. iframe saves directly via `saveToSalesOrder`.

    return (
      <div className={`ali-containerv2 ${theme === 'legacy' ? 'ali-theme-legacy' : ''}`}>
        {/* Loader overlay: covers the iframe while important data is loading */}
        {isLoading && (
          <div className="ali-overlay">
            <div className="ali-loader">
              <svg viewBox="0 0 50 50" style={{ width: 48, height: 48, marginBottom: 12 }}>
                <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="90" strokeDashoffset="60">
                  <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{loaderMessage}</div>
            </div>
          </div>
        )}
        <div className="ali-card">
          <div className="ali-header">
            <h3 className="ali-title">Commission Header Information</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="ali-sub">Theme:</span>
              <button
                type="button"
                className="ali-btn ali-btn-ghost"
                onClick={() => setTheme(prev => prev === 'legacy' ? 'hatfield' : 'legacy')}
                title={theme === 'legacy' ? 'Switch to Hatfield theme' : 'Switch to Legacy theme'}
              >
                {theme === 'legacy' ? 'Legacy' : 'Hatfield'}
              </button>
            </div>
          </div>

          {/* Header fields section */}
          <div className="ali-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="ali-autocomplete" ref={customerDropdownRef}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Commission Customer</label>
              <input
                type="text"
                className="ali-input"
                value={customerSearch}
                onChange={(e) => handleCustomerSearchChange(e.target.value)}
                onFocus={() => setCustomerDropdownOpen(true)}
                placeholder="Search customer..."
                disabled={saving}
                autoComplete="off"
              />
              {customerDropdownOpen && filteredCustomers.length > 0 && (
                <div className="ali-suggestions">
                  {filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => selectCustomer(c.id)}
                      className={`ali-suggestion ${commissionCustomer === c.id ? 'active' : ''}`}
                    >
                      {c.entitynumber + ' ' + c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ali-autocomplete" ref={vendorDropdownRef}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Vendor</label>
              <input
                type="text"
                className="ali-input"
                value={vendorSearch}
                onChange={(e) => handleVendorSearchChange(e.target.value)}
                onFocus={() => setVendorDropdownOpen(true)}
                placeholder="Search vendor..."
                disabled={saving}
                autoComplete="off"
              />
              {vendorDropdownOpen && filteredVendors.length > 0 && (
                <div className="ali-suggestions">
                  {filteredVendors.map(v => (
                    <div
                      key={v.id}
                      onClick={() => selectVendor(v.id)}
                      className={`ali-suggestion ${vendor === v.id ? 'active' : ''}`}
                    >
                      {v.entitynumber + ' ' + v.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Location</label>
              <select 
                className="ali-input" 
                value={headerLocation} 
                onChange={(e) => setHeaderLocation(e.target.value)}
                disabled={saving}
              >
                <option className="ali-input-select" value="">Select Location...</option>
                {locations.map(loc => (
                  <option className="ali-input-select" key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Branch</label>
              <select 
                className="ali-input" 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)}
                disabled={saving}
              >
                <option className="ali-input-select" value="">Select Branch...</option>
                {branches.map(b => (
                  <option className="ali-input-select" key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Notes</label>
              <textarea
                className="ali-input"
                value={headerNotes}
                onChange={(e) => setHeaderNotes(e.target.value)}
                placeholder="Enter notes..."
                rows={3}
                disabled={saving}
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>
          </div>
           <div className="ali-header">
            <h3 className="ali-title">Add / Edit Line Items</h3> 
            <div className="ali-sub">Create lines locally, then persist to the Quote</div>
          </div>
          <div className="ali-controls">
            {/* Quote ID removed per request */}

            {autoLoading && (
              <div className="ali-sub" style={{ marginLeft: 12, alignSelf: 'center' }}>Auto-loading saved lines…</div>
            )}
            {/* <div className="ali-actions">
              <button className="ali-btn ali-btn-ghost" onClick={addBlankLine}>+ Add New Line</button>
            </div> */}
          </div>

          <div className="ali-table-wrap" ref={tableWrapRef}>
            <table className="ali-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th style={{ textAlign: "center" }}>Commission / Vendor Item</th>
                  <th style={{ textAlign: "center" }}>Notes</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "center" }}>Rate</th>
                  <th style={{ textAlign: "center" }}>Mfg Selling Price</th>
                  <th style={{ textAlign: "center" }}>Comm Amount</th>
                  <th style={{ textAlign: "center" }}>Cost</th>
                  <th>Ship To</th>
                  <th style={{ textAlign: "right" }}>Line Total</th>
                  <th> </th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr><td colSpan={11} className="ali-empty">No lines. Click "Add New Line" to start.</td></tr>
                )}
                {lines.map((ln, idx) => (
                  <tr key={ln.id } data-lineid={ln.id}>
                    <td className="ali-idx">{idx + 1}</td>
                    <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select className="ali-input" style={{ flex: 1, minWidth: 200 }} value={ln.commissionItem || ''} onChange={(e) => updateLine(ln.id, 'commissionItem', e.target.value)}>
                        <option className="ali-input-select" value="30774">Commission Revenue</option>
                      </select>
                      <input
                        className="ali-input"
                        name="VendorItem"
                        value={ln.vendorItem || ''}
                        placeholder="Vendor Item"
                        onChange={(e) => updateLine(ln.id, 'vendorItem', e.target.value)}
                        style={{ width: 220 }}
                      />
                    </td>
                    <td>
                      <textarea
                        className="ali-input"
                        value={ln.notes} // Bind value to state
                        onChange={(e) => updateLine(ln.id, 'notes', e.target.value)} // Update state on change
                        rows={5} // Default height
                        cols={40} // Default width
                        placeholder="Notes"
                        style={{ resize: "vertical", padding: "8px" }}
                    />
                    </td>
                    <td>
                      <input className="ali-input ali-numeric" value={ln.quantity} onChange={(e) => updateLine(ln.id, 'quantity', e.target.value)} />
                    </td>
                    <td>
                      <input className="ali-input ali-numeric" value={ln.rate} placeholder="Rate" onChange={(e) => updateLine(ln.id, 'rate', e.target.value)} />
                    </td>
                    <td>
                      <input className="ali-input ali-numeric" value={ln.mfgSellingPrice || ''} placeholder="Mfg Selling Price" onChange={(e) => updateLine(ln.id, 'mfgSellingPrice', e.target.value)} />
                    </td>
                    <td>
                      <input className="ali-input ali-numeric" value={ln.commAmount || ''} placeholder="Comm Amount" onChange={(e) => updateLine(ln.id, 'commAmount', e.target.value)} />
                    </td>
                    <td>
                      <input className="ali-input ali-numeric" value={ln.cost} placeholder="Cost" onChange={(e) => updateLine(ln.id, 'cost', e.target.value)} />
                    </td>
                    <td>
                      <select className="ali-input" value={ln.shipToLocation || ""} onChange={(e) => updateLine(ln.id, 'shipToLocation', e.target.value)}>
                        <option className="ali-input-select" value="">Please Select Location.</option>
                        {locations.map(loc => (
                          <option className="ali-input-select" key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="ali-total">{lineTotal(ln).toFixed(2)}</td>
                    <td>
                      <button className="ali-btn ali-btn-danger" onClick={() => removeLine(ln.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
                {/* Add-new-line row attached to bottom of lines (hidden in view/edit mode) */}
                {!isViewOnly && (
                  <tr className="ali-add-row">
                    <td colSpan={11} style={{ textAlign: 'center', padding: '12px 0' }}>
                      <button className="ali-btn ali-btn-ghost" onClick={addBlankLine} disabled={saving}>+ Add New Line</button>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="ali-foot-label">Order Total:</td>
                  <td className="ali-foot-total">{orderTotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {/* <div className="ali-actions">
                <button className="ali-btn ali-btn-ghost" onClick={addBlankLine}>+ Add New Line</button>
                 </div> */}
          </div>
          
          <div className="ali-footer">
            <div className="ali-sub" style={{ flex: 1, alignSelf: 'center' }}>Profit: {orderProfit.toFixed(2)}</div>
            {!isViewOnly && (
              <button className="ali-btn ali-btn-primary" disabled={saving || loadingAuth || !authHeader} onClick={saveToSalesOrder}>{saving ? "Saving..." : loadingAuth ? "Loading Auth..." : authHeader ? "Save to Quote" : "Missing Auth"}</button>
            )}
          </div>
        </div>
      </div>
    );
  }
