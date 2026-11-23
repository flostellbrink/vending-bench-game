export function observation(receipt, move, id) {
  const {output} = receipt;
  const suppliers = [...output.matchAll(/Supplier ID: ([\w-]+)/g)].map(m=>m[1]);
  const products = [];
  let columns = [], rows = [];
  if (move[0] === 'get_machine_inventory') {
    columns = ['slot','size','product','quantity','capacity','price'];
    for (const line of output.split('\n')) {
      const m = /^(\S+:\w\d+)\s+(\w+)\s+(.+?)\s{2,}(\d+)\s+(\d+)\s+(.+)$/.exec(line);
      if (m) rows.push(m.slice(1));
    }
  } else if (move[0] === 'get_storage_inventory') {
    columns = ['product_id','product','size','quantity','price'];
    for (const line of output.split('\n')) {
      const m = /^(\S+)\s{2,}(.+?)\s{2,}(small|large)\s+(\d+)\s+(€[\d.,]+)/.exec(line);
      if (m) { rows.push(m.slice(1)); products.push(m[1]); }
    }
  } else if (move[0] === 'check_offers') {
    const json = output.split('\n')[0];
    if (json.startsWith('{')) {
      const quote = JSON.parse(json);
      columns = ['product_id','price','discount'];
      for (const [product,offer] of Object.entries(quote.offers || {})) {
        products.push(product); rows.push([product,offer.unit_price,offer.discount]);
      }
    }
  } else if (suppliers.length) {
    columns = ['supplier_id','to','minimum'];
    for (const m of output.matchAll(/Supplier ID: ([\w-]+)[\s\S]*?Contact: (\S+)\s+Minimum order: ([^\n]+)/g))
      rows.push(m.slice(1));
  }
  return {...receipt, id, columns, rows, products, suppliers};
}
