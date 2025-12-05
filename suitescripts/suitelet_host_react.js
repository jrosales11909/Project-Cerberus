/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file'], function(file) {

  function onRequest(context) {
    var html = file.load({
      id: 'SuiteScripts/react-app/index.html'
    });

    context.response.write(html.getContents());
  }

  return { onRequest: onRequest };
});
