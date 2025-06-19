-- Migration 005: Create LiteLLM Organization and Team Membership tables
-- These tables manage user memberships in organizations and teams
-- Date: 2024-12-19
-- Priority: P0 - High

-- Organization Membership Table
CREATE TABLE IF NOT EXISTS "LiteLLM_OrganizationMembership" (
    membership_id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 TEXT NOT NULL,
    organization_id         TEXT NOT NULL,
    user_role               TEXT DEFAULT 'MEMBER',
    spend                   FLOAT DEFAULT 0.0,
    budget_id               TEXT,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Additional membership fields
    invited_at              TIMESTAMPTZ,
    invited_by              TEXT,
    joined_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active               BOOLEAN DEFAULT TRUE,
    permissions             JSONB DEFAULT '{}',
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_org_member_role CHECK (
        user_role IN ('OWNER', 'ADMIN', 'MEMBER', 'BILLING', 'VIEWER')
    ),
    CONSTRAINT valid_org_member_spend CHECK (spend >= 0.0),
    CONSTRAINT valid_org_permissions CHECK (jsonb_typeof(permissions) = 'object'),
    CONSTRAINT valid_org_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT unique_org_membership UNIQUE (user_id, organization_id),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES "LiteLLM_BudgetTable"(budget_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (invited_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- Team Membership Table  
CREATE TABLE IF NOT EXISTS "LiteLLM_TeamMembership" (
    membership_id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 TEXT NOT NULL,
    team_id                 TEXT NOT NULL,
    user_role               TEXT DEFAULT 'MEMBER',
    spend                   FLOAT DEFAULT 0.0,
    budget_id               TEXT,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Additional membership fields
    invited_at              TIMESTAMPTZ,
    invited_by              TEXT,
    joined_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active               BOOLEAN DEFAULT TRUE,
    permissions             JSONB DEFAULT '{}',
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_team_member_role CHECK (
        user_role IN ('ADMIN', 'MEMBER', 'VIEWER')
    ),
    CONSTRAINT valid_team_member_spend CHECK (spend >= 0.0),
    CONSTRAINT valid_team_permissions CHECK (jsonb_typeof(permissions) = 'object'),
    CONSTRAINT valid_team_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT unique_team_membership UNIQUE (user_id, team_id),
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES "LiteLLM_BudgetTable"(budget_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL,
    FOREIGN KEY (invited_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- Invitation Link Table for user invitations
CREATE TABLE IF NOT EXISTS "LiteLLM_InvitationLink" (
    invitation_id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_link         TEXT UNIQUE NOT NULL,
    email                   TEXT NOT NULL,
    organization_id         TEXT,
    team_id                 TEXT,
    user_role               TEXT DEFAULT 'MEMBER',
    expires_at              TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT NOT NULL,
    used_at                 TIMESTAMPTZ,
    used_by                 TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    max_uses                INT DEFAULT 1,
    current_uses            INT DEFAULT 0,
    metadata                JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_invitation_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_invitation_expires CHECK (expires_at > created_at),
    CONSTRAINT valid_invitation_uses CHECK (current_uses <= max_uses AND max_uses > 0),
    CONSTRAINT valid_invitation_role CHECK (
        user_role IN ('OWNER', 'ADMIN', 'MEMBER', 'BILLING', 'VIEWER')
    ),
    CONSTRAINT invitation_target_check CHECK (
        (organization_id IS NOT NULL AND team_id IS NULL) OR
        (organization_id IS NULL AND team_id IS NOT NULL) OR
        (organization_id IS NOT NULL AND team_id IS NOT NULL)
    ),
    
    -- Foreign keys
    FOREIGN KEY (organization_id) REFERENCES "LiteLLM_OrganizationTable"(organization_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES "LiteLLM_TeamTable"(team_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (used_by) REFERENCES "LiteLLM_UserTable"(user_id) ON DELETE SET NULL
);

-- End User Table for tracking end users (for B2B scenarios)
CREATE TABLE IF NOT EXISTS "LiteLLM_EndUserTable" (
    user_id                 TEXT PRIMARY KEY,
    blocked                 BOOLEAN DEFAULT FALSE,
    alias                   TEXT,
    spend                   FLOAT DEFAULT 0.0,
    allowed_model_region    TEXT,
    default_model           TEXT,
    litellm_budget_table    TEXT,  -- References budget_id
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by              TEXT,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by              TEXT,
    
    -- Additional fields for end user tracking
    external_user_id        TEXT,
    user_email              TEXT,
    metadata                JSONB DEFAULT '{}',
    last_active_at          TIMESTAMPTZ,
    total_requests          BIGINT DEFAULT 0,
    successful_requests     BIGINT DEFAULT 0,
    failed_requests         BIGINT DEFAULT 0,
    
    -- Constraints
    CONSTRAINT valid_end_user_spend CHECK (spend >= 0.0),
    CONSTRAINT valid_end_user_requests CHECK (
        total_requests >= 0 AND 
        successful_requests >= 0 AND 
        failed_requests >= 0 AND
        total_requests >= (successful_requests + failed_requests)
    ),
    
    -- Foreign keys
    FOREIGN KEY (litellm_budget_table) REFERENCES "LiteLLM_BudgetTable"(budget_id) ON DELETE SET NULL
);

-- Add updated_at triggers
CREATE TRIGGER update_organization_membership_updated_at 
    BEFORE UPDATE ON "LiteLLM_OrganizationMembership" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_membership_updated_at 
    BEFORE UPDATE ON "LiteLLM_TeamMembership" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_end_user_table_updated_at 
    BEFORE UPDATE ON "LiteLLM_EndUserTable" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance

-- Organization Membership indexes
CREATE INDEX IF NOT EXISTS idx_org_membership_user_id ON "LiteLLM_OrganizationMembership"(user_id);
CREATE INDEX IF NOT EXISTS idx_org_membership_organization_id ON "LiteLLM_OrganizationMembership"(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_membership_user_role ON "LiteLLM_OrganizationMembership"(user_role);
CREATE INDEX IF NOT EXISTS idx_org_membership_is_active ON "LiteLLM_OrganizationMembership"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_membership_created_at ON "LiteLLM_OrganizationMembership"(created_at);
CREATE INDEX IF NOT EXISTS idx_org_membership_spend ON "LiteLLM_OrganizationMembership"(spend) WHERE spend > 0;

-- Team Membership indexes
CREATE INDEX IF NOT EXISTS idx_team_membership_user_id ON "LiteLLM_TeamMembership"(user_id);
CREATE INDEX IF NOT EXISTS idx_team_membership_team_id ON "LiteLLM_TeamMembership"(team_id);
CREATE INDEX IF NOT EXISTS idx_team_membership_user_role ON "LiteLLM_TeamMembership"(user_role);
CREATE INDEX IF NOT EXISTS idx_team_membership_is_active ON "LiteLLM_TeamMembership"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_team_membership_created_at ON "LiteLLM_TeamMembership"(created_at);
CREATE INDEX IF NOT EXISTS idx_team_membership_spend ON "LiteLLM_TeamMembership"(spend) WHERE spend > 0;

-- Invitation Link indexes
CREATE INDEX IF NOT EXISTS idx_invitation_link_email ON "LiteLLM_InvitationLink"(email);
CREATE INDEX IF NOT EXISTS idx_invitation_link_organization_id ON "LiteLLM_InvitationLink"(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitation_link_team_id ON "LiteLLM_InvitationLink"(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitation_link_expires_at ON "LiteLLM_InvitationLink"(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_link_is_active ON "LiteLLM_InvitationLink"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invitation_link_created_by ON "LiteLLM_InvitationLink"(created_by);

-- End User Table indexes
CREATE INDEX IF NOT EXISTS idx_end_user_blocked ON "LiteLLM_EndUserTable"(blocked) WHERE blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_end_user_external_id ON "LiteLLM_EndUserTable"(external_user_id) WHERE external_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_end_user_email ON "LiteLLM_EndUserTable"(user_email) WHERE user_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_end_user_spend ON "LiteLLM_EndUserTable"(spend) WHERE spend > 0;
CREATE INDEX IF NOT EXISTS idx_end_user_last_active ON "LiteLLM_EndUserTable"(last_active_at) WHERE last_active_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_end_user_budget ON "LiteLLM_EndUserTable"(litellm_budget_table) WHERE litellm_budget_table IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE "LiteLLM_OrganizationMembership" IS 'User memberships in organizations with roles and permissions';
COMMENT ON COLUMN "LiteLLM_OrganizationMembership".user_role IS 'User role within the organization (OWNER, ADMIN, MEMBER, etc.)';
COMMENT ON COLUMN "LiteLLM_OrganizationMembership".spend IS 'Total spend by this user within this organization';

COMMENT ON TABLE "LiteLLM_TeamMembership" IS 'User memberships in teams with roles and permissions';
COMMENT ON COLUMN "LiteLLM_TeamMembership".user_role IS 'User role within the team (ADMIN, MEMBER, VIEWER)';
COMMENT ON COLUMN "LiteLLM_TeamMembership".spend IS 'Total spend by this user within this team';

COMMENT ON TABLE "LiteLLM_InvitationLink" IS 'Invitation links for user registration and team/organization joining';
COMMENT ON COLUMN "LiteLLM_InvitationLink".invitation_link IS 'Unique invitation link/token';
COMMENT ON COLUMN "LiteLLM_InvitationLink".max_uses IS 'Maximum number of times this invitation can be used';

COMMENT ON TABLE "LiteLLM_EndUserTable" IS 'End users for B2B scenarios with spend tracking and access control';
COMMENT ON COLUMN "LiteLLM_EndUserTable".external_user_id IS 'External system user identifier';
COMMENT ON COLUMN "LiteLLM_EndUserTable".allowed_model_region IS 'Geographic region restrictions for model access';