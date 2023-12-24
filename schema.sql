CREATE TABLE cards (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	card_uid TEXT UNIQUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	message TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE card_allowances (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	card_id INTEGER,
	allowance_date DATE,
	type TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	card_allowance_id INTEGER UNIQUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX card_id_idx ON card_allowances(card_id);
CREATE INDEX card_allowance_idx ON card_allowances(card_id, allowance_date, type);