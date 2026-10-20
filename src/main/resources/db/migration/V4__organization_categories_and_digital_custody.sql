-- Independent starter catalogs; never overwrite names, types or activation chosen by a tenant.
CREATE FUNCTION seed_organization_categories(target_org uuid) RETURNS void LANGUAGE sql AS $$
INSERT INTO asset_categories(id, organization_id, name, asset_kind)
SELECT gen_random_uuid(), target_org, defaults.name, defaults.kind
FROM (VALUES ('Laptops','HARDWARE'),('Computadoras de escritorio','HARDWARE'),('Monitores','HARDWARE'),('Teclados','HARDWARE'),('Mouse','HARDWARE'),('Impresoras','HARDWARE'),('Esc?neres','HARDWARE'),('Servidores','HARDWARE'),('Routers','HARDWARE'),('Switches','HARDWARE'),('Access points','HARDWARE'),('Tel?fonos corporativos','HARDWARE'),('Tablets','HARDWARE'),('Discos duros externos','HARDWARE'),('UPS','HARDWARE'),('Docking stations','HARDWARE'),('Proyectores','HARDWARE'),('C?maras web','HARDWARE'),('Aud?fonos corporativos','HARDWARE'),('Otros perif?ricos','HARDWARE'),('Licencias de software','DIGITAL'),('Suscripciones SaaS','DIGITAL'),('Dominios','DIGITAL'),('Certificados SSL','DIGITAL'),('Software adquirido','DIGITAL'),('Servicios cloud','DIGITAL'),('Otros activos digitales','DIGITAL')) AS defaults(name,kind)
ON CONFLICT(organization_id,name) DO NOTHING;
$$;
SELECT seed_organization_categories(id) FROM organizations;
ALTER TABLE digital_asset_details ADD COLUMN management_url varchar(500);
