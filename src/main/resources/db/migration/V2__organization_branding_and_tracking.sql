ALTER TABLE organizations ADD COLUMN theme_key varchar(20) NOT NULL DEFAULT 'GENERIC' CHECK (theme_key IN ('GENERIC','EDINUN','CUSTOM'));
ALTER TABLE organizations ADD COLUMN brand_config jsonb NOT NULL DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN logo_data bytea;
UPDATE organizations SET theme_key='EDINUN' WHERE lower(trim(name)) IN ('edinun','edinum','editorial edinun');
ALTER TABLE assets ADD COLUMN tracking_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX assets_tracking_id_unique ON assets(tracking_id);
CREATE INDEX assignments_org_employee_asset ON asset_assignments(organization_id,employee_id,asset_id);
CREATE INDEX assignments_org_dates ON asset_assignments(organization_id,assigned_at,returned_at);
