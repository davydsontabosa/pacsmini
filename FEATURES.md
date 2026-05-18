# PACS Mini — Recursos da Solução

> Versão 2.0 · Interface web moderna para dcm4chee Archive 5

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Módulos do Frontend](#3-módulos-do-frontend)
4. [Módulos do Backend](#4-módulos-do-backend)
5. [Integração DICOMweb](#5-integração-dicomweb)
6. [Segurança](#6-segurança)
7. [Implantação](#7-implantação)
8. [Requisitos Técnicos](#8-requisitos-técnicos)
9. [Sumário de Endpoints da API](#9-sumário-de-endpoints-da-api)

---

## 1. Visão Geral

O **PACS Mini** é uma interface web de gestão para o [dcm4chee Archive 5](https://www.dcm4che.org/), substituindo a UI técnica nativa por uma experiência moderna, responsiva e segura. Destina-se a clínicas, laboratórios e hospitais de pequeno e médio porte que já operam o dcm4chee como servidor DICOM (VNA/PACS).

### O que o PACS Mini oferece

| Categoria | Descrição |
|-----------|-----------|
| Visualização | Busca, filtragem e navegação de estudos, séries e instâncias DICOM |
| Gestão | Pacientes, médicos, destinos DICOM e worklist de procedimentos |
| Compartilhamento | Links temporários e seguros para médicos externos acessarem exames |
| Envio DICOM | Exportação de estudos para outros servidores via C-MOVE |
| Upload | Importação de arquivos DICOM diretamente pelo browser |
| Monitoramento | Alertas de disco, eventos DICOM e notificações por e-mail |
| Portal público | Página autônoma para acesso externo sem login no sistema principal |

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Cliente                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│               pacs-web  (Nginx)                              │
│  • Serve o SPA React (arquivos estáticos)                    │
│  • /api/*    → proxy para pacs-server:3500                  │
│  • /portal/* → proxy para pacs-server:3500                  │
│  • /health   → proxy para pacs-server:3500                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP interno
┌───────────────────────────▼─────────────────────────────────┐
│               pacs-server  (Express / Node 22)               │
│  • REST API autenticada                                      │
│  • Portal público (sem autenticação, com rate limit)        │
│  • Proxy de downloads ZIP (streaming)                        │
│  • Banco de dados SQLite (node:sqlite nativo)               │
│  • Crons: monitoramento de disco, eventos DICOM             │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (DICOMweb + REST)
┌───────────────────────────▼─────────────────────────────────┐
│               dcm4chee Archive 5  (existente)                │
│  • QIDO-RS  /studies  /series  /instances  /patients        │
│  • WADO-RS  thumbnails, retrieve                            │
│  • STOW-RS  /studies  (upload)                              │
│  • MWL      /mwlitems                                       │
│  • REST API /devices  /tasks  (C-MOVE, C-ECHO)             │
└─────────────────────────────────────────────────────────────┘
```

### Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5, Zustand, Tailwind CSS |
| Backend | Node.js 22, Express 5, TypeScript, node:sqlite (built-in) |
| Banco de dados | SQLite via `node:sqlite` (sem dependência externa) |
| Servidor web | Nginx (SPA + proxy reverso) |
| Containerização | Docker multi-stage + Docker Compose |
| Monorepo | npm workspaces (`packages/web`, `packages/server`) |

---

## 3. Módulos do Frontend

### 3.1 Dashboard

- Painel de status com indicador de conexão ao dcm4chee em tempo real
- Cards de resumo: total de estudos recentes, alertas de disco, eventos DICOM pendentes
- Atalhos rápidos para as principais funcionalidades
- Indicador de espaço em disco com barra de progresso e cor adaptativa (verde/amarelo/vermelho)

### 3.2 Estudos (`/studies`)

- **Busca avançada** com filtros combinados:
  - Nome do paciente (suporte a wildcard `*`)
  - ID do paciente
  - Intervalo de datas (`StudyDate` DICOM range)
  - Modalidade (CT, MR, CR, DX, US, PT, NM, XA e todas)
  - Número de acesso (`AccessionNumber`)
  - Descrição do estudo
- **Tabela expansível**: clique em uma linha para expandir as séries do estudo
- **Thumbnails WADO-RS** carregados por série (sem necessidade de Instance UID)
- **Seleção múltipla** com checkbox por linha e seleção global (select all)
- **Barra de ação em lote**: aparece quando há estudos selecionados
- **Menu de ações por estudo** (`⋯`):
  - Compartilhar (gera link de portal)
  - Enviar via DICOM (C-MOVE para destino cadastrado)
  - Download ZIP (streaming direto do dcm4chee)
  - Copiar Study Instance UID para clipboard
- **Envio em lote** de múltiplos estudos selecionados para um destino DICOM

### 3.3 Pacientes (`/patients`)

- Busca por nome (wildcard) e ID do paciente
- Tabela com: nome, ID, data de nascimento, sexo
- **Drawer lateral** ao clicar no paciente:
  - Histórico completo de estudos do paciente
  - Dados demográficos completos
  - Botão de envio de todos os estudos do paciente via DICOM
  - Download por estudo individual (ZIP)
- **Modo médico**: filtro automático de pacientes atribuídos ao médico ativo
- Botão de envio rápido via DICOM diretamente na linha da tabela

### 3.4 Worklist (`/worklist`)

- Consulta à **Modality Worklist (MWL)** do dcm4chee
- Filtros: data agendada, modalidade, nome do paciente
- Exibe: paciente, ID, data agendada, hora, modalidade, procedimento, número de acesso
- Botão de atualização manual
- Data de hoje pré-selecionada automaticamente ao abrir a página

### 3.5 Upload (`/upload`)

- Área de drag-and-drop para arquivos `.dcm`
- Suporte a múltiplos arquivos em uma operação
- Barra de progresso por arquivo
- Upload via **STOW-RS** diretamente ao dcm4chee
- Limite de 512 MB por arquivo (configurável no nginx)
- Feedback de sucesso/erro por arquivo

### 3.6 Compartilhamentos (`/shares`)

- Lista todos os links de compartilhamento gerados
- Status de cada link: ativo, expirado, esgotado (limite de acessos)
- Colunas: paciente, criado por, validade, acessos, download permitido
- Copiar link para clipboard com um clique
- Revogar link individualmente
- Criação de novos links a partir desta tela

### 3.7 Portal Público (`/portal/:tokenId`)

- Página **sem autenticação** para acesso de médicos externos
- Suporte a **senha opcional** por link
- Exibe: nome do paciente, descrição do exame, modalidades, data de validade, contador de acessos
- Grade de thumbnails por série (até 5 por série + contador do restante)
- **Lightbox** ao clicar no thumbnail (imagem expandida)
- Botão de download do estudo completo (ZIP) — se permitido no link
- Botão de download por série individual — se permitido
- Funciona sem VPN, login ou instalação de software

### 3.8 Destinos DICOM (`/destinations`)

- Cadastro de servidores DICOM externos (AE Title, host, porta)
- Indicador de status do último **C-ECHO** (verde / amarelo / vermelho / cinza)
  - Verde: echo OK nas últimas 24h
  - Amarelo: echo OK, mas com mais de 24h
  - Vermelho: último echo falhou
  - Cinza: nunca testado
- Teste de conectividade (C-ECHO) sob demanda
- Ativar/desativar destinos sem excluir
- Edição e exclusão de destinos

### 3.9 Médicos (`/doctors`)

- Cadastro de médicos: nome, CRM, especialidade, e-mail
- Atribuição de pacientes por ID (vinculação médico ↔ paciente)
- **Modo médico**: ao selecionar um médico, a lista de pacientes e estudos é filtrada apenas pelos atribuídos a ele
- Banner de contexto exibido em todas as telas enquanto o modo médico estiver ativo
- Remover atribuições individualmente

### 3.10 Eventos DICOM (`/events`)

- Log dos eventos de C-MOVE, C-STORE e falhas registrados pelo backend
- Colunas: tipo, Study UID, detalhe, data/hora
- Filtro por tipo de evento e intervalo de datas
- Deduplicação automática: mesmo evento não é registrado mais de uma vez em 24h

### 3.11 Configurações (`/settings`)

- Conexão com dcm4chee:
  - Host, porta, AE Title
  - Botão "Testar Conexão" com feedback visual
  - Estado persistido em `localStorage` (Zustand persist)
- Configuração do servidor PACS Mini:
  - URL do servidor (padrão: mesmo origin via nginx)
  - API Secret
- Indicador de status da conexão visível em todas as telas (header)

### 3.12 Componentes compartilhados

| Componente | Função |
|-----------|--------|
| `SendDicomModal` | Modal de seleção de destino e envio C-MOVE para estudo ou paciente |
| `SendBatchModal` | Modal de envio em lote de estudos selecionados |
| `ShareModal` | Modal de criação de link de compartilhamento com opções de validade, senha e download |
| `DestinationFormModal` | Formulário de criação/edição de destino DICOM |
| `DoctorFormModal` | Formulário de criação/edição de médico |
| `AssignPatientModal` | Modal de atribuição de pacientes a um médico |
| `DiskStatusCard` | Card de monitoramento de disco com barra de progresso |
| `EchoIndicator` | Bolinha de status do C-ECHO por destino DICOM |
| `AppLayout` | Layout base: sidebar de navegação + header com status de conexão |

---

## 4. Módulos do Backend

### 4.1 Autenticação e Autorização

- **API Secret** via header `Authorization: Bearer <secret>`
- Comparação em tempo constante (`crypto.timingSafeEqual`) — imune a timing attacks
- Middleware aplicado a todas as rotas `/api/*`
- Portal público (`/portal/*`) sem autenticação, protegido por rate limiting

### 4.2 Proxy de Downloads (`/api/proxy`)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/proxy/download/study/:studyUID` | Streaming ZIP do estudo completo via dcm4chee |
| `GET /api/proxy/download/series/:studyUID/:seriesUID` | Streaming ZIP de uma série |

- Autenticado (apenas usuários logados podem baixar)
- Streaming direto sem buffer em memória (`pipe` para response)
- Repassa `Content-Length` do dcm4chee quando disponível
- Timeout de 120s para estudos grandes

### 4.3 Compartilhamentos e Portal (`/api/shares`, `/portal`)

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/shares` | Criar link de compartilhamento |
| `GET /api/shares` | Listar links existentes |
| `DELETE /api/shares/:id` | Revogar link |
| `GET /portal/:tokenId` | Informações do estudo (público) |
| `GET /portal/:tokenId/series` | Séries do estudo (público) |
| `GET /portal/:tokenId/instances/:seriesUID` | Instâncias da série (público) |
| `GET /portal/:tokenId/thumbnail/:seriesUID/:instanceUID` | Thumbnail (público) |
| `GET /portal/:tokenId/download/:type` | Download ZIP (público, se permitido) |

- Token gerado com `nanoid(12)` — 12 caracteres URL-safe
- Senha opcional com hash `bcryptjs` (rounds 10)
- Controle de: data de expiração, número máximo de acessos, permissão de download
- Rate limiting no portal: 30 requisições / 5 min por tokenId (modo produção)

### 4.4 Envio DICOM (`/api/send`)

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/send/study` | Enviar estudo via C-MOVE |
| `POST /api/send/patient` | Enviar todos os estudos do paciente via C-MOVE |

- Registra o destino no dcm4chee como device (se ainda não registrado)
- Verifica existência via `/dcm4chee-arc/devices/:name` antes de criar
- Dispara a task de C-MOVE via REST API do dcm4chee
- Log do envio no banco de dados

### 4.5 Destinos DICOM (`/api/destinations`)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/destinations` | Listar destinos |
| `POST /api/destinations` | Criar destino |
| `PUT /api/destinations/:id` | Editar destino |
| `DELETE /api/destinations/:id` | Excluir destino |
| `POST /api/destinations/:id/echo` | Executar C-ECHO e atualizar status |

- C-ECHO via dcm4chee REST API (não requer biblioteca DICOM local)
- Salva resultado do echo: `lastEchoAt`, `lastEchoOk`

### 4.6 Médicos (`/api/doctors`)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/doctors` | Listar médicos |
| `POST /api/doctors` | Criar médico |
| `PUT /api/doctors/:id` | Editar médico |
| `DELETE /api/doctors/:id` | Excluir médico |
| `GET /api/doctors/:id/patients` | Listar pacientes atribuídos |
| `POST /api/doctors/:id/patients` | Atribuir paciente |
| `DELETE /api/doctors/:id/patients/:patientId` | Remover atribuição |

### 4.7 Eventos DICOM (`/api/events`)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/events` | Listar eventos com filtros |
| `POST /api/events` | Registrar evento |

- Cron a cada 5 minutos consulta tarefas falhas no dcm4chee e registra eventos
- Deduplicação por `(event_type, study_uid, detail)` dentro de janela de 24h
- Evita crescimento indefinido do banco por re-execução do cron

### 4.8 Monitoramento de Disco (`/api/disk`)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/disk` | Retorna uso atual do disco de storage |

- Cron configurável via `DISK_CHECK_CRON` (padrão: a cada hora)
- Thresholds configuráveis: `DISK_WARN_PERCENT` e `DISK_CRITICAL_PERCENT`
- Cooldown configurável: `DISK_COOLDOWN_HOURS` (padrão: 4h entre alertas)
- Envia e-mail de alerta ao atingir threshold
- Monitora o path `/storage` (mapeado para o storage do dcm4chee)

### 4.9 Notificações (`/api/notify`)

- Envio de e-mail via SMTP (nodemailer)
- Templates HTML para: alertas de disco, links de compartilhamento
- Configurável: host, porta, TLS, usuário, senha, remetente, destinatário

### 4.10 Banco de Dados SQLite

Tabelas criadas automaticamente na primeira inicialização:

| Tabela | Conteúdo |
|--------|----------|
| `shares` | Links de compartilhamento: token hash, studyUID, validade, acessos, senha |
| `share_access_log` | Log de acessos ao portal: IP, user-agent, data |
| `dicom_destinations` | Servidores DICOM cadastrados: AE Title, host, porta, echo status |
| `send_log` | Histórico de envios C-MOVE: destino, estudo, resultado |
| `dicom_events` | Eventos de C-MOVE/C-STORE e erros |
| `disk_alerts` | Histórico de alertas de disco (para cooldown) |
| `doctors` | Cadastro de médicos: nome, CRM, especialidade, e-mail |
| `doctor_patients` | Relação médico ↔ patientID |
| `notifications` | Fila/log de notificações enviadas |

---

## 5. Integração DICOMweb

### Protocolos suportados

| Protocolo | Uso no PACS Mini |
|-----------|-----------------|
| **QIDO-RS** | Busca de estudos, séries, instâncias, pacientes e worklist |
| **WADO-RS** | Thumbnails de séries (sem instance UID) |
| **STOW-RS** | Upload de arquivos DICOM |
| **dcm4chee REST API** | C-ECHO, C-MOVE, registro de devices, tasks |

### Endpoints DICOMweb utilizados

```
GET  /aets/{AET}/rs/studies                          → busca de estudos
GET  /aets/{AET}/rs/studies/{uid}/series             → séries de um estudo
GET  /aets/{AET}/rs/studies/{uid}/series/{uid}/instances → instâncias
GET  /aets/{AET}/rs/studies/{uid}/series/{uid}/thumbnail → thumbnail WADO-RS
GET  /aets/{AET}/rs/patients                         → busca de pacientes
GET  /aets/{AET}/rs/mwlitems                         → worklist MWL
POST /aets/{AET}/rs/studies                          → STOW-RS (upload)
GET  /aets/{AET}/rs/studies/{uid}                    → download ZIP
GET  /dcm4chee-arc/devices                           → lista de devices
GET  /dcm4chee-arc/devices/{name}                    → verificar device
POST /dcm4chee-arc/devices                           → registrar device AE
POST /dcm4chee-arc/aets/{AET}/dimse/{destAET}/studies/{uid}/export/dicom:{destAET}
                                                     → disparar C-MOVE
```

### Tags DICOM mapeadas

| Tag | Nome | Uso |
|-----|------|-----|
| `00080018` | SOPInstanceUID | Identificação de instância |
| `00080020` | StudyDate | Data do estudo |
| `00080030` | StudyTime | Hora do estudo |
| `00080050` | AccessionNumber | Número de acesso |
| `00080060` | Modality | Modalidade da série |
| `00080061` | ModalitiesInStudy | Modalidades do estudo |
| `0008103E` | SeriesDescription | Descrição da série |
| `00081030` | StudyDescription | Descrição do estudo |
| `00100010` | PatientName | Nome do paciente (PersonName) |
| `00100020` | PatientID | ID do paciente |
| `00100030` | PatientBirthDate | Data de nascimento |
| `00100040` | PatientSex | Sexo |
| `00180015` | BodyPartExamined | Parte do corpo |
| `0020000D` | StudyInstanceUID | UID do estudo |
| `0020000E` | SeriesInstanceUID | UID da série |
| `00200011` | SeriesNumber | Número da série |
| `00200013` | InstanceNumber | Número da instância |
| `00201206` | NumberOfStudyRelatedSeries | Total de séries |
| `00201208` | NumberOfStudyRelatedInstances | Total de instâncias |
| `00201209` | NumberOfSeriesRelatedInstances | Instâncias na série |
| `00280010` | Rows | Linhas da imagem |
| `00280011` | Columns | Colunas da imagem |
| `00320070` | RequestedProcedureDescription | Procedimento solicitado |
| `00400009` | ScheduledProcedureStepID | ID do passo agendado |
| `00400060` | ScheduledProcedureStepSequence | Sequência MWL |
| `00400002` | ScheduledProcedureStepStartDate | Data agendada MWL |
| `00400003` | ScheduledProcedureStepStartTime | Hora agendada MWL |

---

## 6. Segurança

### Autenticação

- **Bearer token** fixo (`API_SECRET`) — nunca exposto no frontend compilado como variável de ambiente em texto simples
- Comparação via `crypto.timingSafeEqual()` — resiste a timing attacks
- O `apiSecret` é embutido no bundle pelo Vite em tempo de build e enviado em cada requisição pelo interceptor do axios

### Rate Limiting

| Grupo de rotas | Janela | Limite (produção) |
|---------------|--------|------------------|
| Geral (`/api/*`) | 15 min | 300 req / IP |
| Sensível (auth, echo) | 15 min | 60 req / IP |
| Portal público (`/portal/*`) | 5 min | 30 req / tokenId |

### HTTP Security Headers (Nginx)

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
```

### Senhas de compartilhamento

- Hash com `bcryptjs` (cost factor 10) antes de armazenar
- Nunca armazenada em texto puro no banco de dados
- Verificação em tempo constante via bcrypt.compare

### Tokens de compartilhamento

- Gerados com `nanoid(12)` — 12 caracteres do alfabeto URL-safe
- Entropia: ~71 bits (alfabeto de 64 caracteres)
- Armazenados como hash no banco; o token original não é recuperável

### Rede (Docker)

- Rede `pacs-net` isolada: apenas `pacs-server` e `pacs-web` se comunicam
- `pacs-web` (nginx) é o único serviço com porta exposta para o host
- `pacs-server` não precisa ter porta exposta publicamente

---

## 7. Implantação

### Modos de implantação

#### A) MVP — dcm4chee já instalado (`docker-compose.mini.yml`)

Sobe apenas `pacs-server` + `pacs-web`. Conecta a um dcm4chee existente no host ou na rede.

```bash
cp .env.mini .env && nano .env
docker compose -f docker-compose.mini.yml up -d --build
```

#### B) Stack completo — dcm4chee incluso (`docker-compose.yml`)

Sobe dcm4chee completo (LDAP + PostgreSQL + WildFly) + PACS Mini.

```bash
cp .env.example .env && nano .env
docker compose up -d --build
```

### Variáveis de ambiente principais

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `API_SECRET` | Sim | Segredo de autenticação da API (mín. 32 chars) |
| `DCM4CHEE_BASE_URL` | Sim | URL interna do dcm4chee acessível pelo container |
| `DCM4CHEE_AET` | Sim | AE Title do dcm4chee (padrão: `DCM4CHEE`) |
| `FRONTEND_URL` | Sim | URL pública do frontend |
| `SHARE_BASE_URL` | Não | URL base para links do portal (padrão: `FRONTEND_URL`) |
| `DCM4CHEE_PUBLIC_HOST` | Não | Host público do dcm4chee (para thumbnails no browser) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Não | Configuração de e-mail |
| `DISK_WARN_PERCENT` | Não | Threshold de aviso de disco (padrão: 80%) |
| `DISK_CRITICAL_PERCENT` | Não | Threshold crítico de disco (padrão: 90%) |
| `DISK_CHECK_CRON` | Não | Expressão cron do monitoramento (padrão: `0 * * * *`) |
| `DISK_COOLDOWN_HOURS` | Não | Horas entre alertas de disco (padrão: 4) |

### Scripts utilitários

| Script | Função |
|--------|--------|
| `scripts/setup.sh` | Configuração inicial do ambiente |
| `scripts/backup.sh` | Backup do banco SQLite com timestamp |
| `scripts/restore.sh` | Restauração de backup |

---

## 8. Requisitos Técnicos

### Para rodar o PACS Mini

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| Docker Engine | 24+ | Última estável |
| Docker Compose V2 | 2.20+ | Última estável |
| RAM | 512 MB livres | 1 GB livres |
| Disco (app) | 500 MB | 1 GB |
| SO | Linux (kernel 5.4+) | Ubuntu 22.04 LTS |

### Para desenvolvimento local

| Requisito | Versão |
|-----------|--------|
| Node.js | 22.5.0+ (obrigatório para `node:sqlite`) |
| npm | 10+ |

```bash
npm install          # instala dependências de todos os workspaces
npm run dev          # Vite (frontend) na porta 5173
npm run dev:server   # ts-node-dev (backend) na porta 3500
npm run typecheck    # TypeScript sem emissão (ambos os pacotes)
npm run build        # build de produção de ambos
```

### Compatibilidade com dcm4chee

| Versão dcm4chee | Compatível |
|----------------|:---------:|
| 5.30+ | Sim |
| 5.34.x (testado) | Sim |
| 5.x anteriores | Provável (API estável) |
| 2.x / 4.x | Não |

---

## 9. Sumário de Endpoints da API

```
# Health
GET  /health

# Estudos / DICOMweb proxy
GET  /api/proxy/download/study/:studyUID
GET  /api/proxy/download/series/:studyUID/:seriesUID

# Compartilhamentos
GET    /api/shares
POST   /api/shares
DELETE /api/shares/:id

# Portal público (sem autenticação)
GET  /portal/:tokenId
GET  /portal/:tokenId/series
GET  /portal/:tokenId/instances/:seriesUID
GET  /portal/:tokenId/thumbnail/:seriesUID/:instanceUID
GET  /portal/:tokenId/download/:type

# Destinos DICOM
GET    /api/destinations
POST   /api/destinations
PUT    /api/destinations/:id
DELETE /api/destinations/:id
POST   /api/destinations/:id/echo

# Envio DICOM
POST /api/send/study
POST /api/send/patient

# Médicos
GET    /api/doctors
POST   /api/doctors
PUT    /api/doctors/:id
DELETE /api/doctors/:id
GET    /api/doctors/:id/patients
POST   /api/doctors/:id/patients
DELETE /api/doctors/:id/patients/:patientId

# Eventos DICOM
GET  /api/events
POST /api/events

# Disco
GET  /api/disk

# Notificações
POST /api/notify/test
```

---

*Documentação gerada em 2026-05-18 · PACS Mini v2.0*
