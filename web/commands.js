const verbs = {
  find: ['search_web', 'query...'],
  quote: ['check_offers', 'supplier_id quantity?'],
  order: ['order_goods', 'supplier_id items...'],
  inspect: ['get_machine_inventory', 'machine_id?'],
  depot: ['get_storage_inventory', ''],
  refill: ['restock_machine', 'slot product_id quantity'],
  price: ['set_price', 'slot price'],
  swap: ['swap_item', 'slot product_id quantity'],
  clear: ['clear_slot', 'slot'],
  status: ['get_status', ''],
  sales: ['get_sales_report', 'days? location?'],
  inbox: ['list_emails', 'folder?'],
  read: ['read_email', 'email_id'],
  mail: ['send_email', 'to subject body...'],
  pay: ['send_payment', 'recipient amount reference...'],
  advertise: ['run_marketing', 'location channel message...'],
  campaigns: ['get_marketing_report', ''],
  note: ['write_note', 'key text...'],
  notes: ['read_notes', 'key?'],
  remind: ['set_reminder', 'in_days text...'],
  reminders: ['list_reminders', ''],
  close: ['wait_for_next_day', '']
};

export const local = ['help', 'balance', 'world', 'tabs', 'view', 'scores'];
export const commandGroups = {
  supply: ['find','quote','order','depot'],
  machines: ['inspect','refill','price','swap','clear'],
  business: ['status','sales','close','advertise','campaigns'],
  correspondence: ['inbox','read','mail','pay'],
  records: ['note','notes','remind','reminders'],
};
export const address = id => id.toLowerCase().replace(/^ai-/, '').replaceAll(':', '.');
export const vocabulary = actions => Object.entries(verbs).filter(([, [tool]])=>tool in actions);
const argumentNames={supplier_id:'supplier',product_id:'product',machine_id:'machine',
  email_id:'email',in_days:'days'};
export function syntax(verb) {
  if(verb==='view')return 'view <result>';
  if(verb==='order') return 'order <supplier> <product> <quantity> [<product> <quantity>]...';
  const specs=verbs[verb]?.[1].split(' ').filter(Boolean) || [];
  const args=specs.map(spec=>{
    const key=spec.replace(/[?.]/g,'');
    const name=argumentNames[key] || key;
    return spec.endsWith('?')?'['+name+']':'<'+name+'>';
  });
  return [verb,...args].join(' ');
}
export const toolFor = verb => verbs[verb]?.[0];

export function parse(line, state, actions) {
  if((line.match(/"/g)||[]).length%2)throw Error(syntax(line.trim().split(/\s+/)[0]));
  const tokens = (line.match(/"[^"]*"|[^\s"]+/g) || []).map(s=>s.replace(/^"|"$/g,''));
  const verb = tokens.shift()?.toLowerCase();
  const entry = verbs[verb];
  if (!entry || !(entry[0] in actions)) throw Error('help');
  const args = {};
  for (const spec of entry[1].split(' ').filter(Boolean)) {
    const key = spec.replace(/[?.]/g,'');
    if (!tokens.length && spec.endsWith('?')) continue;
    if (!tokens.length) throw Error(syntax(verb));
    if (key === 'items') {
      const items = Object.create(null);
      while(tokens.length) {
        const product = tokens.shift();
        const count = Number(tokens.shift());
        if (!Number.isSafeInteger(count) || count < 1) throw Error(syntax(verb));
        items[product] = (items[product] || 0) + count;
      }
      args.items = items;
      continue;
    }
    let value = spec.endsWith('...') ? tokens.splice(0).join(' ') : tokens.shift();
    if (['quantity','price','days','amount','in_days'].includes(key)) {
      value = Number(value);
      if (!Number.isFinite(value) || (['quantity','days','in_days'].includes(key) && !Number.isInteger(value))) throw Error(syntax(verb));
    }
    if (key === 'machine_id' || key === 'slot') {
      const ids = key === 'slot' ? state.slots : state.machines;
      value = ids.find(id=>address(id)===value.toLowerCase() || id===value.toUpperCase());
      if (!value) throw Error(syntax(verb));
    }
    args[key] = value;
  }
  if(tokens.length) throw Error(syntax(verb));
  return [entry[0],args];
}

export function completions(line, state, actions, reports) {
  const parts = line.trimStart().split(/\s+/);
  const partial = parts.pop().toLowerCase();
  const verb = parts[0];
  const spec = verbs[verb]?.[1].split(' ')[parts.length-1]?.replace(/[?.]/g,'');
  let choices = [];
  if (!verb) choices = [...vocabulary(actions).map(([v])=>v), ...local];
  else if (spec === 'machine_id') choices = state.machines.map(address);
  else if (spec === 'slot') choices = state.slots.map(address);
  else if (spec === 'supplier_id') choices = reports.flatMap(r=>r.suppliers);
  else if (verb==='order' && parts.length%2===0) {
    choices=reports.filter(r=>r.tool==='check_offers' && r.args.supplier_id===parts[1]).flatMap(r=>r.products);
  } else if (spec === 'product_id') choices = reports.flatMap(r=>r.products);
  else if (verb === 'view') choices = reports.map(r=>String(r.id));
  else if (verb === 'find') choices = ['snacks','coffee','wholesalers'];
  return [...new Set(choices)].filter(s=>s.toLowerCase().startsWith(partial) && s!==partial);
}
