/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/render', 'N/record', 'N/file', 'N/log', 'N/search'], function(render, record, file, log, search) {
  
  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  function getEntityName(type, id) {
    if (!id) return '';
    try {
      var searchType = (type === 'customer') ? 'customer' :
                       (type === 'vendor') ? 'vendor' :
                       (type === 'subsidiary') ? 'subsidiary' :
                       (type === 'location') ? 'location' : null;
      if (!searchType) return '';
      
      var nameColumn = (type === 'customer' || type === 'vendor') ? 'altname' : 'name';
      
      var columns = [nameColumn];
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
        return entityId ? (entityId + ' ' + entityName) : entityName;
      }
    } catch (e) {
      log.error('Error getting entity name', e.toString());
    }
    return '';
  }
  
  function onRequest(context) {
    try {
      if (context.request.method === 'GET') {
        // Get record context from URL parameters (passed from button)
        var recordId = context.request.parameters.recid || context.request.parameters.id || context.request.parameters.recordId;
        var recordType = context.request.parameters.rectype || 'customrecord_hf_crone_quote';
        //var templateId = 'CUSTTMPL_188_4662844_230'; // Replace with your template script ID
        templateId = 'CUSTTMPL_189_4662844_306';
        
        if (!recordId) {
          context.response.write('Error: Missing record ID');
          return;
        }
        
        // Load the custom record
        var rec = record.load({
          type: recordType,
          id: recordId
        });
        
        // Parse JSON detail field to get lines
        var lines = [];
        var fields = {};
        try {
          var jsonVal = rec.getValue({ fieldId: 'custrecord_vendor_po_json_detail' });
          if (jsonVal && typeof jsonVal === 'string') {
            var parsed = JSON.parse(jsonVal);
            if (Array.isArray(parsed)) {
              lines = parsed;
            } else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.lines)) {
                lines = parsed.lines;
              }
              var sourceFields = (parsed.fields && typeof parsed.fields === 'object') ? parsed.fields : parsed;
              for (var key in sourceFields) {
                if (sourceFields.hasOwnProperty(key)) {
                  fields[key] = sourceFields[key];
                }
              }
            }
          }
        } catch (e) {
          log.error('Error parsing JSON detail', e.toString());
        }
        
        // Create renderer with template
        var renderer = render.create();
        renderer.setTemplateByScriptId(templateId);
        
        // Add the custom record as data source
        renderer.addRecord({
          templateName: 'record',
          record: rec
        });
        
        // Add custom data for lines and calculated fields
        var orderTotal = 0;
        var orderProfit = 0;
        
        // Calculate totals and prepare line data
        var formattedLines = [];
        for (var i = 0; i < lines.length; i++) {
          var ln = lines[i];
          var qty = parseFloat(ln.quantity) || 0;
          var rate = parseFloat(ln.rate) || 0;
          var cost = parseFloat(ln.cost) || 0;
          var lineTotal = qty * rate;
          var lineProfit = qty * (rate - cost);
          
          orderTotal += lineTotal;
          orderProfit += lineProfit;
          
          formattedLines.push({
            index: i + 1,
            vendorItem: escapeXml(ln.vendorItem || ''),
            commissionItem: escapeXml(ln.commissionItem || ''),
            notes: escapeXml(ln.notes || ''),
            quantity: qty,
            rate: rate.toFixed(2),
            mfgSellingPrice: ln.mfgSellingPrice || '',
            commAmount: ln.commAmount || '',
            cost: cost.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
            lineProfit: lineProfit.toFixed(2)
          });
        }
        
        // Get entity names with numbers
        var customerId = fields.custrecord_commission_customer || rec.getValue({ fieldId: 'custrecord_commission_customer' });
        var vendorId = fields.custrecord_vendor || rec.getValue({ fieldId: 'custrecord_vendor' });
        var locationId = fields.custrecord_location || rec.getValue({ fieldId: 'custrecord_location' });
        var branchId = fields.custrecord_branch || rec.getValue({ fieldId: 'custrecord_branch' });
        
        var customerName = escapeXml(customerId ? getEntityName('customer', customerId) : '');
        var vendorName = escapeXml(vendorId ? getEntityName('vendor', vendorId) : '');
        var locationName = escapeXml(locationId ? getEntityName('location', locationId) : '');
        var branchName = escapeXml(branchId ? getEntityName('subsidiary', branchId) : '');
        
        // Add custom search results or data as JSON
        renderer.addCustomDataSource({
          format: render.DataSource.OBJECT,
          alias: 'customData',
          data: {
            lines: formattedLines,
            orderTotal: orderTotal.toFixed(2),
            orderProfit: orderProfit.toFixed(2),
            headerNotes: escapeXml(fields.custrecord_notes || rec.getValue({ fieldId: 'custrecord_notes' }) || ''),
            commissionCustomer: customerName,
            vendor: vendorName,
            location: locationName,
            branch: branchName,
            shipToLocation: escapeXml(fields.custrecord_ship_to_location || rec.getValue({ fieldId: 'custrecord_ship_to_location' }) || '')
          }
        });
        
        // Render as PDF
        var pdfFile = renderer.renderAsPdf();
        pdfFile.name = 'Commission_Quote_' + recordId + '.pdf';
        
        // Stream PDF to browser for download
        context.response.writeFile({
          file: pdfFile,
          isInline: false // false = download prompt, true = display in browser
        });
        
      } else {
        context.response.write('Method not supported');
      }
      
    } catch (e) {
      log.error('Error generating PDF', e.toString());
      context.response.write('Error: ' + e.message);
    }
  }
  
  return {
    onRequest: onRequest
  };
});
