/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/search'], function(record, log, search) {
  
  // Helper to get entity name by ID
  function getEntityName(type, id) {
    if (!id) return '';
    try {
      var searchType = type === 'customer' ? search.Type.CUSTOMER : 
                       type === 'vendor' ? search.Type.VENDOR : 
                       type === 'subsidiary' ? search.Type.SUBSIDIARY :
                       type === 'location' ? search.Type.LOCATION : null;
      if (!searchType) return '';
      
      // Define columns to search based on type
      var nameColumn = type === 'customer' ? 'companyname' :
                       type === 'vendor' ? 'altname' :
                       'name'; // For subsidiary and location
      
      var columns = [nameColumn];
      // entityid exists for customers and vendors, but not for subsidiary/location
      if (type === 'customer' || type === 'vendor') {
        columns.push('entityid');
      }
      
      var searchObj = search.create({
        type: searchType,
        filters: [['internalid', 'is', id]],
        columns: columns
      });
      
      var result = searchObj.run().getRange({ start: 0, end: 1 })[0];
      if (result) {
        var entityId = '';
        if (type === 'customer' || type === 'vendor') {
          entityId = result.getValue('entityid') || '';
        }
        var entityName = result.getValue(nameColumn) || '';
        // Return format: "CUST123 Customer Name" or just "Customer Name" if no entityid
        return entityId ? (entityId + ' ' + entityName) : entityName;
      }
    } catch (e) {
      log.error('Error getting entity name', e.toString());
    }
    return '';
  }
  
  function get(context) {
    try {
      var recordId = context.recordId || context.id || context.recid;
      var recordType = 'customrecord_hf_crone_quote';
      if (!recordId) return { success: false, message: 'Missing recordId' };

      var fields = {};
      var lines = [];

      var rec = null;
      try {
        rec = record.load({ type: recordType, id: recordId });
      } catch (e) {
        log.error('Error loading record', e.toString());
        return { success: false, message: 'Unable to load record ' + recordId };
      }

      // Prefer loading both fields and lines from JSON detail field
      try {
        var jsonVal = rec.getValue({ fieldId: 'custrecord_vendor_po_json_detail' });
        if (jsonVal && typeof jsonVal === 'string') {
          try {
            var parsed = JSON.parse(jsonVal);
            if (Array.isArray(parsed)) {
              // pure array means it's just the lines
              lines = parsed;
            } else if (parsed && typeof parsed === 'object') {
              // object may contain lines and fields; or fields directly at top-level
              if (Array.isArray(parsed.lines)) {
                lines = parsed.lines;
              }
              var sourceFields = (parsed.fields && typeof parsed.fields === 'object') ? parsed.fields : parsed;
              var allowedKeys = [
                'custrecord_notes',
                'custrecord_commission_customer',
                'custrecord_vendor',
                'custrecord_location',
                'custrecord_branch',
                'custrecord_ship_to_location',
                'custrecord_order_total',
                'custrecord_order_profit',
                'custrecord_parent_record_id'
              ];
              for (var i = 0; i < allowedKeys.length; i++) {
                var k = allowedKeys[i];
                if (Object.prototype.hasOwnProperty.call(sourceFields, k)) {
                  fields[k] = sourceFields[k];
                }
              }
            }
          } catch (parseErr) {
            log.error('JSON parse error for custrecord_vendor_po_json_detail', parseErr.toString());
          }
        }
        log.debug('Loaded from JSON field', { lines: lines.length, hasFields: Object.keys(fields).length });
      } catch (e) {
        log.error('Error reading custrecord_vendor_po_json_detail', e.toString());
      }
      // Look up display names for customer, vendor, location, branch
      if (fields.custrecord_commission_customer) {
        fields.custrecord_commission_customer_name = getEntityName('customer', fields.custrecord_commission_customer);
      }
      if (fields.custrecord_vendor) {
        fields.custrecord_vendor_name = getEntityName('vendor', fields.custrecord_vendor);
      }
      if (fields.custrecord_location) {
        fields.custrecord_location_name = getEntityName('location', fields.custrecord_location);
      }
      if (fields.custrecord_branch) {
        fields.custrecord_branch_name = getEntityName('subsidiary', fields.custrecord_branch);
      }
      
      return {
        success: true,
        recordId: recordId,
        fields: fields,
        lines: lines
      };
      
    } catch (e) {
      log.error('Error in get', e.toString());
      return { 
        success: false, 
        message: (e && e.message) ? e.message : String(e),
        error: e.toString()
      };
    }
  }

  return { get: get };
});
