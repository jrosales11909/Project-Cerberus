/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query', 'N/log'], function(query, log) {
    
    /**
     * GET handler for searching customers, vendors, or subsidiaries
     * Query params:
     *   - type: 'customer', 'vendor', or 'subsidiary'
     *   - query: optional search string to filter by name (partial match)
     *   - id: optional specific record ID to fetch details (includes sales rep for customers)
     * 
     * Returns array of { id, name } objects, or single object if id is provided
     */
    function doGet(requestParams) {
        try {
            const type = requestParams.type || '';
            const searchQuery = requestParams.query || '';
            const recordId = requestParams.id || '';
            
            log.debug('Search Request', { type: type, query: searchQuery, id: recordId });
            
            // If ID is provided, fetch specific record details
            if (recordId && type.toLowerCase() === 'customer') {
                return getCustomerDetails(recordId);
            }
            
            let tableName = '';
            let nameField = '';
            
            // Map type parameter to table name
            switch(type.toLowerCase()) {
                case 'customer':
                    tableName = 'customer';
                    nameField = 'companyname';
                    break;
                case 'vendor':
                    tableName = 'vendor';
                    nameField = 'altname';
                    break;
                case 'subsidiary':
                    tableName = 'subsidiary';
                    nameField = 'name';
                    break;
                default:
                    return {
                        success: false,
                        error: 'Invalid type parameter. Must be customer, vendor, or subsidiary.'
                    };
            }
            
            // Build SuiteQL query
            let sql = `SELECT id, ${nameField} as name, entityid as entitynumber
                       FROM ${tableName}
                       WHERE isinactive = 'F'`;
            
            if (searchQuery && searchQuery.trim()) {
                const searchTerm = searchQuery.trim();
                
                if (type.toLowerCase() === 'customer' || type.toLowerCase() === 'vendor') {
                    // Search by name, entityid, or entitynumber
                    sql += ` AND (UPPER(${nameField}) LIKE UPPER('%${searchTerm}%')
                             OR UPPER(entityid) LIKE UPPER('%${searchTerm}%')
                             OR TO_CHAR(entitynumber) LIKE '%${searchTerm}%')`;
                } else {
                    // Subsidiary only has name
                    sql += ` AND UPPER(${nameField}) LIKE UPPER('%${searchTerm}%')`;
                }
            }
            
            sql += ` ORDER BY ${nameField} ASC
                     FETCH FIRST 1000 ROWS ONLY`;
            
            log.debug('SuiteQL Query', sql);
            
            // Execute the query
            const resultSet = query.runSuiteQL({ query: sql });
            const mappedResults = resultSet.asMappedResults();
            
            // Ensure consistent field naming for frontend
            const results = mappedResults.map(function(result) {
                return {
                    id: result.id,
                    name: result.name,
                    entitynumber: result.entitynumber
                };
            });
            
            log.debug('Search Results', { count: results.length, type: type, sample: results[0] });
            
            return results;
            
        } catch (e) {
            log.error('Error in doGet', e.toString());
            return {
                success: false,
                error: e.toString(),
                message: e.message || 'An error occurred during search'
            };
        }
    }
    
    /**
     * Get detailed customer information including sales rep
     */
    function getCustomerDetails(customerId) {
        try {
            log.debug('Fetching Customer Details', { customerId: customerId });
            
                const sql = `SELECT 
                                     c.id, 
                                     c.companyname as name, 
                                     c.entityid as entitynumber,
                                     cr.id as branch_id,
                                     cr.name as branch_name,
                                     cst.employee as salesrep_id,
                                     e.entityid as salesrep_name,
                                     cst.contribution * 100 as salesrep_commission,
                                     BUILTIN.DF(c.defaultbillingaddress) as billing_address,
                                     BUILTIN.DF(c.defaultshippingaddress) as shipping_address
                                 FROM customer c
                                 LEFT JOIN customersalesteam cst ON c.id = cst.customer AND cst.isprimary = 'T'
                                 LEFT JOIN employee e ON cst.employee = e.id
                                 LEFT JOIN customrecord_cseg_hci_branch cr ON c.cseg_hci_branch = cr.id
                                 WHERE c.id = ?`;
            
            const resultSet = query.runSuiteQL({ 
                query: sql,
                params: [customerId]
            });
            const results = resultSet.asMappedResults();
            
            if (results && results.length > 0) {
                const customer = results[0];
                log.debug('Customer Details Found', customer);
                return {
                    id: customer.id,
                    name: customer.name,
                    entitynumber: customer.entitynumber,
                    branch_id: customer.branch_id,
                    branch_name: customer.branch_name,
                    salesrep_id: customer.salesrep_id,
                    salesrep_name: customer.salesrep_name,
                    salesrep_commission: customer.salesrep_commission,
                    billing_address: customer.billing_address,
                    shipping_address: customer.shipping_address
                };
            }
            
            return {
                success: false,
                error: 'Customer not found'
            };
            
        } catch (e) {
            log.error('Error in getCustomerDetails', e.toString());
            return {
                success: false,
                error: e.toString(),
                message: e.message || 'An error occurred fetching customer details'
            };
        }
    }
    
    return {
        get: doGet
    };
    
});
