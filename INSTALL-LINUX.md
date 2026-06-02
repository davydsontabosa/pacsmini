# 🏥 PACS Mini — Guia de Instalação no Linux com Docker
### *Do zero ao sistema funcionando, passo a passo, sem mistério*

> **Para quem é este guia?**
> Para qualquer pessoa que precise instalar o PACS Mini em um servidor Linux.
> Não precisa ser especialista em Docker. Só precisa saber digitar comandos.

---

```
  ██████╗  █████╗  ██████╗███████╗    ███╗   ███╗██╗███╗   ██╗██╗
  ██╔══██╗██╔══██╗██╔════╝██╔════╝    ████╗ ████║██║████╗  ██║██║
  ██████╔╝███████║██║     ███████╗    ██╔████╔██║██║██╔██╗ ██║██║
  ██╔═══╝ ██╔══██║██║     ╚════██║    ██║╚██╔╝██║██║██║╚██╗██║██║
  ██║     ██║  ██║╚██████╗███████║    ██║ ╚═╝ ██║██║██║ ╚████║██║
  ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝    ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝
```

---

## 📋 O que vamos instalar?

O PACS Mini é um sistema completo para gerenciar imagens médicas (DICOM).
Ele é composto por **5 peças** que trabalham juntas como uma orquestra:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🌐 Seu navegador                                          │
│         │                                                   │
│         ▼                                                   │
│   🖥️  pacs-web  (nginx, porta 80)                          │
│   └─ A tela bonita que você vai usar                        │
│         │                                                   │
│         ▼                                                   │
│   ⚙️  pacs-server  (Node.js, porta 3500)                    │
│   └─ O cérebro que processa tudo                            │
│         │                                                   │
│         ▼                                                   │
│   🏛️  dcm4chee  (WildFly, porta 8080)                      │
│   └─ O servidor DICOM                                       │
│         │                                                   │
│       ┌─┴─┐                                                 │
│       ▼   ▼                                                 │
│   📁 ldap  🗄️ postgresql                                    │
│   └─ Configurações  └─ Banco de imagens                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Quanto tempo leva?

| Etapa | Tempo estimado |
|-------|---------------|
| Instalar Docker | 5 minutos |
| Clonar e configurar | 10 minutos |
| Build das imagens | 10–20 minutos (depende da internet) |
| Subir os containers | 5 minutos |
| dcm4chee inicializar | 3–5 minutos |
| **Total** | **~40 minutos** |

---

## 🖥️ O que você precisa ter

### Servidor mínimo (produção real)

| O quê | Mínimo | Confortável |
|-------|--------|-------------|
| CPU | 4 núcleos | 8 núcleos |
| RAM | 8 GB | 16 GB |
| Disco | 100 GB SSD | 1 TB+ SSD |
| Sistema | Ubuntu 22.04 | Ubuntu 24.04 LTS |

> 💡 **Dica:** Para testar em casa, um PC com 8 GB de RAM já funciona.

### Portas que precisam estar livres

```
Porta  80   → Site do PACS Mini (HTTP)
Porta  443  → Site do PACS Mini (HTTPS - opcional mas recomendado)
Porta  3500 → API backend
Porta  8080 → dcm4chee (servidor DICOM)
Porta  11112→ Receber exames DICOM de aparelhos
```

---

## 🚀 Vamos começar!

---

### PASSO 1 — Acesse seu servidor Linux

Abra um terminal ou conecte via SSH:

```bash
ssh usuario@192.168.1.100
```

> Se for instalação local, apenas abra o terminal mesmo.

Primeiro, certifique-se de que está com o sistema atualizado:

```bash
sudo apt update && sudo apt upgrade -y
```

☕ *Pode ir buscar um café enquanto isso roda...*

---

### PASSO 2 — Instale o Docker

O Docker é como uma caixa mágica que roda aplicações sem precisar instalar mil dependências.

```bash
# Baixa e executa o instalador oficial do Docker
curl -fsSL https://get.docker.com | sh
```

Aguarde terminar. Depois, adicione seu usuário ao grupo docker (para não precisar de `sudo` toda hora):

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Verifique se funcionou:**

```bash
docker --version
docker compose version
```

Você deve ver algo assim:
```
Docker version 27.x.x
Docker Compose version v2.x.x
```

> ✅ Se apareceu a versão, Docker instalado com sucesso!

> ❌ Se deu erro, tente reiniciar o servidor: `sudo reboot`

---

### PASSO 3 — Baixe o PACS Mini

```bash
# Entre na pasta onde quer instalar (sugestão: /opt)
cd /opt

# Baixe o projeto
git clone https://github.com/davydsontabosa/pacsmini.git pacs-mini

# Entre na pasta
cd pacs-mini
```

> 💡 Não tem git? Instale com: `sudo apt install git -y`

---

### PASSO 4 — Abra o firewall

