# 🚀 SeguiFlow — Checklist de Lançamento

> Tudo que precisas fazer para pôr o site a funcionar e a vender.

---

## 📋 PARTE 1 — Contas que tens de criar (esta noite)

### 1. ✅ Stripe — Pagamentos
- Acede a **https://stripe.com**
- Clica "Start now" → cria conta com o teu email
- Preenche com os dados da tua empresa/NIF espanhol
- Adiciona a tua conta bancária espanhola (IBAN)
- Vai a: **Developers → API Keys**
- Copia:
  - `Secret key` → vai para `.env` como `STRIPE_SECRET_KEY`
  - `Publishable key` → vai para `.env` como `STRIPE_PUBLIC_KEY`
- ⚠️ Modo TEST primeiro (chaves `sk_test_...`) — só mudas para live quando testares tudo

### 2. ✅ Painel SMM Wholesale — Fornecedor de seguidores
Regista-te num destes (recomendo o primeiro):

| Site | URL | Registo |
|------|-----|---------|
| SMM World | https://smm-world.com | Grátis |
| Peakerr | https://peakerr.com | Grátis |
| JustAnotherPanel | https://justanotherpanel.com | Grátis |

Após registro:
1. Vai à secção **API** do painel
2. Copia a **API Key** e o **API URL**
3. Vai à lista de serviços → procura Instagram → anota os **IDs dos serviços** que queres oferecer (seguidores BR, curtidas BR, etc.)
4. Carrega créditos no painel (começa com €20–50 para testes)

