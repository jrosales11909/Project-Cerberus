/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget','N/runtime'], (serverWidget, runtime) => {

  function beforeLoad(context) {
    // only when viewing/editing (adjust as needed)
    //if (context.type !== context.UserEventType.VIEW && context.type !== context.UserEventType.EDIT) return;
    
    const form = context.form;
    form.addButton({id: 'custpage_print_cron_quote',label: 'Print',functionName: 'onMyButtonClick'});
    // add a custom subtab
    var linetab = form.addTab({ id: 'custpage_my_app_tab', label: 'Line Items' });
     form.insertTab({ id: 'custpage_my_app_tab', label: 'Line Items',nexttab:'notes', tab: linetab });
    
    // add an Inline HTML field to the subtab
    const f = form.addField({
      id: 'custpage_my_app_iframe',
      type: serverWidget.FieldType.INLINEHTML,
      label: 'Embedded App',
      //container : 'custpage_my_empty_group',
      container: 'custpage_my_app_tab',
      //container : 'custom354'
    });

    // Build the URL to your scriptlet. Using runtime.accountId keeps it correct per account.
    // Replace script=4328&deploy=1 with your actual script/deploy params.
    const accountId = runtime.accountId; // e.g. 4662844
    let scriptletUrl 
    
    if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT){
    var recordId = context.newRecord.id;
      var mode = context.type;
    scriptletUrl = `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=4328&deploy=1&id=${recordId}&recordId=${recordId}&mode=${mode}`;
    }else{
    scriptletUrl = `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=4328&deploy=1`;
    }
    // Set iframe markup. Adjust height/width as needed.
    f.defaultValue = `<div style="padding:8px 0;"><iframe src="${scriptletUrl}" style="width:100%;height:720px;border:0;" loading="lazy"></iframe></div>`;
  }

  return { beforeLoad };
});