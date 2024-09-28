CREATE TABLE simulations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    env_id TEXT NOT NULL,
    data_hash TEXT NOT NULL,
    data JSON NOT NULL,
    result REAL NOT NULL,
    summary JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);