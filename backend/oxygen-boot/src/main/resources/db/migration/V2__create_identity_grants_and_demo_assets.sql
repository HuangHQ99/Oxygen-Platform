CREATE TABLE service_provider (
    id uuid PRIMARY KEY,
    code varchar(64) NOT NULL UNIQUE,
    name varchar(200) NOT NULL
);

CREATE TABLE client_account (
    id uuid PRIMARY KEY,
    provider_id uuid NOT NULL REFERENCES service_provider (id),
    code varchar(64) NOT NULL,
    name varchar(200) NOT NULL,
    UNIQUE (provider_id, code)
);

CREATE TABLE data_centre (
    id uuid PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES client_account (id),
    code varchar(64) NOT NULL,
    name varchar(200) NOT NULL,
    time_zone varchar(64) NOT NULL,
    UNIQUE (client_id, code),
    UNIQUE (client_id, id)
);

CREATE TABLE service_user (
    id uuid PRIMARY KEY,
    provider_id uuid NOT NULL REFERENCES service_provider (id),
    display_name varchar(200) NOT NULL,
    position varchar(200) NOT NULL,
    active boolean NOT NULL DEFAULT true
);

CREATE TABLE user_identity (
    user_id uuid NOT NULL REFERENCES service_user (id),
    identity_provider varchar(32) NOT NULL,
    subject varchar(200) NOT NULL,
    PRIMARY KEY (identity_provider, subject),
    UNIQUE (user_id, identity_provider)
);

CREATE TABLE client_grant (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES service_user (id),
    client_id uuid NOT NULL REFERENCES client_account (id),
    all_data_centres boolean NOT NULL DEFAULT false,
    status varchar(16) NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_until timestamptz,
    UNIQUE (user_id, client_id),
    UNIQUE (id, client_id),
    CONSTRAINT client_grant_status_check CHECK (status IN ('ACTIVE', 'REVOKED')),
    CONSTRAINT client_grant_validity_check CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE client_grant_role (
    grant_id uuid NOT NULL REFERENCES client_grant (id) ON DELETE CASCADE,
    role_code varchar(64) NOT NULL,
    PRIMARY KEY (grant_id, role_code),
    CONSTRAINT client_grant_role_check CHECK (
        role_code IN ('PROVIDER_ADMIN', 'PROVIDER_MAINTENANCE_LEAD', 'PROVIDER_FIELD_ENGINEER')
    )
);

CREATE TABLE client_grant_data_centre (
    grant_id uuid NOT NULL,
    client_id uuid NOT NULL,
    data_centre_id uuid NOT NULL,
    PRIMARY KEY (grant_id, data_centre_id),
    FOREIGN KEY (grant_id, client_id) REFERENCES client_grant (id, client_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id, data_centre_id) REFERENCES data_centre (client_id, id)
);

CREATE TABLE asset (
    id uuid PRIMARY KEY,
    client_id uuid NOT NULL,
    data_centre_id uuid NOT NULL,
    asset_code varchar(100) NOT NULL,
    ga_code varchar(100),
    name varchar(200) NOT NULL,
    equipment_type varchar(100) NOT NULL,
    status varchar(16) NOT NULL,
    UNIQUE (client_id, data_centre_id, asset_code),
    FOREIGN KEY (client_id, data_centre_id) REFERENCES data_centre (client_id, id),
    CONSTRAINT asset_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED'))
);

INSERT INTO service_provider (id, code, name)
VALUES ('10000000-0000-0000-0000-000000000001', 'OXYGEN-DEMO', 'Oxygen Demo Services');

INSERT INTO client_account (id, provider_id, code, name)
VALUES
    ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'CLIENT-A', '客户 A（合成）'),
    ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'CLIENT-B', '客户 B（合成）');

INSERT INTO data_centre (id, client_id, code, name, time_zone)
VALUES
    ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-00000000000a', 'A1', 'A1 数据中心', 'Asia/Kuala_Lumpur'),
    ('30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-00000000000a', 'A2', 'A2 数据中心', 'Asia/Kuala_Lumpur'),
    ('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'B1', 'B1 数据中心', 'Asia/Kuala_Lumpur');

INSERT INTO service_user (id, provider_id, display_name, position)
VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Aiman Rahman', 'Maintenance Lead / Field Engineer'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Lina Tan', 'Maintenance Lead');

INSERT INTO user_identity (user_id, identity_provider, subject)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'demo', 'aiman'),
    ('40000000-0000-0000-0000-000000000001', 'cognito', 'aiman'),
    ('40000000-0000-0000-0000-000000000002', 'demo', 'lina'),
    ('40000000-0000-0000-0000-000000000002', 'cognito', 'lina');

INSERT INTO client_grant (id, user_id, client_id, all_data_centres, status, valid_from)
VALUES
    ('50000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000000a', true, 'ACTIVE', '2026-01-01T00:00:00Z'),
    ('50000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000000b', false, 'ACTIVE', '2026-01-01T00:00:00Z'),
    ('50000000-0000-0000-0000-0000000000a2', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000000a', true, 'ACTIVE', '2026-01-01T00:00:00Z');

INSERT INTO client_grant_role (grant_id, role_code)
VALUES
    ('50000000-0000-0000-0000-0000000000a1', 'PROVIDER_MAINTENANCE_LEAD'),
    ('50000000-0000-0000-0000-0000000000a1', 'PROVIDER_FIELD_ENGINEER'),
    ('50000000-0000-0000-0000-0000000000b1', 'PROVIDER_FIELD_ENGINEER'),
    ('50000000-0000-0000-0000-0000000000a2', 'PROVIDER_MAINTENANCE_LEAD');

INSERT INTO client_grant_data_centre (grant_id, client_id, data_centre_id)
VALUES ('50000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1');

INSERT INTO asset (id, client_id, data_centre_id, asset_code, ga_code, name, equipment_type, status)
VALUES
    ('60000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', 'FM200-001', 'GA-A-001', 'A1 FM200 Suppression Panel', 'FM200', 'ACTIVE'),
    ('60000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000000b1', 'FM200-001', 'GA-B-001', 'B1 FM200 Suppression Panel', 'FM200', 'ACTIVE');