Se o seu servidor tem firewall ativo (Ubuntu com UFW), libere as portas necessárias:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3500/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 11112/tcp
sudo ufw reload
sudo ufw status
```

Deve aparecer algo assim:
```
Status: active
80/tcp    ALLOW
443/tcp   ALLOW
3500/tcp  ALLOW
8080/tcp  ALLOW
11112/tcp ALLOW
```

---

### PASSO 5 — Configure o ambiente

Esta é a parte mais importante. Você vai criar um arquivo `.env` com as configurações do seu servidor.

**Primeiro, descubra o IP do seu servidor:**

```bash
hostname -I | awk '{print $1}'
# Ex: 192.168.1.100
```

**Agora crie o arquivo de configuração:**

```bash
cp .env.example .env
nano .env
```

Um editor de texto vai abrir. Preencha os campos abaixo substituindo pelos seus valores:

```env
# ════════════════════════════════════════
#  CONFIGURAÇÕES OBRIGATÓRIAS
# ════════════════════════════════════════

# Chave secreta da API (NUNCA compartilhe isso!)
# Gere uma chave forte automaticamente:
API_SECRET=coloque-aqui-uma-chave-muito-longa-e-secreta-32chars

# Senha do banco de dados PostgreSQL
POSTGRES_PASSWORD=outra-senha-forte-aqui

# ════════════════════════════════════════
#  ENDEREÇOS DO SERVIDOR  ← Mude para o IP do seu servidor!
# ════════════════════════════════════════

FRONTEND_URL=http://192.168.1.100
SERVER_PUBLIC_URL=http://192.168.1.100:3500
DCM4CHEE_PUBLIC_HOST=192.168.1.100
SHARE_BASE_URL=http://192.168.1.100

# ════════════════════════════════════════
#  EMAIL (para alertas e compartilhamentos)
# ════════════════════════════════════════

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seuemail@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=PACS Mini <seuemail@gmail.com>
EMAIL_ALERT_TO=admin@suaclinica.com
```

**Para salvar no nano:** `Ctrl+O` → Enter → `Ctrl+X`

> 💡 **Dica para gerar chaves seguras:**
> ```bash
> # Gera API_SECRET forte automaticamente
> openssl rand -hex 32
>
> # Gera POSTGRES_PASSWORD forte automaticamente
> openssl rand -hex 20
> ```
> Copie a saída e cole no `.env`

> 📧 **Sobre o Gmail:** Para usar o Gmail como servidor de email,
> você precisa de uma "App Password" (Senha de App), não a senha normal.
> Acesse: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

---

### PASSO 6 — Construa as imagens Docker

Agora o Docker vai baixar e preparar tudo que precisa. Isso pode demorar um pouco na primeira vez.

```bash
docker compose build
```

Você vai ver muitas linhas passando. Isso é normal! O Docker está:
- 📥 Baixando o Node.js
- 📥 Baixando o Nginx
- 📦 Instalando dependências
- 🔨 Compilando o frontend e o backend

> ⏳ *Aguarde terminar. Pode demorar 10–20 minutos dependendo da internet.*

Quando terminar, você verá:
```
✔ pacs-server  Built
✔ pacs-web     Built
```

---

### PASSO 7 — Suba os containers

```bash
docker compose up -d
```

A flag `-d` significa "em background" — os containers rodam sem travar o terminal.

**Verifique se estão rodando:**

```bash
docker compose ps
```

Você verá algo assim:
```
NAME           STATUS
pacs-web       Up (healthy)
pacs-server    Up (healthy)
arc            Up (starting)   ← Esse demora mais!
db             Up (healthy)
ldap           Up (healthy)
```

> ⚠️ O `arc` (dcm4chee) vai ficar como `starting` por 3–5 minutos.
> Isso é completamente normal! O WildFly precisa de tempo para inicializar.

---

### PASSO 8 — Acompanhe a inicialização do dcm4chee

```bash
docker compose logs -f arc
```

Você vai ver muitas linhas de log. **Aguarde até aparecer esta linha:**

```
WildFly Full 26.x.x ... started in Xs
```

Quando aparecer, pressione `Ctrl+C` para sair dos logs.

---

### PASSO 9 — Verifique se tudo está funcionando

```bash
# Backend respondendo?
curl http://localhost:3500/health

# Resultado esperado:
# {"ok":true,"version":"2.0.0","env":"production"}
```

```bash
# Todos os containers saudáveis?
docker compose ps
```

Todos devem mostrar `Up (healthy)`.

---

### PASSO 10 — Acesse o sistema! 🎉

Abra o navegador e acesse:

```
http://192.168.1.100
       ↑
    IP do seu servidor
```

Você verá a tela inicial do **PACS Mini**!

**Primeira configuração no navegador:**

1. Clique em **⚙️ Configurações** no menu lateral
2. Em **"Conexão dcm4chee"**, preencha:
   - IP/Hostname: `192.168.1.100`
   - Porta: `8080`
   - AE Title: `DCM4CHEE`
3. Clique em **Testar Conexão** → deve aparecer ✅
4. Em **"Servidor PACS Mini"**, preencha:
   - URL do Servidor: `http://192.168.1.100:3500`
   - API Secret: *(o mesmo valor do `API_SECRET` no `.env`)*
5. Clique em **Testar Conexão** → deve aparecer ✅
6. Clique em **Salvar** nos dois blocos

