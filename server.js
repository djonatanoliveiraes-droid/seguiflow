require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const path = require('path');
const db = require('./database');
const Stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seguiflow_secret_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MIDDLEWARE AUTH ─────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token obrigatório' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    next();
  });
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter mínimo 6 caracteres' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
  const user = db.prepare('SELECT id, name, email, role, balance FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Email ou senha incorretos' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, balance, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ─── PACKAGES ROUTES ─────────────────────────────────────────────────────────

app.get('/api/packages', (req, res) => {
  const { type } = req.query;
  let query = 'SELECT * FROM packages WHERE active = 1';
  const params = [];
  if (type) { query += ' AND service_type = ?'; params.push(type); }
  const packages = db.prepare(query).all(...params);
  res.json(packages);
});

app.post('/api/packages', adminMiddleware, (req, res) => {
  const { id, service_type, name, quantity, price, original_price, popular, smm_service_id } = req.body;
  db.prepare(`INSERT INTO packages (id, service_type, name, quantity, price, original_price, popular, smm_service_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, service_type, name, quantity, price, original_price || null, popular || 0, smm_service_id || null);
  res.json({ success: true });
});

app.put('/api/packages/:id', adminMiddleware, (req, res) => {
  const { name, quantity, price, original_price, popular, active } = req.body;
  db.prepare('UPDATE packages SET name=?, quantity=?, price=?, original_price=?, popular=?, active=? WHERE id=?')
    .run(name, quantity, price, original_price, popular, active, req.params.id);
  res.json({ success: true });
});

// ─── ORDERS ROUTES ───────────────────────────────────────────────────────────

app.post('/api/orders', authMiddleware, async (req, res) => {
  const { package_id, instagram_url } = req.body;
  if (!package_id || !instagram_url) return res.status(400).json({ error: 'Dados incompletos' });

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND active = 1').get(package_id);
  if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado' });

  const orderUuid = uuidv4();

  db.prepare(`INSERT INTO orders (uuid, user_id, service_type, package_id, package_name, quantity, price, instagram_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')`
  ).run(orderUuid, req.user.id, pkg.service_type, pkg.id, pkg.name, pkg.quantity, pkg.price, instagram_url);

  // Criar preferência MercadoPago
  try {
    const stripeSession = await createStripeSession(orderUuid, pkg, req.user);
    res.json({ order_uuid: orderUuid, payment: stripeSession });
  } catch (err) {
    console.error('MP Error:', err);
    res.status(500).json({ error: 'Erro ao criar pagamento. Tente novamente.' });
  }
});

app.get('/api/orders', authMiddleware, (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    orders = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 100
    `).all();
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  }
  res.json(orders);
});

app.get('/api/orders/:uuid', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE uuid = ?').get(req.params.uuid);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  if (order.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Acesso negado' });
  res.json(order);
});

// ─── STRIPE ──────────────────────────────────────────────────────────────────

async function createStripeSession(orderUuid, pkg, user) {
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';

  if (!Stripe) {
    // Modo demo sem Stripe configurado
    db.prepare(`INSERT INTO payments (order_uuid, mp_preference_id, amount, status)
      VALUES (?, ?, ?, 'pending')`
    ).run(orderUuid, 'demo-' + orderUuid, pkg.price);
    return { mode: 'demo', init_point: '#' };
  }

  const session = await Stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'brl',
        product_data: { name: pkg.name, description: `${pkg.quantity} ${pkg.service_type} — SeguiFlow` },
        unit_amount: Math.round(pkg.price * 100)
      },
      quantity: 1
    }],
    mode: 'payment',
    customer_email: user.email,
    metadata: { order_uuid: orderUuid },
    success_url: `${APP_URL}/dashboard?payment=success`,
    cancel_url: `${APP_URL}/?payment=cancelled`,
    payment_intent_data: { metadata: { order_uuid: orderUuid } }
  });

  db.prepare(`INSERT INTO payments (order_uuid, mp_preference_id, amount, status)
    VALUES (?, ?, ?, 'pending')`
  ).run(orderUuid, session.id, pkg.price);

  return { session_id: session.id, init_point: session.url };
}

// ─── WEBHOOK STRIPE ──────────────────────────────────────────────────────────

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = Stripe
      ? Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
      : JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send('Webhook error: ' + err.message);
  }

  res.sendStatus(200);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderUuid = session.metadata?.order_uuid;
    if (!orderUuid) return;

    const order = db.prepare('SELECT * FROM orders WHERE uuid = ?').get(orderUuid);
    if (order && order.payment_status !== 'approved') {
      db.prepare('UPDATE orders SET payment_status = ?, payment_id = ?, status = ? WHERE uuid = ?')
        .run('approved', session.payment_intent, 'processing', orderUuid);
      db.prepare('UPDATE payments SET status = ?, mp_payment_id = ? WHERE order_uuid = ?')
        .run('approved', session.payment_intent, orderUuid);
      await submitToSMM(order);
    }
  }
});

// ─── SMM API INTEGRATION ─────────────────────────────────────────────────────

async function submitToSMM(order) {
  const SMM_API_URL = process.env.SMM_API_URL;
  const SMM_API_KEY = process.env.SMM_API_KEY;

  if (!SMM_API_URL || !SMM_API_KEY) {
    // Modo demo — simula entrega em 5 minutos
    console.log(`[DEMO] Pedido ${order.uuid} seria enviado para API SMM`);
    setTimeout(() => {
      db.prepare('UPDATE orders SET status = ?, smm_order_id = ? WHERE uuid = ?')
        .run('completed', 'demo-' + Date.now(), order.uuid);
    }, 5 * 60 * 1000);
    return;
  }

  // Buscar service ID do pacote
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(order.package_id);
  const serviceId = process.env[pkg.smm_service_id];

  const response = await fetch(SMM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: SMM_API_KEY,
      action: 'add',
      service: serviceId,
      link: order.instagram_url,
      quantity: order.quantity
    })
  });

  const result = await response.json();
  if (result.order) {
    db.prepare('UPDATE orders SET smm_order_id = ?, status = ? WHERE uuid = ?')
      .run(String(result.order), 'processing', order.uuid);
  }
}

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

app.get('/api/admin/stats', adminMiddleware, (req, res) => {
  const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get().count;
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'client'").get().count;
  const totalRevenue = db.prepare("SELECT SUM(price) as total FROM orders WHERE payment_status = 'approved'").get().total || 0;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'processing' OR status = 'awaiting_payment'").get().count;
  res.json({ totalOrders, totalUsers, totalRevenue, pendingOrders });
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, balance, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

app.put('/api/admin/orders/:uuid', adminMiddleware, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?').run(status, req.params.uuid);
  res.json({ success: true });
});

// ─── SERVE SPA ───────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 SeguiFlow rodando em http://localhost:${PORT}`);
  console.log(`📊 Admin: admin@seguiflow.com / admin123\n`);
});
