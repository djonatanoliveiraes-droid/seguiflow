# 🚀 SeguiFlow — Como arrancar

## 1. Instalar Node.js (se não tiver)
https://nodejs.org → descarregar versão LTS

## 2. Instalar dependências
Abre o Terminal na pasta `SeguiFlow` e corre:
```bash
npm install
```

## 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Abre o `.env` e preenche:

### Stripe (conta espanhola ✅)
1. Acede a https://dashboard.stripe.com
2. Regista-te com a tua conta/empresa espanhola
3. Vai a Developers → API Keys
4. Copia o `Secret key` e o `Publishable key`

### API SMM (entrega de seguidores)
1. Regista-te num painel SMM wholesale:
   - https://smm-world.com (recomendado)
   - https://peakerr.com
   - https://justanotherpanel.com
2. Compra créditos no painel
3. Copia a API Key e o URL da API
4. Anota os IDs dos serviços que quiseres oferecer

## 4. Arrancar o servidor
```bash
npm start
```
Abre o browser em: **http://localhost:3000**

## 5. Login admin
- Email: `admin@seguiflow.com`
- Senha: `admin123`
⚠️ Muda esta senha depois do primeiro login!

## 6. Webhook Stripe (para pagamentos automáticos)
Para receber confirmações de pagamento:
1. Instala o Stripe CLI: https://stripe.com/docs/stripe-cli
2. Corre: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
3. Copia o `webhook signing secret` para o `.env`

## 7. Publicar online (para clientes acederem)
Opções gratuitas/baratas:
- **Railway.app** (recomendo — fácil, ~$5/mês)
- **Render.com** (plano gratuito disponível)
- **VPS Hetzner** (~€4/mês, baseado na Europa)

---

## 💰 Como funciona o negócio

1. Cliente acede ao site → escolhe pacote → paga via Stripe
2. Stripe confirma pagamento → servidor recebe webhook
3. Servidor envia pedido para API SMM wholesale
4. SMM entrega os seguidores/curtidas/comentários
5. **Tu ficas com a diferença** (ex: compras por €0,05/seguidor, vendes por €0,15)

### Margem de exemplo:
| Pacote | Custo SMM | Preço Venda | Lucro |
|--------|-----------|-------------|-------|
| 500 seguidores | ~€3 | R$49,90 (~€8) | ~€5 |
| 1000 curtidas | ~€2 | R$79,90 (~€13) | ~€11 |

---

## 📁 Estrutura do projeto
```
SeguiFlow/
├── server.js          ← Backend Node.js
├── database.js        ← Base de dados SQLite
├── package.json       ← Dependências
├── .env               ← Configurações (não partilhar!)
├── .env.example       ← Template das configurações
└── public/
    └── index.html     ← Frontend completo (landing + dashboard)
```