---

## 🔐 Segurança — Faça isso agora!

### Troque a senha do dcm4chee

O dcm4chee vem com a senha padrão `admin` — troque imediatamente!

```
http://192.168.1.100:8080/dcm4chee-arc/ui
Usuário: admin
Senha:   admin
```

Após logar: **Security → Users → admin → Change Password**

### Checklist de segurança

```
[ ] API_SECRET é forte (≥32 chars, gerado com openssl)?
[ ] POSTGRES_PASSWORD foi alterado?
[ ] Senha do dcm4chee foi trocada?
[ ] Portas desnecessárias estão fechadas no firewall?
[ ] Backup automático está configurado?
```

---

## 💾 Configure o Backup Automático

```bash
# Torne o script executável
chmod +x scripts/backup.sh

# Execute um backup manual para testar
./scripts/backup.sh

# Configure backup automático todo dia às 3h da manhã
crontab -e
```

No editor que abrir, adicione esta linha no final:

```
0 3 * * * cd /opt/pacs-mini && ./scripts/backup.sh >> ./backups/backup.log 2>&1
```

Salve e feche. Os backups ficam em `./backups/`.

---

## 🆘 Algo deu errado? Não entre em pânico!

### O container não inicia

```bash
# Veja o que aconteceu
docker compose logs pacs-server
docker compose logs arc
```

### "Cannot connect to dcm4chee"

- Aguarde mais 2–3 minutos. O dcm4chee é lento para iniciar.
- Verifique: `docker compose ps` — o `arc` está `healthy`?

### "Network Error" no site

- O pacs-server está rodando? `curl http://localhost:3500/health`
- O IP no `.env` está correto? Confira com `hostname -I`
- Reinicie: `docker compose restart pacs-server pacs-web`

### A porta já está em uso

```bash
# Descubra quem está usando
sudo lsof -i :3500
sudo lsof -i :8080

# Ou mude a porta no .env:
SERVER_PORT=3501
ARC_HTTP_PORT=8081
```

### Preciso reiniciar tudo do zero

```bash
# Para tudo (não apaga dados)
docker compose down

# Reconstrói e sobe tudo
docker compose build --no-cache
docker compose up -d
```

### Preciso apagar TUDO e começar do zero

```bash
# ⚠️ ATENÇÃO: isso apaga todos os dados!
docker compose down -v
docker compose up -d --build
```

---

## 🔄 Comandos do dia a dia

```bash
# Ver se tudo está rodando
docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f pacs-server

# Parar tudo
docker compose down

# Iniciar tudo
docker compose up -d

# Reiniciar um serviço
docker compose restart pacs-server

# Atualizar (após nova versão)
git pull
docker compose build
docker compose up -d

# Fazer backup agora
./scripts/backup.sh

# Ver uso de espaço em disco
docker system df -v
```

---

## 📦 Estrutura do Projeto

```
pacs-mini/
│
├── 📄 .env                ← Suas configurações (NUNCA suba isso pro git!)
├── 📄 .env.example        ← Modelo de configuração
├── 📄 docker-compose.yml  ← Orquestração de todos os containers
│
├── 📁 packages/
│   ├── 📁 server/         ← Backend Node.js/Express
│   │   └── 📁 data/       ← Banco SQLite (compartilhamentos, alertas, médicos)
│   └── 📁 web/            ← Frontend React
│
├── 📁 scripts/
│   ├── 🔧 setup.sh        ← Configuração inicial
│   ├── 💾 backup.sh       ← Faz backup do banco
│   └── 🔄 restore.sh      ← Restaura backup
│
└── 📁 backups/            ← Backups automáticos ficam aqui
```

---

## 📞 Resumo de Endereços

Após a instalação, substitua `192.168.1.100` pelo IP do seu servidor:

| O quê | Endereço |
|-------|---------|
| 🌐 Interface Web | `http://192.168.1.100` |
| ⚙️ API Backend | `http://192.168.1.100:3500/health` |
| 🏛️ Admin dcm4chee | `http://192.168.1.100:8080/dcm4chee-arc/ui` |
| 📡 Porta DICOM | `192.168.1.100:11112` |

---

## ✅ Checklist Final

```
[ ] Docker instalado e funcionando
[ ] Repositório clonado em /opt/pacs-mini
[ ] Arquivo .env configurado com seu IP e chaves fortes
[ ] docker compose up -d executado com sucesso
[ ] Todos os containers com status "healthy"
[ ] curl http://localhost:3500/health retornou {"ok":true}
[ ] Site abriu no navegador
[ ] Conexão testada e salva nas Configurações
[ ] Senha do dcm4chee trocada
[ ] Backup automático configurado no crontab
```

**Se todos os itens estão marcados — parabéns, o PACS Mini está no ar!** 🎊

---

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   PACS Mini v2.0  ·  Pronto para uso clínico             ║
║                                                           ║
║   Desenvolvido para clínicas e hospitais que precisam     ║
║   de uma interface moderna para o dcm4chee Archive 5.     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

*Guia de Instalação Linux — PACS Mini v2.0 · Revisão 2026*
