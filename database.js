const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'seguiflow.db');
const db = new Database(dbPath);

// Habilitar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    instagram_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    smm_order_id TEXT,
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_uuid TEXT NOT NULL,
    mp_payment_id TEXT,
    mp_preference_id TEXT,
    amount REAL NOT NULL,
    method TEXT,
    status TEXT DEFAULT 'pending',
    pix_qr_code TEXT,
    pix_qr_code_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    service_type TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    original_price REAL,
    popular INTEGER DEFAULT 0,
    smm_service_id TEXT,
    active INTEGER DEFAULT 1
  );
`);

// Inserir pacotes padrão se não existirem
const existingPackages = db.prepare('SELECT COUNT(*) as count FROM packages').get();
if (existingPackages.count === 0) {
  const insertPackage = db.prepare(`
    INSERT INTO packages (id, service_type, name, quantity, price, original_price, popular, smm_service_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const packages = [
    // Seguidores
    ['seg-100',  'seguidores', '100 Seguidores Brasileiros',  100,  14.90, 19.90, 0, 'SMM_SERVICE_SEGUIDORES_100'],
    ['seg-250',  'seguidores', '250 Seguidores Brasileiros',  250,  29.90, 39.90, 0, 'SMM_SERVICE_SEGUIDORES_100'],
    ['seg-500',  'seguidores', '500 Seguidores Brasileiros',  500,  49.90, 69.90, 1, 'SMM_SERVICE_SEGUIDORES_500'],
    ['seg-1000', 'seguidores', '1.000 Seguidores Brasileiros', 1000, 89.90, 119.90, 0, 'SMM_SERVICE_SEGUIDORES_1000'],
    ['seg-2500', 'seguidores', '2.500 Seguidores Brasileiros', 2500, 199.90, 259.90, 0, 'SMM_SERVICE_SEGUIDORES_1000'],
    ['seg-5000', 'seguidores', '5.000 Seguidores Brasileiros', 5000, 349.90, 449.90, 0, 'SMM_SERVICE_SEGUIDORES_1000'],
    // Curtidas
    ['cur-50',   'curtidas', '50 Curtidas Brasileiras',   50,  7.90, 12.90, 0, 'SMM_SERVICE_CURTIDAS_50'],
    ['cur-100',  'curtidas', '100 Curtidas Brasileiras',  100, 12.90, 19.90, 0, 'SMM_SERVICE_CURTIDAS_100'],
    ['cur-250',  'curtidas', '250 Curtidas Brasileiras',  250, 24.90, 34.90, 1, 'SMM_SERVICE_CURTIDAS_100'],
    ['cur-500',  'curtidas', '500 Curtidas Brasileiras',  500, 44.90, 59.90, 0, 'SMM_SERVICE_CURTIDAS_500'],
    ['cur-1000', 'curtidas', '1.000 Curtidas Brasileiras', 1000, 79.90, 99.90, 0, 'SMM_SERVICE_CURTIDAS_500'],
    // Comentários
    ['com-10',  'comentarios', '10 Comentários Reais',  10,  19.90, 29.90, 0, 'SMM_SERVICE_COMENTARIOS_10'],
    ['com-25',  'comentarios', '25 Comentários Reais',  25,  39.90, 59.90, 1, 'SMM_SERVICE_COMENTARIOS_10'],
    ['com-50',  'comentarios', '50 Comentários Reais',  50,  69.90, 99.90, 0, 'SMM_SERVICE_COMENTARIOS_50'],
    ['com-100', 'comentarios', '100 Comentários Reais', 100, 129.90, 179.90, 0, 'SMM_SERVICE_COMENTARIOS_50'],
  ];

  const insertMany = db.transaction((pkgs) => {
    for (const pkg of pkgs) insertPackage.run(...pkg);
  });
  insertMany(packages);
  console.log('✅ Pacotes padrão criados');
}

// Criar admin padrão se não existir
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
  `).run('Admin', 'admin@seguiflow.com', hash, 'admin');
  console.log('✅ Admin criado: admin@seguiflow.com / admin123');
}

module.exports = db;
