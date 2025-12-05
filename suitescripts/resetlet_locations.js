/**
 * Example RESTlet (SuiteScript 2.1) that returns a list of Location records.
 * Deploy this as scriptId 'customscript_locations_restlet' (or numeric id) and deployment id.
 * The client expects a simple JSON array: [{ id: 1, name: 'Main Warehouse' }, ...]
 *
 * Replace search logic depending on your account's fields/filters.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], (search, log) => {
  function get(context) {
    try {
      const results = [];
      const locSearch = search.create({
        type: search.Type.LOCATION,
        columns: ['internalid', 'name']
      });

      locSearch.run().each((r) => {
        results.push({ id: r.getValue('internalid'), name: r.getValue('name') });
        return true;
      });

      return results;
    } catch (e) {
      log.error('locations error', e);
      return { error: e.message };
    }
  }

  return { get };
});
