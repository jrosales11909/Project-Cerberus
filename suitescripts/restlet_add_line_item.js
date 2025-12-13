/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/url'], function(record, log, url) {

  /**
   * POST entrypoint
   * Expected payload shape (example):
   * {
   *   recordType: 'customrecord_mytype',        // optional, default required
   *   recordId: 123,                            // optional - when present, load & update
   *   fields: { custrecord_foo: 'value', ... }, // map of fieldId => value
   *   lines: [ { vendorItem: 'SKU', quantity: 2, rate: 12.5, ... }, ... ] // will be saved as JSON
   * }
   */
  async function post(data) {
      try {
        // Basic inputs
        var recordType = data && data.recordType ? data.recordType : 'customrecord_hf_crone_quote';
        var fields = data && data.fields ? data.fields : {};
        var rawLines = Array.isArray(data && data.lines) ? data.lines : [];

        // Normalize lines early so we can include them in the JSON detail field
        var linesArr = rawLines.map(function(ln) {
          try {
            return {
              itemId: ln.itemId != null && ln.itemId !== '' ? ln.itemId : null,
              vendorItem: ln.vendorItem != null && ln.vendorItem !== '' ? ln.vendorItem : null,
              commissionItem: ln.commissionItem != null && ln.commissionItem !== '' ? ln.commissionItem : null,
              notes: ln.notes != null && ln.notes !== '' ? ln.notes : null,
              quantity: (ln.quantity !== undefined && ln.quantity !== null && ln.quantity !== '') ? Number(ln.quantity) : null,
              rate: (ln.rate !== undefined && ln.rate !== null && ln.rate !== '') ? Number(ln.rate) : null,
              mfgSellingPrice: (ln.mfgSellingPrice !== undefined && ln.mfgSellingPrice !== null && ln.mfgSellingPrice !== '') ? Number(ln.mfgSellingPrice) : null,
              commAmount: (ln.commAmount !== undefined && ln.commAmount !== null && ln.commAmount !== '') ? Number(ln.commAmount) : null,
              cost: (ln.cost !== undefined && ln.cost !== null && ln.cost !== '') ? Number(ln.cost) : null,
              shipToLocation: ln.shipToLocation != null && ln.shipToLocation !== '' ? ln.shipToLocation : null
            };
          } catch (e) { return null; }
        }).filter(function(x) { return x !== null; });

        // Ensure billing/shipping addresses and sales team members are included in the JSON detail
        try {
          if (!fields.custrecord_vendor_po_json_detail) {
            var jsonFields = {
              custrecord_billing_address: fields.custrecord_billing_address || null,
              custrecord_shipping_address: fields.custrecord_shipping_address || null,
              custrecord_sales_team_members: null
            };
            try {
              if (fields.custrecord_sales_team_members) {
                if (typeof fields.custrecord_sales_team_members === 'string') {
                  jsonFields.custrecord_sales_team_members = JSON.parse(fields.custrecord_sales_team_members);
                } else {
                  jsonFields.custrecord_sales_team_members = fields.custrecord_sales_team_members;
                }
              }
            } catch (e) {
              // fall back to raw value
              jsonFields.custrecord_sales_team_members = fields.custrecord_sales_team_members || null;
            }

            fields.custrecord_vendor_po_json_detail = JSON.stringify({ fields: jsonFields, lines: linesArr });
          }
        } catch (e) { log.debug('restlet:build-json-detail-failed', e); }

        // Create record and apply provided fields where possible
        var newRec = record.create({ type: recordType, isDynamic: false });
        try {
          Object.keys(fields).forEach(function(f) {
            try {
              var val = fields[f];
              if (val !== null && typeof val === 'object') newRec.setValue({ fieldId: f, value: JSON.stringify(val) });
              else newRec.setValue({ fieldId: f, value: val });
            } catch (e) { log.debug('field-set-on-create-failed', { field: f, err: e && e.message ? e.message : String(e) }); }
          });
        } catch (e) { /* ignore */ }

        var savedId = null;
        try { savedId = newRec.save(); } catch (e) { log.error('record-create-save-failed', e); throw e; }

        // No File Cabinet write is performed; return saved record id.
        var result = { success: true, savedRecordId: savedId, updatedRecordId: savedId };

        // Resolve record URL
        try {
          var recordUrl = url.resolveRecord({ recordType: recordType, recordId: savedId, isEditMode: false });
          if (recordUrl) result.recordUrl = recordUrl;
        } catch (e) { log.debug('resolve-record-url-failed', e); }

        return result;
      } catch (err) {
        log.error('restlet-post-error', err);
        return { success: false, message: err && err.message ? err.message : String(err), stack: err && err.stack ? err.stack : null };
      }
    }

    return { post: post };
  });
