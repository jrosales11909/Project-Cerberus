/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query', 'N/log'], function(query, log) {

  /**
   * GET handler to return subsidiaries (branches)
   * Query params supported:
   *  - query: partial name match
   *  - id: return a specific subsidiary object
   */
  function doGet(requestParams) {
    try {
      requestParams = requestParams || {};
      var searchQuery = (requestParams.query || '').toString().trim();
      var recordId = requestParams.id || '';

      log.debug('restlet_get_branches: params', { query: searchQuery, id: recordId });

      // If an id is provided, return the single custom branch record (no isinactive filter on customrecord)
      if (recordId) {
        var singleSql = "SELECT id, name FROM customrecord_cseg_hci_branch WHERE id = ?";
        var singleRs = query.runSuiteQL({ query: singleSql, params: [recordId] });
        var single = singleRs.asMappedResults();
        if (single && single.length > 0) return single[0];
        return { success: false, error: 'Not found' };
      }

      // Build base SQL for custom record (omit isinactive since customrecord may not have that column)
      var sql = "SELECT id, name FROM customrecord_cseg_hci_branch";
      var params = [];
      if (searchQuery) {
        sql += ' WHERE UPPER(name) LIKE ?';
        params.push('%' + searchQuery.toUpperCase() + '%');
      }
      // Return ordered results; client can limit if needed
      sql += ' ORDER BY name';

      log.debug('restlet_get_branches: sql', sql);

      var rs = params.length > 0 ? query.runSuiteQL({ query: sql, params: params }) : query.runSuiteQL({ query: sql });
      var results = rs.asMappedResults();

      // Ensure consistent response shape for frontend
      return results.map(function(r) {
        return { id: r.id, name: r.name };
      });
    } catch (e) {
      log.error('restlet_get_branches error', e.toString());
      return { success: false, error: e.toString(), message: e.message || 'Error fetching branches' };
    }
  }

  return {
    get: doGet
  };

});
