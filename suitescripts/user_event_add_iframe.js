/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget','N/runtime','N/file','N/crypto/random'], (serverWidget, runtime, file, random) => {

  function beforeLoad(context) {
    const form = context.form;
    
    // Add print button
    form.addButton({
      id: 'custpage_print_cron_quote',
      label: 'Print',
      functionName: 'onMyButtonClick'
    });
    
    // Handle file creation for new records
    if (context.type === context.UserEventType.CREATE) {
      var newRecord = context.newRecord;
      const newUuid = random.generateUUID();
      try {
        // Create the file in the File Cabinet
        var fileContent = '[]'; // Initialize with empty array for lines
        var fileName = newUuid + '.json';
        var folderId = 3279112; // Replace with your folder ID

        var createdFile = file.create({
          name: fileName,
          fileType: file.Type.JSON,
          contents: fileContent,
          folder: folderId
        });

        var fileId = createdFile.save();

        // Attach the file to the record
        newRecord.setValue({
          fieldId: 'custrecord_hf_json_file',
          value: fileId
        });
      } catch (e) {
        log.error({
          title: 'Error creating and linking file',
          details: e
        });
      }
    }
    
    // Build the scriptlet URL
    const accountId = runtime.accountId;
    let scriptletUrl;
    
    if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT) {
      var recordId = context.newRecord.id;
      var mode = context.type;
      var fileId = context.newRecord.getValue('custrecord_hf_json_file');
      scriptletUrl = `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=4328&deploy=1&id=${recordId}&recordId=${recordId}&mode=${mode}&fileId=${fileId}`;
    } else {
      var fileId = context.newRecord.getValue('custrecord_hf_json_file');
      scriptletUrl = `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=4328&deploy=1&fileId=${fileId}`;
    }
    
    // Add inline HTML field for iframe at the TOP of the page (header level)
    const headerIframe = form.addField({
      id: 'custpage_my_app_iframe_header',
      type: serverWidget.FieldType.INLINEHTML,
      label: 'Line Items Editor'
    });
    
    // Place it ABOVE all other fields (header level, full width)
    headerIframe.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
    });
    
    headerIframe.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL
    });
    
    // Set iframe markup with 100% width for full-page display
    headerIframe.defaultValue = `
      <div style="width:100%; margin: 0; padding: 0;">
        <iframe 
          src="${scriptletUrl}" 
          style="width:100%; height:720px; border:1px solid #ddd; border-radius:4px;" 
          loading="lazy"
          frameborder="0">
        </iframe>
      </div>
    `;
  }

  return { beforeLoad };
});
