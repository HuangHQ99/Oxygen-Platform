CREATE TABLE platform_baseline (
    id smallint PRIMARY KEY,
    installed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT platform_baseline_singleton CHECK (id = 1)
);

INSERT INTO platform_baseline (id) VALUES (1);