### 3. ✅ Domínio — Endereço do site
Opções:
- **Namecheap** (https://namecheap.com) — mais barato, ~$10/ano
- **GoDaddy** (https://godaddy.com) — mais fácil, ~€12/ano
- **Registro.br** (https://registro.br) — se queres `.com.br`, ~R$40/ano

Sugestões de nome:
- seguiflow.com.br
- seguiflow.net
- seguiflow.app
- seguidoresbr.com

### 4. ✅ Hosting — Onde o servidor vai rodar
Opção mais fácil: **Railway.app**
1. Acede a **https://railway.app**
2. Login com GitHub (cria conta GitHub se não tens)
3. Cria novo projeto → "Deploy from GitHub repo"
4. Custo: ~$5/mês (plano Hobby)

Alternativa gratuita: **Render.com**
1. Acede a **https://render.com**
2. "New Web Service" → conecta GitHub
3. Plano grátis (pode dormir após inatividade)

---

## 📋 PARTE 2 — Configuração técnica (30 minutos)

### 5. Node.js no teu Mac
```
https://nodejs.org → Download versão LTS → Instalar
```

### 6. Instalar dependências
Abre o Terminal, navega até à pasta SeguiFlow:
```bash
cd ~/Documents/Obsidian\ Vault/Projetos/SeguiFlow
npm install
```

### 7. Configurar o .env
```bash
cp .env.example .env
```
Abre o `.env` e preenche com as chaves do Stripe + SMM:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
JWT_SECRET=qualquer_coisa_longa_e_aleatoria_aqui_123
APP_URL=http://localhost:3000

SMM_API_URL=https://smm-world.com/api/v2
SMM_API_KEY=a_tua_chave_api
SMM_SERVICE_SEGUIDORES_100=123   ← ID do serviço no painel SMM
SMM_SERVICE_SEGUIDORES_500=124
...
```

### 8. Testar localmente
```bash
npm start
```
Abre: **http://localhost:3000**
- Faz um pedido de teste com cartão de teste Stripe: `4242 4242 4242 4242`
- Verifica que o pedido aparece no painel admin

### 9. Webhook Stripe (para pagamentos automáticos)
```bash
# Instala o Stripe CLI
brew install stripe/stripe-cli/stripe

# Liga o webhook ao servidor local (para testar)
stripe listen --forward-to localhost:3000/api/webhook/stripe
```
Copia o `webhook signing secret` (começa com `whsec_`) → mete no `.env`

---

## 📋 PARTE 3 — Publicar online

### 10. Subir para GitHub
```bash
cd ~/Documents/Obsidian\ Vault/Projetos/SeguiFlow
git init
git add .
git commit -m "SeguiFlow v1.0"
```
Cria repo no GitHub → `git push`

### 11. Deploy no Railway
1. railway.app → New Project → Deploy from GitHub
2. Seleciona o repo SeguiFlow
3. Railway detecta Node.js automaticamente
4. Em "Variables" → adiciona todas as variáveis do `.env`
5. Muda `APP_URL` para o URL do Railway (ex: `https://seguiflow-production.up.railway.app`)

### 12. Apontar domínio
No Railway → Settings → Domains → Custom Domain
Adiciona o teu domínio → Railway dá-te os registos DNS
Vai ao Namecheap/GoDaddy → adiciona os registos CNAME/A

### 13. Webhook Stripe em produção
1. Stripe Dashboard → Developers → Webhooks
2. "Add endpoint" → URL: `https://teu-dominio.com/api/webhook/stripe`
3. Eventos: `checkout.session.completed`
4. Copia o webhook secret → muda no Railway Variables

---

## 🎨 PARTE 4 — Melhorias inspiradas no FollowTurbo (implementar depois)

O FollowTurbo tem features que aumentam muito as vendas. Aqui está o que podes copiar:

### Alta prioridade (impacto direto em vendas):
- [ ] **Preço riscado**: Mostrar preço original cortado (ex: ~~R$169~~ → R$87) — aumenta percepção de desconto
- [ ] **Nomes de pacotes**: Amador → Básico → Turbinado → Bronze → Prata → Ouro → Diamante (aspira)
- [ ] **Bônus grátis**: Cada pacote de seguidores incluir curtidas + visualizações de bônus (custo baixo, valor percebido alto)
- [ ] **Badge "🔥 Mais Vendido"**: Destacar 1 pacote como o mais popular
- [ ] **Entrega gradual vs imediata**: Dar ao cliente opção de escolher velocidade de entrega
- [ ] **Teste grátis**: 25 seguidores grátis para experimentar — capta email e converte depois
- [ ] **Range de entrega**: "500 a 750 seguidores" em vez de "500 exatos" (gestão de expectativas)

### Média prioridade (credibilidade):
- [ ] **Seção "Na mídia"**: Logos de sites que mencionaram o SeguiFlow
- [ ] **Avaliação com estrelas**: Exibir nota (ex: ⭐ 4.87 / 5.0) com número de avaliações
- [ ] **Depoimentos em vídeo**: Clientes reais no YouTube, embutidos no site
- [ ] **Reclame Aqui**: Criar perfil e responder avaliações — gera confiança
- [ ] **Badges de segurança**: Google Safe Browsing + SSL verificado (links para checar)
- [ ] **WhatsApp de suporte**: Botão flutuante com link direto para WhatsApp

### Baixa prioridade (tráfego orgânico):
- [ ] **Ferramentas grátis**: Baixar vídeo/foto/reels do Instagram — gera tráfego SEO
- [ ] **Blog**: Artigos "como crescer no Instagram" — SEO de longo prazo
- [ ] **Garantia de reposição (Refil)**: Se seguidores caírem em 15 dias, repõe grátis

---

## 💰 Margem de Lucro Estimada

| Pacote SeguiFlow | Preço Venda | Custo SMM | Lucro |
|-----------------|------------|-----------|-------|
| 100 seguidores | R$14,90 | ~R$2 | ~R$12 |
| 500 seguidores | R$49,90 | ~R$8 | ~R$41 |
| 1000 seguidores | R$89,90 | ~R$15 | ~R$74 |
| 100 curtidas | R$12,90 | ~R$1 | ~R$11 |
| 500 curtidas | R$44,90 | ~R$5 | ~R$39 |

Margem média: **~80%**

---

## 📅 Ordem recomendada para esta noite

1. **Criar conta Stripe** (15 min)
2. **Criar conta num painel SMM** (10 min)
3. **Instalar Node.js + npm install** (5 min)
4. **Preencher .env + testar local** (20 min)
5. **Criar conta Railway + fazer deploy** (15 min)
6. **Comprar domínio + apontar** (10 min)
7. **Configurar webhook Stripe em produção** (10 min)

**Total estimado: ~1h30**

Depois disto o site está a vender. As melhorias do FollowTurbo podes fazer ao longo da semana.
