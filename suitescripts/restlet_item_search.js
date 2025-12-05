/**
 * Example RESTlet (SuiteScript 2.1) to search items by query and filter.
 * Accepts GET params: q (query), filter (name|sku|internalid), limit (optional)
 * Returns array of items: [{ id, name, sku, price, cost }
*@NApiVersion 2.1 
*@NScriptType Restlet 
*/
define(['N/search','N/log'], (search, log) => {
  function get(context) {
    try {
      const q = (context.q || context.q || '').toString();
      const filter = (context.filter || 'name').toString();
      const limit = parseInt(context.limit, 10) || 25;

      if (!q) return [];

      const filters = [];
      if (filter === 'sku') {
        filters.push(['upccode', 'is', q]);
      } else if (filter === 'internalid') {
        filters.push(['internalid', 'is', q]);
      } else {
        // default: name contains
        filters.push(['name', 'contains', q]);
      }

      const columns = [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'itemid' }),
        search.createColumn({ name: 'displayname' }),
        search.createColumn({ name: 'baseprice' }),
        search.createColumn({ name: 'custitem_cost' }) // replace with your internal cost field if needed
      ];

      const s = search.create({ type: search.Type.ITEM, filters: filters, columns: columns });
      const results = [];
      let count = 0;
      s.run().each(r => {
        if (count >= limit) return false;
        const id = r.getValue({ name: 'internalid' });
        const name = r.getValue({ name: 'displayname' }) || r.getValue({ name: 'itemid' });
        const price = r.getValue({ name: 'baseprice' });
        const cost = r.getValue({ name: 'custitem_cost' });
        // try to get SKU from upccode or other field
        const sku = r.getValue({ name: 'upccode' }) || '';
        results.push({ id, name, sku, price: price ? Number(price) : null, cost: cost ? Number(cost) : null });
        count++;
        return true;
      });

      return results;
    } catch (e) {
      log.error('items search error', e);
      return { error: e.message };
    }
  }

  return { get };
});
