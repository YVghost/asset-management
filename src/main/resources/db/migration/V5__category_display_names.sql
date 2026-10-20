DELETE FROM asset_categories c WHERE name='Esc?neres' AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.category_id=c.id) AND EXISTS (SELECT 1 FROM asset_categories other WHERE other.organization_id=c.organization_id AND other.name='Escáneres');
UPDATE asset_categories SET name='Escáneres' WHERE name='Esc?neres';
DELETE FROM asset_categories c WHERE name='Tel?fonos corporativos' AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.category_id=c.id) AND EXISTS (SELECT 1 FROM asset_categories other WHERE other.organization_id=c.organization_id AND other.name='Teléfonos corporativos');
UPDATE asset_categories SET name='Teléfonos corporativos' WHERE name='Tel?fonos corporativos';
DELETE FROM asset_categories c WHERE name='C?maras web' AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.category_id=c.id) AND EXISTS (SELECT 1 FROM asset_categories other WHERE other.organization_id=c.organization_id AND other.name='Cámaras web');
UPDATE asset_categories SET name='Cámaras web' WHERE name='C?maras web';
DELETE FROM asset_categories c WHERE name='Aud?fonos corporativos' AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.category_id=c.id) AND EXISTS (SELECT 1 FROM asset_categories other WHERE other.organization_id=c.organization_id AND other.name='Audífonos corporativos');
UPDATE asset_categories SET name='Audífonos corporativos' WHERE name='Aud?fonos corporativos';
DELETE FROM asset_categories c WHERE name='Otros perif?ricos' AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.category_id=c.id) AND EXISTS (SELECT 1 FROM asset_categories other WHERE other.organization_id=c.organization_id AND other.name='Otros periféricos');
UPDATE asset_categories SET name='Otros periféricos' WHERE name='Otros perif?ricos';
-- Independent starter catalogs; never overwrite names, types or activation chosen by a tenant.
CREATE OR REPLACE FUNCTION seed_organization_categories(target_org uuid) RETURNS void LANGUAGE sql AS $$
INSERT INTO asset_categories(id, organization_id, name, asset_kind)
SELECT gen_random_uuid(), target_org, defaults.name, defaults.kind
FROM (VALUES ('Laptops','HARDWARE'),('Computadoras de escritorio','HARDWARE'),('Monitores','HARDWARE'),('Teclados','HARDWARE'),('Mouse','HARDWARE'),('Impresoras','HARDWARE'),('Escáneres','HARDWARE'),('Servidores','HARDWARE'),('Routers','HARDWARE'),('Switches','HARDWARE'),('Access points','HARDWARE'),('Teléfonos corporativos','HARDWARE'),('Tablets','HARDWARE'),('Discos duros externos','HARDWARE'),('UPS','HARDWARE'),('Docking stations','HARDWARE'),('Proyectores','HARDWARE'),('Cámaras web','HARDWARE'),('Audífonos corporativos','HARDWARE'),('Otros periféricos','HARDWARE'),('Licencias de software','DIGITAL'),('Suscripciones SaaS','DIGITAL'),('Dominios','DIGITAL'),('Certificados SSL','DIGITAL'),('Software adquirido','DIGITAL'),('Servicios cloud','DIGITAL'),('Otros activos digitales','DIGITAL')) AS defaults(name,kind)
ON CONFLICT(organization_id,name) DO NOTHING;
$$;
