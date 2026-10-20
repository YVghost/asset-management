import { request } from '../frontend/node_modules/@playwright/test/index.mjs';

// Run explicitly against a running installation. Credentials are environment-only.
const baseURL = process.env.AMS_SEED_URL || 'http://localhost:3000';
if (!process.env.AMS_SEED_EMAIL || !process.env.AMS_SEED_PASSWORD) {
  throw new Error('Define AMS_SEED_EMAIL y AMS_SEED_PASSWORD');
}
const api = await request.newContext({ baseURL });
let headers = {};
async function call(path, method = 'GET', data) {
  const response = await api.fetch('/api/v1' + path, { method, headers, data });
  if (!response.ok()) throw new Error(`${method} ${path}: ${response.status()} ${await response.text()}`);
  return response.status() === 204 ? null : response.json();
}
async function rows(path) {
  const result = [];
  for (let page = 0; ; page++) {
    const data = await call(`${path}?size=100&page=${page}`);
    result.push(...data.content);
    if (result.length >= data.totalElements) return result;
  }
}
const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
try {
  let csrf = await call('/auth/csrf');
  headers = { [csrf.headerName]: csrf.token };
  await call('/auth/login', 'POST', {email:process.env.AMS_SEED_EMAIL, password:process.env.AMS_SEED_PASSWORD});
  csrf = await call('/auth/csrf'); headers = {[csrf.headerName]:csrf.token};
  const organizations = await rows('/system/organizations');
  const candidates = organizations.filter(o => o.name.trim().toLowerCase() === 'edinun' && o.active);
  if (candidates.length !== 1) throw new Error('Debe existir una única organización activa llamada Edinun');
  const org = candidates[0];
  const root = `/organizations/${org.id}`;
  const before = new Map();
  for (const company of organizations.filter(o => o.active)) {
    before.set(company.id, (await call(`/organizations/${company.id}/assets?size=1`)).totalElements);
  }
  async function catalog(type, name, extra = {}) {
    const existing = (await rows(`${root}/${type}`)).find(r => r.name === name);
    if (existing) {
      if (!existing.active) throw new Error(`Registro de prueba inactivo: ${name}; no se modificará`);
      return existing;
    }
    return call(`${root}/${type}`, 'POST', {name,active:true,...extra});
  }
  const departments = [];
  for (const name of ['TI','Editorial','Operaciones','Bodega']) departments.push(await catalog('departments',`[DEMO] ${name}`));
  const locations = [];
  for (const [name,address] of [['Oficina principal','Dirección ficticia de demostración'],['Centro editorial','Piso 2 de demostración'],['Bodega','Zona de almacenamiento de demostración']]) {
    locations.push(await catalog('locations',`[DEMO] ${name}`,{address}));
  }
  const suppliers = [];
  for (const name of ['Proveedor de equipos','Proveedor de servicios digitales']) suppliers.push(await catalog('suppliers',`[DEMO] ${name}`));
  const people = [];
  const employees = await rows(`${root}/employees`);
  for (let i=0;i<5;i++) {
    const employeeCode = `EDN-DEMO-P${i+1}`;
    let person = employees.find(e => e.employee_code === employeeCode);
    if (person && !person.active) throw new Error(`Empleado inactivo: ${employeeCode}`);
    if (!person) person = await call(`${root}/employees`,'POST',{
      employeeCode,firstName:'Persona de prueba',lastName:`Edinun ${i+1}`,
      email:`persona${i+1}@edinun.example`,departmentId:departments[i%4].id,
      locationId:locations[i%3].id,jobTitle:['Soporte TI','Edición','Coordinación','Bodega','Diseño'][i],active:true,
    });
    people.push(person);
  }
  const hardware = [
    ['Laptop de soporte','Laptops','Dell','Latitude 5450',0,0,0,'Puesto TI 01'],
    ['Laptop editorial','Laptops','Lenovo','ThinkPad E14',1,1,1,'Puesto editorial 02'],
    ['Computadora de diseño','Computadoras de escritorio','HP','ProDesk',1,1,4,'Puesto de diseño'],
    ['Monitor editorial','Monitores','Dell','P2425H',1,1,1,'Mesa editorial 02'],
    ['Impresora de operaciones','Impresoras','Epson','EcoTank',2,0,null,'Zona de impresión'],
    ['Servidor de archivos','Servidores','Dell','PowerEdge',0,0,0,'Rack TI / U12'],
    ['Router principal','Routers','MikroTik','RB5009',0,0,null,'Rack TI / U02'],
    ['Switch de oficina','Switches','TP-Link','JetStream',0,0,null,'Rack TI / U03'],
    ['UPS de respaldo','UPS','APC','Back-UPS',0,0,null,'Rack TI / base'],
    ['Tablet de inventario','Tablets','Samsung','Galaxy Tab',3,2,3,'Mostrador de bodega'],
    ['Laptop de reserva','Laptops','Lenovo','ThinkPad',3,2,null,'Estante B / nivel 2'],
    ['Impresora en mantenimiento','Impresoras','HP','LaserJet',2,2,null,'Banco de mantenimiento'],
  ];
  const existingAssets = await rows(`${root}/assets`);
  let created = 0;
  const demoIds = [];
  for (let i=0;i<16;i++) {
    const digital = i>=12;
    const assetCode = `EDN-DEMO-${digital?'DIG':'HW'}-${String(digital?i-11:i+1).padStart(3,'0')}`;
    const existing = existingAssets.find(a=>a.asset_code===assetCode);
    if (existing) {demoIds.push(existing.id);continue;}
    const digitalNames = ['Suite editorial','Correo y colaboración','Dominio de prueba','Servicio cloud de respaldo'];
    const digitalCategories = ['Licencias de software','Suscripciones SaaS','Dominios','Servicios cloud'];
    const data = digital ? null : hardware[i];
    const category = await catalog('categories',digital?digitalCategories[i-12]:data[1],{assetKind:digital?'DIGITAL':'HARDWARE'});
    const payload = {
      assetCode,name:`[DEMO] ${digital?digitalNames[i-12]:data[0]}`,
      description:'DATOS FICTICIOS DE PRUEBA. No representa inventario real de Edinun.',
      assetKind:digital?'DIGITAL':'HARDWARE',categoryId:category.id,
      currency:'USD',acquisitionDate:i===10?'2021-01-15':day(-180),
      inServiceDate:i===10?'2021-02-01':day(-175),acquisitionCost:digital?'120.00':String(150+i*75),
      usefulLifeMonths:digital?12:48,departmentId:departments[digital?0:data[4]].id,
      locationId:digital?null:locations[data[5]].id,supplierId:suppliers[digital?1:0].id,
      invoiceReference:`FACTURA-DEMO-${i+1}`,notes:'Registro de demostración creado a solicitud del administrador.',
      employeeId:!digital && data[6]!==null?people[data[6]].id:null,
      hardware:digital?null:{brand:data[2],model:data[3],serialNumber:`SERIE-DEMO-EDN-${i+1}`,
        physicalCondition:i===10?'FAIR':'GOOD',warrantyEndDate:day(i===10?-60:365),
        specifications:{storagePlace:data[7],...(data[1]==='Laptops'||i===2?{processor:'Intel Core i5',ram:'16 GB',storage:'512 GB',storageType:'SSD',operatingSystem:'Windows 11'}:{})}},
      digital:digital?{product:digitalNames[i-12],licenseType:i===14?'Dominio':'Suscripción',
        contractReference:`CONTRATO-DEMO-${i-11}`,activationDate:day(-180),expirationDate:day(i===12?15:180),
        autoRenew:i!==12,renewalCost:'120.00',seats:i===14?1:10,
        responsibleEmployeeId:i===14?null:people[i===12?1:0].id,managementUrl:'https://portal.edinun.example/demo'}:null,
    };
    const asset = await call(`${root}/${digital?'digital-assets':'hardware-assets'}`,'POST',payload);
    created++;demoIds.push(asset.id);
    if (i===1) await call(`${root}/assets/${asset.id}/transfer`,'POST',{
      employeeId:people[2].id,departmentId:departments[2].id,assignedAt:new Date().toISOString(),notes:'Transferencia de demostración de Editorial a Operaciones',
    });
    if (i===11) await call(`${root}/assets/${asset.id}/status`,'PATCH',{status:'IN_MAINTENANCE'});
  }
  const details = [];
  for (const id of demoIds) details.push(await call(`${root}/assets/${id}`));
  if (details.length!==16 || details.some(a=>a.organization_id!==org.id || !a.tracking_id)) throw new Error('Verificación de pertenencia/QR fallida');
  for (const [id,count] of before) if(id!==org.id && (await call(`/organizations/${id}/assets?size=1`)).totalElements!==count) throw new Error('Cambió el inventario de otra empresa');
  console.log(JSON.stringify({organization:org.name,created,totalDemoAssets:details.length,hardware:details.filter(a=>a.asset_kind==='HARDWARE').length,digital:details.filter(a=>a.asset_kind==='DIGITAL').length,people:people.length,departments:departments.length,locations:locations.length,suppliers:suppliers.length,otherOrganizationsUnchanged:true}));
} finally { await api.dispose(); }
