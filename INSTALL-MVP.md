# PACS Mini — Guia de Instalação MVP

> Instalação em servidor Linux com dcm4chee Archive 5 já em execução.
> Tempo estimado: 20–40 minutos.

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Obtendo o código](#2-obtendo-o-código)
3. [Configurando o ambiente](#3-configurando-o-ambiente)
4. [Habilitando CORS no dcm4chee](#4-habilitando-cors-no-dcm4chee)
5. [Build e inicialização](#5-build-e-inicialização)
6. [Checklist de validação](#6-checklist-de-validação)
7. [Configuração de firewall](#7-configuração-de-firewall)
8. [Atualização](#8-atualização)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pré-requisitos

### No servidor Linux

| Requisito | Versão mínima | Verificar |
|-----------|--------------|-----------|
| Docker Engine | 24+ | `docker --version` |
| Docker Compose V2 | 2.20+ | `docker compose version` |
| Git | qualquer | `git --version` |
| dcm4chee Archive 5 | 5.x | acessível em `http://localhost:8080/dcm4chee-arc/aets` |

**Instalar Docker (se necessário):**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout e login novamente para o grupo ter efeito
```

**Verificar dcm4chee:**

```bash
curl -s http://localhost:8080/dcm4chee-arc/aets | head -c 200
# Deve retornar uma lista JSON de AE Titles
```

Se retornar erro 401, consulte a seção [CORS e autenticação](#4-habilitando-cors-no-dcm4chee).

---

## 2. Obtendo o código

```bash
# Escolha um diretório de instalação
cd /opt
sudo git clone https://github.com/seu-usuario/pacs-mini.git
sudo chown -R $USER:$USER pacs-mini
cd pacs-mini
```

> Se o repositório for privado, use SSH ou forneça credenciais de acesso.

---

## 3. Configurando o ambiente

### 3.1 Copiar o template

```bash
cp .env.mini .env
```

### 3.2 Editar as variáveis obrigatórias

```bash
nano .env
```

#### Variáveis obrigatórias

| Variável | O que preencher |
|----------|----------------|
| `API_SECRET` | Senha interna da API — gere com `openssl rand -hex 32` |
| `DCM4CHEE_BASE_URL` | URL do dcm4chee acessível **dentro do container** |
| `DCM4CHEE_PUBLIC_HOST` | IP ou hostname do servidor, acessível pelo **browser** |
| `FRONTEND_URL` | URL pública do frontend (ex: `http://192.168.1.100`) |

#### Gerando o API_SECRET

```bash
openssl rand -hex 32
# Copie o resultado e cole em API_SECRET= no .env
```

#### Determinando a DCM4CHEE_BASE_URL

| Cenário | Valor correto |
|---------|--------------|
| dcm4chee roda **no host** (sem Docker) | `http://host.docker.internal:8080` |
| dcm4chee em container na **mesma rede Docker** | `http://nome-do-container:8080` |
| dcm4chee em **outro host** na rede | `http://192.168.1.x:8080` |

#### Exemplo de .env completo (mínimo funcional)

```dotenv
API_SECRET=a3f8c2d1e9b7a5c4d2e8f1a6b3c9d5e2f7a4b8c1d6e3f9a2b5c8d1e4f7a0b3
DCM4CHEE_BASE_URL=http://host.docker.internal:8080
DCM4CHEE_AET=DCM4CHEE
DCM4CHEE_PUBLIC_HOST=192.168.1.100
DCM4CHEE_PUBLIC_PORT=8080
FRONTEND_URL=http://192.168.1.100
SHARE_BASE_URL=http://192.168.1.100
WEB_PORT=80
SERVER_PORT=3500
```

---

## 4. Habilitando CORS no dcm4chee

O PACS Mini acessa o dcm4chee via DICOMweb. O dcm4chee precisa permitir requisições do browser (CORS).

### Via variável de ambiente (docker-compose original)

Se o dcm4chee foi instalado com Docker Compose, adicione no `docker-compose.yml` do dcm4chee:

```yaml
services:
  arc:
    environment:
      ALLOW_CORS_ORIGIN: "http://192.168.1.100"  # URL do PACS Mini
```

Depois: `docker compose restart arc`

### Via arquivo de configuração (wildfly standalone.xml)

```bash
# Localize o standalone.xml
find / -name standalone.xml -path "*/dcm4chee*" 2>/dev/null

# Edite e adicione dentro de <dcm4chee-arc>:
# <allowed-origins>http://192.168.1.100</allowed-origins>

# Reinicie o WildFly
systemctl restart dcm4chee
# ou
docker restart dcm4chee
```

### Via interface web do dcm4chee UI

1. Acesse `http://localhost:8080/dcm4chee-arc/ui2`
2. Menu → Configuration → Devices → dcm4chee
3. Campo **Allowed Origins** → adicione `http://192.168.1.100`
4. Clique em **Save**

### Verificar CORS

```bash
curl -v -H "Origin: http://192.168.1.100" \
     http://localhost:8080/dcm4chee-arc/aets 2>&1 | grep -i "access-control"
# Deve aparecer: Access-Control-Allow-Origin: http://192.168.1.100
```

---

## 5. Build e inicialização

### 5.1 Build das imagens

```bash
cd /opt/pacs-mini
docker compose -f docker-compose.mini.yml build
```

O build faz o download das dependências e compila o frontend. Pode levar 5–15 minutos na primeira vez.

### 5.2 Subir os serviços

```bash
docker compose -f docker-compose.mini.yml up -d
```

### 5.3 Acompanhar os logs

```bash
# Todos os serviços
docker compose -f docker-compose.mini.yml logs -f

# Apenas o backend
docker compose -f docker-compose.mini.yml logs -f pacs-server

# Apenas o nginx
docker compose -f docker-compose.mini.yml logs -f pacs-web
```

### 5.4 Verificar status

```bash
docker compose -f docker-compose.mini.yml ps
```

Aguarde ambos os serviços aparecerem como `healthy`.

---

## 6. Checklist de validação

Execute os testes abaixo em ordem. Cada item deve passar antes de avançar.

### 6.1 Health checks de infraestrutura

```bash
# Backend saudável
curl -s http://localhost:3500/health
# Esperado: {"status":"ok", ...}

# Nginx servindo o frontend
curl -sI http://localhost/ | head -5
# Esperado: HTTP/1.1 200 OK

# Proxy nginx → backend funcionando
curl -s http://localhost/api/health
# Esperado: {"status":"ok", ...}
```

### 6.2 Acesso ao frontend

1. Abra `http://IP-DO-SERVIDOR` no browser
2. A tela de login/dashboard do PACS Mini deve aparecer
3. Não deve haver erro no console (F12 → Console)

### 6.3 Configuração da conexão dcm4chee

1. No PACS Mini, acesse **Configurações** (ícone de engrenagem)
2. Preencha:
   - **Host**: `IP-DO-SERVIDOR` (o mesmo de `DCM4CHEE_PUBLIC_HOST`)
   - **Porta**: `8080`
   - **AE Title**: `DCM4CHEE`
3. Clique em **Testar Conexão**
4. Deve aparecer indicador verde "Conectado"

### 6.4 Busca de estudos

1. Acesse **Estudos**
2. Clique em **Pesquisar** sem filtros (busca tudo)
3. A lista de estudos do dcm4chee deve aparecer
4. Abra um estudo → as séries e thumbnails devem carregar

### 6.5 Busca de pacientes

1. Acesse **Pacientes**
2. Pesquise por `*` (asterisco) para listar todos
3. Clique em um paciente → histórico de estudos deve aparecer no drawer lateral

### 6.6 Upload DICOM

1. Acesse **Upload**
2. Arraste um arquivo `.dcm` de teste para a área de drop
3. Clique em **Enviar**
4. Deve aparecer mensagem de sucesso
5. Confirme o arquivo na busca de estudos

> Arquivo de teste DICOM (público): https://www.dicomstandard.org/wg/wg-04/

### 6.7 Compartilhamento de exame (Portal)

1. Na lista de estudos, abra o menu `⋯` de qualquer estudo
2. Clique em **Compartilhar**
3. Configure validade de 24h, sem senha, com permissão de download
4. Clique em **Gerar link**
5. Copie o link gerado (formato: `http://IP/portal/TOKEN`)
6. Abra o link em uma aba anônima do browser
7. O portal deve exibir as informações do estudo e thumbnails

### 6.8 Worklist (se dcm4chee tem MWL configurado)

1. Acesse **Worklist**
2. A data de hoje já vem preenchida
3. Clique em **Pesquisar**
4. Se houver itens na worklist do dcm4chee, devem aparecer

### 6.9 Eventos DICOM

1. Acesse **Eventos DICOM**
2. A tabela pode estar vazia inicialmente
3. Envie um estudo via C-MOVE (se configurado) para gerar eventos

---

## 7. Configuração de firewall

### Portas necessárias

| Porta | Protocolo | Quem acessa | Para quê |
|-------|-----------|-------------|----------|
| 80 | TCP | Rede local / Internet | Interface web PACS Mini |
| 3500 | TCP | Rede interna (opcional) | API backend direta |
| 8080 | TCP | Rede local | dcm4chee REST + UI (opcional fechar) |
| 11112 | TCP | Modalities DICOM | Recepção de imagens C-STORE |

### UFW (Ubuntu/Debian)

```bash
sudo ufw allow 80/tcp comment "PACS Mini Web"
sudo ufw allow 11112/tcp comment "DICOM C-STORE"

# Se quiser expor o dcm4chee UI internamente:
sudo ufw allow from 192.168.1.0/24 to any port 8080 comment "dcm4chee interno"

# Bloquear acesso externo ao backend direto (nginx já faz o proxy)
sudo ufw deny 3500/tcp

sudo ufw status verbose
```

### firewalld (RHEL/CentOS/Rocky)

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=11112/tcp
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port port="8080" protocol="tcp" accept'
sudo firewall-cmd --reload
```

---

## 8. Atualização

```bash
cd /opt/pacs-mini
git pull origin main
docker compose -f docker-compose.mini.yml build
docker compose -f docker-compose.mini.yml up -d
```

O volume `pacs-server-data` (banco SQLite) é preservado entre atualizações.

---

## 9. Troubleshooting

### 9.1 "Sem conexão com o dcm4chee"

```bash
# 1. Verifique se o dcm4chee está acessível no host
curl -s http://localhost:8080/dcm4chee-arc/aets

# 2. Teste a partir dentro do container pacs-server
docker exec pacs-server wget -qO- http://host.docker.internal:8080/dcm4chee-arc/aets

# 3. Se falhar, verifique DCM4CHEE_BASE_URL no .env
docker compose -f docker-compose.mini.yml exec pacs-server env | grep DCM4CHEE
```

**Solução mais comum**: trocar `localhost` por `host.docker.internal` em `DCM4CHEE_BASE_URL`.

### 9.2 "Erro CORS" no browser (console F12)

```
Access to fetch at 'http://...' from origin 'http://...' has been blocked by CORS policy
```

Confirme que o `ALLOW_CORS_ORIGIN` do dcm4chee aponta para a URL **exata** do frontend (incluindo protocolo e porta).

```bash
# No .env do dcm4chee (se usando docker-compose):
ALLOW_CORS_ORIGIN=http://192.168.1.100   # sem barra no final, sem porta 80
```

### 9.3 Thumbnails não carregam

- Verifique `VITE_DCM4CHEE_HOST` e `VITE_DCM4CHEE_PORT` no `.env` — devem ser acessíveis do browser
- Acesse diretamente: `http://DCM4CHEE_PUBLIC_HOST:8080/dcm4chee-arc/aets/DCM4CHEE/rs/studies` — deve retornar JSON
- Se o dcm4chee exigir autenticação, desabilite para a rede interna ou configure Keycloak

### 9.4 "API_SECRET inválido" / 401 nas chamadas de API

```bash
# Confira se a secret do .env bate com a configurada no build
docker compose -f docker-compose.mini.yml exec pacs-server env | grep API_SECRET
```

A `VITE_API_SECRET` é embutida no build do frontend. Se mudar o `API_SECRET`, **reconstrua** a imagem:

```bash
docker compose -f docker-compose.mini.yml build pacs-web
docker compose -f docker-compose.mini.yml up -d pacs-web
```

### 9.5 Upload DICOM falha (413 Request Entity Too Large)

O nginx está configurado para aceitar até 512 MB por upload. Se precisar de mais:

```nginx
# packages/web/nginx.conf
client_max_body_size 2048m;
```

Rebuild necessário após a alteração.

### 9.6 Container pacs-server não fica healthy

```bash
docker compose -f docker-compose.mini.yml logs pacs-server | tail -50
```

Causas comuns:
- `DB_PATH` com diretório sem permissão de escrita
- `DCM4CHEE_BASE_URL` inacessível (bloqueia a inicialização)
- Versão do Node.js incompatível (requer Node 22+ — verifique o Dockerfile)

### 9.7 Porta 80 já em uso

```bash
# Descobrir quem usa a porta 80
sudo ss -tlnp | grep :80
# ou
sudo lsof -i :80
```

Mude `WEB_PORT` no `.env` para outra porta (ex: `WEB_PORT=8090`) e acesse em `http://IP:8090`.

### 9.8 Ver logs em tempo real

```bash
# Backend
docker compose -f docker-compose.mini.yml logs -f pacs-server

# Nginx (access log)
docker exec pacs-web tail -f /var/log/nginx/access.log
```

### 9.9 Reiniciar serviços individualmente

```bash
docker compose -f docker-compose.mini.yml restart pacs-server
docker compose -f docker-compose.mini.yml restart pacs-web
```

### 9.10 Limpeza completa (WARNING: apaga banco de dados)

```bash
docker compose -f docker-compose.mini.yml down -v
docker compose -f docker-compose.mini.yml up -d --build
```

---

## Referência rápida de comandos

```bash
# Subir
docker compose -f docker-compose.mini.yml up -d

# Parar (sem apagar dados)
docker compose -f docker-compose.mini.yml down

# Status
docker compose -f docker-compose.mini.yml ps

# Logs
docker compose -f docker-compose.mini.yml logs -f

# Rebuild completo
docker compose -f docker-compose.mini.yml build --no-cache
docker compose -f docker-compose.mini.yml up -d

# Backup do banco SQLite
docker run --rm -v pacs-server-data:/data -v $(pwd):/backup alpine \
  cp /data/pacs-mini.db /backup/pacs-mini-$(date +%Y%m%d).db
```
