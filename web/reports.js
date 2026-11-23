export function observation(receipt, move, id) {
  const {output} = receipt;
  const suppliers = [...output.matchAll(/Supplier ID: ([\w-]+)/g)].map(m=>m[1]);
  const products = [];
  let columns = [], rows = [], terms = null;
  const slots = {};
  if (move[0] === 'get_machine_inventory') {
    columns = ['slot','size','product','quantity','capacity','price'];
    for (const line of output.split('\n')) {
      const m = /^(\S+:\w\d+)\s+(\w+)\s+(.+?)\s{2,}(\d+)\s+(\d+)\s+(.+)$/.exec(line);
      if (m) {
        rows.push(m.slice(1));
        slots[m[1]]={item:m[3],qty:Number(m[4]),capacity:Number(m[5])};
      }
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
      terms={minimum:quote.minimum_order,quantity:quote.quantity_per_product,
        until:quote.valid_through_day};
      columns = ['product_id','price','discount'];
      for (const [product,offer] of Object.entries(quote.offers || {})) {
        products.push(product); rows.push([product,offer.unit_price,Math.round(100*offer.discount)+'%']);
      }
    }
  } else if (suppliers.length) {
    columns = ['supplier_id','to','minimum'];
    for (const m of output.matchAll(/Supplier ID: ([\w-]+)[\s\S]*?Contact: (\S+)\s+Minimum order: ([^\n]+)/g))
      rows.push(m.slice(1));
  } else if(move[0]==='order_goods' && output.startsWith('{')) {
    const order=JSON.parse(output.split('\n')[0]);
    if(order.lines) {
      columns=['product_id','quantity','price'];
      rows=order.lines.map(l=>[l.product_id,l.quantity,l.unit_price]);
      terms={order:order.order_id,paid:order.paid,eta:order.delivery_day};
    }
  } else if(move[0]==='get_sales_report') {
    columns=['day','date','weather','units','revenue'];
    for(const m of output.matchAll(/^\s*(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\w+)\s+(\d+)\s+(€[\d.,]+)/gm)) rows.push(m.slice(1));
  }
  const loaded=/Loaded \d+ x (.+?) into slot (\S+) \((\d+)\/(\d+)\)/.exec(output);
  if(loaded) slots[loaded[2]]={item:loaded[1],qty:Number(loaded[3]),capacity:Number(loaded[4])};
  if(move[0]==='clear_slot' && /was already empty\.|to storage\./.test(output)) {
    slots[move[1].slot]={item:null,qty:0,capacity:null};
  }
  return {...receipt, id, columns, rows, products, suppliers,slots,terms,tool:move[0],args:move[1]};
}
