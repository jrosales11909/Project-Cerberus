/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/crypto', 'N/runtime'], function(crypto, runtime) {

  function onRequest(context) {

    var account = "4662844".replace('_', '-');

    var consumerKey = runtime.getCurrentScript().getParameter('custscript_consumer_key');
    var consumerSecret = runtime.getCurrentScript().getParameter('custscript_consumer_secret');
    var tokenId = runtime.getCurrentScript().getParameter('custscript_token_id');
    var tokenSecret = runtime.getCurrentScript().getParameter('custscript_token_secret');

    var nonce = crypto.createGUID();
    var timestamp = Math.round(Date.now() / 1000);

    var baseString = "POST&" +
      encodeURIComponent("https://" + account + ".restlets.api.netsuite.com/app/site/hosting/restlet.nl") +
      "&" + encodeURIComponent(
        "deploy=1&" +
        "oauth_consumer_key=" + consumerKey + "&" +
        "oauth_nonce=" + nonce + "&" +
        "oauth_signature_method=HMAC-SHA256&" +
        "oauth_timestamp=" + timestamp + "&" +
        "oauth_token=" + tokenId + "&" +
        "oauth_version=1.0&" +
        "script=123"
      );

    var key = consumerSecret + "&" + tokenSecret;

    var signature = crypto.createHmac({
        algorithm: crypto.HashAlg.HMAC_SHA256,
        key: key
    })
    .update({ input: baseString })
    .digest({ outputEncoding: crypto.Encoding.BASE_64 });

    var header = 'OAuth ' +
      'oauth_consumer_key="' + consumerKey + '",' +
      'oauth_token="' + tokenId + '",' +
      'oauth_signature_method="HMAC-SHA256",' +
      'oauth_timestamp="' + timestamp + '",' +
      'oauth_nonce="' + nonce + '",' +
      'oauth_version="1.0",' +
      'oauth_signature="' + encodeURIComponent(signature) + '"';

    context.response.write(JSON.stringify({ header: header }));
  }

  return { onRequest: onRequest };
});
