CREATE TABLE organizations (
 id uuid PRIMARY KEY, name varchar(160) NOT NULL, legal_name varchar(200), tax_id varchar(60),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_users (
 id uuid PRIMARY KEY, email varchar(200) NOT NULL UNIQUE, password_hash varchar(200) NOT NULL,
 full_name varchar(160) NOT NULL, active boolean NOT NULL DEFAULT true,
 system_admin boolean NOT NULL DEFAULT false
);
CREATE TABLE organization_memberships (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 user_id uuid NOT NULL REFERENCES app_users,
 role varchar(30) NOT NULL CHECK(role IN ('ORG_ADMIN','ASSET_MANAGER','VIEWER')),
 UNIQUE(organization_id,user_id)
);
CREATE TABLE departments (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 name varchar(160) NOT NULL, active boolean NOT NULL DEFAULT true,
 UNIQUE(organization_id,id), UNIQUE(organization_id,name)
);
CREATE TABLE locations (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 name varchar(160) NOT NULL, address text, active boolean NOT NULL DEFAULT true,
 UNIQUE(organization_id,id), UNIQUE(organization_id,name)
);
CREATE TABLE suppliers (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 name varchar(160) NOT NULL, email varchar(200), phone varchar(60), active boolean NOT NULL DEFAULT true,
 UNIQUE(organization_id,id), UNIQUE(organization_id,name)
);
CREATE TABLE asset_categories (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 name varchar(160) NOT NULL, asset_kind varchar(15) NOT NULL CHECK(asset_kind IN ('HARDWARE','DIGITAL')),
 active boolean NOT NULL DEFAULT true, UNIQUE(organization_id,id), UNIQUE(organization_id,name)
);
CREATE TABLE employees (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 employee_code varchar(60) NOT NULL, first_name varchar(100) NOT NULL, last_name varchar(100) NOT NULL,
 email varchar(200), department_id uuid, location_id uuid, job_title varchar(160),
 active boolean NOT NULL DEFAULT true, hired_on date,
 UNIQUE(organization_id,id), UNIQUE(organization_id,employee_code),
 FOREIGN KEY(organization_id,department_id) REFERENCES departments(organization_id,id),
 FOREIGN KEY(organization_id,location_id) REFERENCES locations(organization_id,id)
);
CREATE TABLE assets (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations,
 asset_code varchar(60) NOT NULL, name varchar(160) NOT NULL, description text,
 asset_kind varchar(15) NOT NULL CHECK(asset_kind IN ('HARDWARE','DIGITAL')),
 category_id uuid NOT NULL, status varchar(30) NOT NULL DEFAULT 'AVAILABLE'
 CHECK(status IN ('AVAILABLE','ASSIGNED','IN_MAINTENANCE','RETIRED','DISPOSED','LOST')),
 acquisition_date date, acquisition_cost numeric(19,2) CHECK(acquisition_cost>=0),
 residual_value numeric(19,2) CHECK(residual_value>=0), currency varchar(3) NOT NULL DEFAULT 'USD',
 in_service_date date, useful_life_months integer CHECK(useful_life_months>0),
 location_id uuid, department_id uuid, supplier_id uuid, parent_asset_id uuid,
 invoice_reference varchar(200), notes text, created_by uuid NOT NULL REFERENCES app_users,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 0,
 UNIQUE(organization_id,id), UNIQUE(organization_id,asset_code),
 CHECK(in_service_date IS NULL OR acquisition_date IS NULL OR in_service_date>=acquisition_date),
 CHECK(parent_asset_id IS NULL OR parent_asset_id<>id),
 FOREIGN KEY(organization_id,category_id) REFERENCES asset_categories(organization_id,id),
 FOREIGN KEY(organization_id,location_id) REFERENCES locations(organization_id,id),
 FOREIGN KEY(organization_id,department_id) REFERENCES departments(organization_id,id),
 FOREIGN KEY(organization_id,supplier_id) REFERENCES suppliers(organization_id,id),
 FOREIGN KEY(organization_id,parent_asset_id) REFERENCES assets(organization_id,id)
);
CREATE TABLE hardware_asset_details (
 asset_id uuid PRIMARY KEY, organization_id uuid NOT NULL,
 brand varchar(100), model varchar(100), serial_number varchar(160), patrimonial_tag varchar(100),
 physical_condition varchar(30) NOT NULL DEFAULT 'GOOD' CHECK(physical_condition IN ('NEW','GOOD','FAIR','DAMAGED')),
 warranty_end_date date, specifications jsonb NOT NULL DEFAULT '{}',
 FOREIGN KEY(organization_id,asset_id) REFERENCES assets(organization_id,id)
);
CREATE TABLE digital_asset_details (
 asset_id uuid PRIMARY KEY, organization_id uuid NOT NULL,
 product varchar(160), license_type varchar(100), contract_reference varchar(200),
 activation_date date, expiration_date date, auto_renew boolean NOT NULL DEFAULT false,
 renewal_cost numeric(19,2) CHECK(renewal_cost>=0), seats integer CHECK(seats>0), responsible_employee_id uuid,
 CHECK(expiration_date IS NULL OR activation_date IS NULL OR expiration_date>=activation_date),
 FOREIGN KEY(organization_id,asset_id) REFERENCES assets(organization_id,id),
 FOREIGN KEY(organization_id,responsible_employee_id) REFERENCES employees(organization_id,id)
);
CREATE TABLE asset_assignments (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, asset_id uuid NOT NULL, employee_id uuid NOT NULL,
 department_id uuid, assigned_at timestamptz NOT NULL, expected_return_at timestamptz, returned_at timestamptz, notes text,
 assigned_by_user_id uuid NOT NULL REFERENCES app_users, returned_by_user_id uuid REFERENCES app_users,
 CHECK(returned_at IS NULL OR returned_at>=assigned_at),
 CHECK(expected_return_at IS NULL OR expected_return_at>=assigned_at),
 FOREIGN KEY(organization_id,asset_id) REFERENCES assets(organization_id,id),
 FOREIGN KEY(organization_id,employee_id) REFERENCES employees(organization_id,id),
 FOREIGN KEY(organization_id,department_id) REFERENCES departments(organization_id,id)
);
CREATE UNIQUE INDEX one_active_assignment ON asset_assignments(asset_id) WHERE returned_at IS NULL;
CREATE TABLE asset_events (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, asset_id uuid NOT NULL,
 user_id uuid NOT NULL REFERENCES app_users, event_type varchar(40) NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(), changes jsonb NOT NULL DEFAULT '{}',
 FOREIGN KEY(organization_id,asset_id) REFERENCES assets(organization_id,id)
);
CREATE TABLE asset_maintenance_records (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, asset_id uuid NOT NULL,
 description text NOT NULL, started_at timestamptz NOT NULL, finished_at timestamptz,
 cost numeric(19,2) CHECK(cost>=0), supplier_id uuid,
 CHECK(finished_at IS NULL OR finished_at>=started_at),
 FOREIGN KEY(organization_id,asset_id) REFERENCES assets(organization_id,id),
 FOREIGN KEY(organization_id,supplier_id) REFERENCES suppliers(organization_id,id)
);
CREATE INDEX assets_org_status ON assets(organization_id,status);
CREATE INDEX assets_org_name ON assets(organization_id,lower(name));
CREATE INDEX assets_org_category ON assets(organization_id,category_id);
CREATE INDEX assets_org_location ON assets(organization_id,location_id);
CREATE INDEX assets_org_department ON assets(organization_id,department_id);
CREATE INDEX employees_org_name ON employees(organization_id,last_name,first_name);
CREATE INDEX assignments_org_employee ON asset_assignments(organization_id,employee_id);
CREATE INDEX events_org_asset ON asset_events(organization_id,asset_id,occurred_at);
CREATE INDEX digital_expiry ON digital_asset_details(organization_id,expiration_date);
CREATE INDEX hardware_warranty ON hardware_asset_details(organization_id,warranty_end_date);
