/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/url', 'N/file'], function(record, log, url, file) {

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
        var recordType = data && data.recordType ? data.recordType : 'customrecord_vendor_po';
        var fields = data && data.fields ? data.fields : {};
        var rawLines = Array.isArray(data && data.lines) ? data.lines : [];

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

        // Normalize and stringify lines content for file write
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

        var contentsStr = JSON.stringify(linesArr, null, 2);

        // Write or replace File Cabinet file
        var newFileId = null;
        var folderId = data && data.folderId ? data.folderId : null;
        var incomingFileId = data && data.fileId ? data.fileId : null;
        var defaultName = 'vendor_po_' + String(savedId) + '.json';

        if (incomingFileId) {
          try {
            var oldFile = file.load({ id: incomingFileId });
            var nameToUse = oldFile.name || defaultName;
            var folderToUse = (typeof oldFile.folder === 'number' && oldFile.folder > 0) ? oldFile.folder : folderId;
            log.debug('restlet:creating-replacement-file', { name: nameToUse, folder: folderToUse, contentLength: contentsStr.length });
            var created = file.create({ name: nameToUse, fileType: file.Type.JSON, contents: contentsStr, folder: folderToUse });
            newFileId = created.save();
            try { file.delete({ id: incomingFileId }); } catch (delErr) { log.debug('restlet:old-file-delete-failed', delErr); }
          } catch (e) {
            log.debug('restlet:replace-old-file-failed', e);
            var created2 = file.create({ name: defaultName, fileType: file.Type.JSON, contents: contentsStr, folder: folderId });
            newFileId = created2.save();
          }
        } else {
          var created3 = file.create({ name: defaultName, fileType: file.Type.JSON, contents: contentsStr, folder: folderId });
          newFileId = created3.save();
        }

        // Attach file id to record (numeric)
        var result = { success: true, savedRecordId: savedId, updatedRecordId: savedId, fileId: newFileId };
        try {
          if (newFileId) {
            var numericFileId = (typeof newFileId === 'string') ? parseInt(newFileId, 10) : newFileId;
            if (!isNaN(numericFileId)) {
              try {
                record.submitFields({ type: recordType, id: savedId, values: { custrecord_hf_json_file: numericFileId } });
                result.fileAttach = { success: true, fileId: numericFileId };
              } catch (attachErr) {
                log.debug('restlet:submitfields-attach-failed', attachErr);
                result.fileAttach = { success: false, error: attachErr && attachErr.message ? attachErr.message : String(attachErr) };
              }
            } else {
              result.fileAttach = { success: false, error: 'invalid_file_id', attempted: newFileId };
            }
          }
        } catch (e) { log.debug('restlet:attach-file-error', e); }

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
