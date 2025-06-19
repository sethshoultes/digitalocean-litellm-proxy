-- Sample users for development and testing
-- Password: "password123" hashed with bcrypt

-- Create sample organization and team
INSERT INTO "LiteLLM_OrganizationTable" (organization_id, organization_name) VALUES
('org_acme_corp', 'ACME Corporation'),
('org_tech_startup', 'Tech Startup Inc');

INSERT INTO "LiteLLM_TeamTable" (team_id, team_name, organization_id) VALUES
('team_engineering', 'Engineering Team', 'org_acme_corp'),
('team_product', 'Product Team', 'org_acme_corp'),
('team_dev', 'Development Team', 'org_tech_startup');

-- Create sample users
-- Password for all users: "password123"
-- Bcrypt hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW
INSERT INTO "LiteLLM_UserTable" (user_id, user_email, user_role, password_hash, team_id, organization_id, max_budget) VALUES
('admin_user_1', 'admin@example.com', 'PROXY_ADMIN', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW', 'team_engineering', 'org_acme_corp', NULL),
('org_admin_1', 'org.admin@acme.com', 'ORG_ADMIN', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW', 'team_engineering', 'org_acme_corp', 1000.0),
('team_lead_1', 'team.lead@acme.com', 'TEAM_ADMIN', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW', 'team_engineering', 'org_acme_corp', 500.0),
('developer_1', 'dev1@acme.com', 'CUSTOMER', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW', 'team_engineering', 'org_acme_corp', 200.0),
('developer_2', 'dev2@acme.com', 'CUSTOMER', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW', 'team_product', 'org_acme_corp', 200.0),
('startup_admin', 'admin@techstartup.com', 'ORG_ADMIN', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJrJbaaW', 'team_dev', 'org_tech_startup', 500.0),
('startup_dev', 'dev@techstartup.com', 'CUSTOMER', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj7TdJarJbaaW', 'team_dev', 'org_tech_startup', 150.0);

-- Now run the integration script to set up foreign keys
-- (This was skipped earlier because the tables didn't exist)