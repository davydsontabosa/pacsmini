# PACS Mini — Guia de Instalação Completo

> **Versão:** 2.0.0 | **dcm4chee:** 5.34.3 | **Revisão:** 2026-06

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Pré-Requisitos](#2-pré-requisitos)
3. [Instalação Rápida (Docker)](#3-instalação-rápida-docker)
4. [Instalação Manual (Desenvolvimento)](#4-instalação-manual-desenvolvimento)
5. [Configuração de Variáveis de Ambiente](#5-configuração-de-variáveis-de-ambiente)
6. [Iniciando os Serviços](#6-iniciando-os-serviços)
7. [Acesso ao Sistema](#7-acesso-ao-sistema)
8. [Credenciais Padrão](#8-credenciais-padrão)
9. [Recomendações de Segurança](#9-recomendações-de-segurança)
10. [Backup e Restauração](#10-backup-e-restauração)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Visão Geral do Sistema

O **PACS Mini** é uma plataforma de gerenciamento de imagens DICOM composta por:

| Componente       | Tecnologia              | Porta  | Descrição                          |
|------------------|-------------------------|--------|------------------------------------|
| `ldap`           | OpenLDAP dcm4che        | 389    | Configuração do dcm4chee           |
| `db`             | PostgreSQL 17.4         | 5432   | Banco do dcm4chee                  |
| `arc`            | dcm4chee Archive 5.34.3 | 8080   | DICOM Server / REST API            |
| `pacs-server`    | Node.js 22 / Express    | 3500   | API do PACS Mini                   |
| `pacs-web`       | React + Nginx           | 80     | Interface Web                      |

**Arquitetura:**
```
Navegador → Nginx (80) → [React SPA]
Navegador → pacs-server (3500) → SQLite
Navegador → dcm4chee (8080) → DICOM REST API
pacs-server → dcm4chee (interno: arc:8080)
```

---

## 2. Pré-Requisitos

### 2.1 Requisitos de Hardware (Produção Recomendado)

| Recurso | Mínimo      | Recomendado  |
|---------|-------------|--------------|
| CPU     | 4 cores     | 8 cores      |
| RAM     | 8 GB        | 16 GB        |
| Disco   | 100 GB SSD  | 1 TB+ SSD    |
| OS      | Ubuntu 22.04 / Debian 12 | Ubuntu 24.04 |

### 2.2 Software Necessário

```bash
# Docker Engine 24+ e Docker Compose V2
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar versões
docker --version          # Docker version 24.x ou superior
docker compose version    # Docker Compose version v2.x
```

### 2.3 Portas Necessárias (Firewall)

| Porta | Protocolo | Serviço         | Obrigatório |
|-------|-----------|-----------------|-------------|
| 80    | TCP/HTTP  | Interface Web   | ✅ Sim      |
| 443   | TCP/HTTPS | Interface Web   | Recomendado |
| 3500  | TCP       | API Backend     | ✅ Sim      |
| 8080  | TCP       | dcm4chee REST   | ✅ Sim      |
| 11112 | TCP       | DICOM C-STORE   | ✅ Sim      |

```bash
# Ubuntu/Debian com UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3500/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 11112/tcp
sudo ufw reload
```

---

## 3. Instalação Rápida (Docker)

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/sua-org/pacs-mini.git
cd pacs-mini
```

### Passo 2 — Executar o script de setup

```bash
chmod +x scripts/setup.sh
sudo ./scripts/setup.sh
```

O script irá:
- Verificar pré-requisitos (Docker, OpenSSL)
- Criar o arquivo `.env` com senhas geradas automaticamente
- Criar diretórios necessários
- Configurar backup automático diário (cron 03:00)

### Passo 3 — Editar o arquivo .env

```bash
nano .env
```

Configurações obrigatórias:

```env
# URL pública do frontend (sem barra final)
FRONTEND_URL=http://192.168.1.100

# URL pública do backend (acessível pelo navegador)
SERVER_PUBLIC_URL=http://192.168.1.100:3500

# IP/hostname do servidor dcm4chee (acessível externamente)
DCM4CHEE_PUBLIC_HOST=192.168.1.100
```

### Passo 4 — Build e inicialização

```bash
# Build de todas as imagens
docker compose build

# Iniciar todos os serviços em background
docker compose up -d

# Acompanhar logs
docker compose logs -f
```

### Passo 5 — Aguardar inicialização

O dcm4chee Archive leva **2-5 minutos** para inicializar completamente.

```bash
# Verificar status dos containers
docker compose ps

# Aguardar o arc estar saudável
docker compose logs -f arc
# Aguarde: "WildFly Full ... started"
```

---

## 4. Instalação Manual (Desenvolvimento)

### Pré-requisitos adicionais

- **Node.js 22.5+** — `node:sqlite` exige Node >= 22.5.0
- **npm 10+**

```bash
# Verificar versão do Node
node --version  # deve ser v22.5.0 ou superior

# Instalar dependências do monorepo
npm install
```

### Backend (pacs-server)

```bash
cd packages/server

# Criar .env
cp .env.example .env
nano .env

# Desenvolvimento com hot-reload
npm run dev

# Build e execução em produção
npm run build
npm start
```

### Frontend (pacs-web)

```bash
cd packages/web

# Criar .env
cp .env.example .env
nano .env

# Desenvolvimento
npm run dev
# Acesse: http://localhost:5173

# Build de produção
npm run build
npm run preview
```

---

## 5. Configuração de Variáveis de Ambiente

### 5.1 Arquivo `.env` (raiz do projeto — Docker Compose)

| Variável               | Obrigatório | Descrição                                      | Exemplo                        |
|------------------------|-------------|------------------------------------------------|--------------------------------|
| `API_SECRET`           | ✅ Sim      | Chave secreta da API (≥32 chars)               | `openssl rand -hex 32`         |
| `POSTGRES_PASSWORD`    | ✅ Sim      | Senha do PostgreSQL                            | `openssl rand -hex 20`         |
| `FRONTEND_URL`         | ✅ Sim      | URL pública do frontend                        | `http://192.168.1.100`         |
| `SERVER_PUBLIC_URL`    | ✅ Sim      | URL pública do backend                         | `http://192.168.1.100:3500`    |
| `DCM4CHEE_PUBLIC_HOST` | ✅ Sim      | Hostname/IP do servidor DICOM                  | `192.168.1.100`                |
| `SMTP_HOST`            | ⚠ Email    | Servidor SMTP para alertas                     | `smtp.gmail.com`               |
| `SMTP_USER`            | ⚠ Email    | Usuário SMTP                                   | `pacs@clinica.com`             |
| `SMTP_PASS`            | ⚠ Email    | Senha SMTP / App Password                      | `xxxx xxxx xxxx xxxx`          |
| `EMAIL_ALERT_TO`       | ⚠ Email    | Destinatários de alertas (vírgula)             | `admin@clinica.com`            |
| `SHARE_BASE_URL`       | Opcional    | URL base para links de compartilhamento        | Igual ao `FRONTEND_URL`        |
| `DISK_WARN_PERCENT`    | Opcional    | % de disco para aviso (padrão: 80)             | `75`                           |
| `DISK_CRITICAL_PERCENT`| Opcional    | % de disco para alerta crítico (padrão: 90)    | `85`                           |
| `DICOM_PORT`           | Opcional    | Porta DICOM C-STORE externa (padrão: 11112)    | `11112`                        |
| `WEB_PORT`             | Opcional    | Porta HTTP do frontend (padrão: 80)            | `8888`                         |

### 5.2 Arquivo `packages/web/.env` (Desenvolvimento local)

```env
VITE_DCM4CHEE_HOST=192.168.1.100
VITE_DCM4CHEE_PORT=8080
VITE_DCM4CHEE_AET=DCM4CHEE
VITE_SERVER_URL=http://localhost:3500
VITE_API_SECRET=sua-chave-secreta
VITE_APP_NAME=PACS Mini
```

> **Nota:** Em produção (Docker), essas variáveis são injetadas automaticamente via `build args` no Dockerfile. Não é necessário o arquivo `.env` para builds Docker.

---

## 6. Iniciando os Serviços

### Comandos Docker Compose

```bash
# Iniciar tudo
docker compose up -d

# Ver status
docker compose ps

# Logs em tempo real (todos os serviços)
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f pacs-server
docker compose logs -f arc

# Reiniciar um serviço
docker compose restart pacs-server

# Parar tudo
docker compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker compose down -v
```

### Verificação de saúde

```bash
# Health check do backend
curl http://localhost:3500/health

# Health check esperado:
# {"ok":true,"ts":"...","version":"2.0.0","env":"production"}
```

---

## 7. Acesso ao Sistema

Após inicialização completa dos containers:

| Interface            | URL                              | Descrição                        |
|----------------------|----------------------------------|----------------------------------|
| **PACS Mini Web**    | `http://SEU-SERVIDOR`            | Interface principal              |
| **API Backend**      | `http://SEU-SERVIDOR:3500`       | API REST                         |
| **dcm4chee Admin**   | `http://SEU-SERVIDOR:8080/dcm4chee-arc/ui` | Interface administrativa |
| **API Health**       | `http://SEU-SERVIDOR:3500/health`| Status do servidor               |

---

## 8. Credenciais Padrão

### PACS Mini

O PACS Mini **não possui usuários** — a autenticação é feita via `API_SECRET` configurado no `.env`. Configure esse valor no frontend via **Configurações → Servidor**.

### dcm4chee Archive

| Campo    | Valor padrão |
|----------|-------------|
| Usuário  | `admin`     |
| Senha    | `admin`     |

> ⚠️ **Troque a senha do dcm4chee imediatamente após a instalação!**
> Acesse: `http://SEU-SERVIDOR:8080/dcm4chee-arc/ui` → Security → Change Password

---

## 9. Recomendações de Segurança

### 9.1 Obrigatório para produção

- [ ] **Troque o `API_SECRET`** — use `openssl rand -hex 32`
- [ ] **Troque o `POSTGRES_PASSWORD`** — use `openssl rand -hex 20`
- [ ] **Troque a senha do dcm4chee** no painel admin
- [ ] **Configure HTTPS** com certificado SSL/TLS (Let's Encrypt)
- [ ] **Restrinja acesso à porta 5432** (PostgreSQL) — nunca exponha publicamente
- [ ] **Restrinja acesso à porta 9990** (WildFly admin) — nunca exponha publicamente

### 9.2 HTTPS com Nginx (recomendado)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado (substitua pelo seu domínio)
sudo certbot --nginx -d pacs.suaclinica.com

# Renovação automática
sudo systemctl enable certbot.timer
```

Exemplo de configuração Nginx reverso com HTTPS:

```nginx
server {
    listen 80;
    server_name pacs.suaclinica.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pacs.suaclinica.com;

    ssl_certificate     /etc/letsencrypt/live/pacs.suaclinica.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pacs.suaclinica.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass         http://localhost:3500;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 9.3 Atualizações

```bash
# Atualizar imagens base (execute mensalmente)
docker compose pull
docker compose build --no-cache
docker compose up -d
```

---

## 10. Backup e Restauração

### 10.1 Backup manual

```bash
# Backup completo (banco + storage DICOM)
./scripts/backup.sh

# Apenas banco SQLite (mais rápido)
./scripts/backup.sh --db-only

# Backups ficam em: ./backups/
ls -lh backups/
```

### 10.2 Backup automático

O script de setup configura backup diário às **03:00** via cron:
```
0 3 * * * cd /path/to/pacs-mini && ./scripts/backup.sh --db-only >> ./backups/backup.log 2>&1
```

Editar: `crontab -e`

### 10.3 Restauração

```bash
# Listar backups disponíveis
ls -lht backups/

# Restaurar um backup específico
./scripts/restore.sh ./backups/pacs-db_20260101_030000.db.gz
```

> ⚠️ A restauração para o pacs-server durante o processo. O dcm4chee não é afetado.

---

## 11. Troubleshooting

### 11.1 Container não inicia

```bash
# Ver logs detalhados
docker compose logs arc
docker compose logs pacs-server

# Verificar saúde dos containers
docker compose ps
```

### 11.2 "Cannot connect to dcm4chee"

- Verifique se `arc` está `healthy`: `docker compose ps`
- Aguarde 2-5 minutos para o WildFly completar inicialização
- Confirme que `DCM4CHEE_BASE_URL=http://arc:8080` está correto no compose

### 11.3 Frontend não carrega dados

- Verifique se `VITE_DCM4CHEE_HOST` aponta para o IP correto
- Abra o console do navegador (F12) e verifique erros de CORS ou rede
- Confirme que `pacs-server` está respondendo: `curl http://SEU-IP:3500/health`

### 11.4 Erro "node:sqlite" / "DatabaseSync is not a constructor"

O módulo `node:sqlite` exige **Node.js >= 22.5.0**.

```bash
# Verificar versão do Node no container
docker compose exec pacs-server node --version

# O Dockerfile usa node:22-alpine — reconstrua se necessário
docker compose build --no-cache pacs-server
```

### 11.5 Build falha: "process /bin/sh -c npm ci did not complete successfully"

**Causa:** O projeto é um monorepo npm workspaces. O `package-lock.json` fica na raiz. Se o `context:` do Compose apontar para `./packages/web` ou `./packages/server`, o `npm ci` não encontra o lock file.

**Verificação:** Os Dockerfiles v2.0 já usam `context: .` (raiz). Se o erro persistir:

```bash
# 1. Confirme que o docker-compose.yml usa context raiz
grep -A3 "pacs-web:" docker-compose.yml
# Deve mostrar:  context: .

# 2. Confirme que o package-lock.json existe na raiz
ls -la package-lock.json

# 3. Se estiver desatualizado, regenere do zero
npm install --legacy-peer-deps
docker compose build --no-cache
```

### 11.6 Porta já em uso

```bash
# Verificar qual processo usa a porta
sudo lsof -i :3500
sudo lsof -i :8080

# Trocar portas no .env
SERVER_PORT=3501
ARC_HTTP_PORT=8081
```

### 11.6 Disco cheio

```bash
# Ver uso de espaço dos volumes Docker
docker system df -v

# Limpar imagens não utilizadas
docker image prune -f

# Verificar storage DICOM
docker compose exec arc df -h /storage
```

### 11.7 Logs do sistema

```bash
# Logs em tempo real
docker compose logs -f --tail=100 pacs-server

# Logs do Nginx
docker compose exec pacs-web cat /var/log/nginx/error.log

# Localização dos logs (em produção com JSON)
docker compose logs pacs-server | jq 'select(.level == "error")'
```

### 11.8 Reinicialização completa (preservando dados)

```bash
# Para tudo sem apagar volumes
docker compose down

# Reconstruir imagens
docker compose build --no-cache

# Reiniciar
docker compose up -d
```

---

## Estrutura de Arquivos

```
pacs-mini/
├── .env.example          # Template de variáveis de ambiente
├── .env                  # Configuração local (não comitar!)
├── docker-compose.yml    # Orquestração completa
├── INSTALL.md            # Este arquivo
├── scripts/
│   ├── setup.sh          # Script de setup inicial
│   ├── backup.sh         # Backup do banco e storage
│   └── restore.sh        # Restauração do banco
├── backups/              # Backups automáticos
├── packages/
│   ├── server/           # Backend Node.js/Express
│   │   ├── Dockerfile
│   │   ├── src/
│   │   └── data/         # Banco SQLite (desenvolvimento)
│   └── web/              # Frontend React/Vite
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
```

---

## Suporte

- **Logs:** `docker compose logs -f`
- **Health:** `curl http://localhost:3500/health`
- **Versão:** Ver campo `version` no response do health check

---

*PACS Mini v2.0.0 — NordikIA | dcm4chee-arc-light 5.34.3*
