# PACS Mini — Guia de Instalação Windows

> **Versão:** 2.0.0 | **SO Suportado:** Windows 10 (build 19041+) / Windows 11

---

## Sumário

1. [Pré-Requisitos](#1-pré-requisitos)
2. [Opção A — Docker Desktop (Recomendado)](#2-opção-a--docker-desktop-recomendado)
3. [Opção B — WSL2 + Docker Engine](#3-opção-b--wsl2--docker-engine)
4. [Configuração do .env](#4-configuração-do-env)
5. [Build e Inicialização](#5-build-e-inicialização)
6. [Acesso ao Sistema](#6-acesso-ao-sistema)
7. [Firewall e Portas](#7-firewall-e-portas)
8. [Troubleshooting Windows](#8-troubleshooting-windows)

---

## 1. Pré-Requisitos

### Hardware

| Recurso | Mínimo      | Recomendado  |
|---------|-------------|--------------|
| CPU     | 4 cores     | 8 cores      |
| RAM     | 8 GB        | 16 GB        |
| Disco   | 50 GB livre | 200 GB+ SSD  |
| SO      | Windows 10 21H2 | Windows 11 22H2+ |

### Requisitos do Sistema

- **Virtualização habilitada** no BIOS/UEFI (Intel VT-x ou AMD-V)
- **Hyper-V** ou **WSL2** habilitado
- Windows 10 build 19041 (versão 2004) ou superior

### Verificar virtualização

```powershell
# Abra o PowerShell como Administrador e execute:
systeminfo | findstr /i "hyper-v"
# Deve mostrar: "Hyper-V Requirements: VM Monitor Mode Extensions: Yes"
```

---

## 2. Opção A — Docker Desktop (Recomendado)

### 2.1 Instalar Docker Desktop

1. Baixe o instalador em: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Execute o instalador `Docker Desktop Installer.exe`
3. Na tela de configuração, marque:
   - ✅ **Use WSL 2 instead of Hyper-V** (recomendado)
   - ✅ **Add shortcut to desktop**
4. Reinicie o computador quando solicitado
5. Abra o Docker Desktop e aguarde ele inicializar (ícone na bandeja ficar verde)

### 2.2 Verificar instalação

```powershell
docker --version
# Docker version 26.x ou superior

docker compose version
# Docker Compose version v2.x
```

### 2.3 Configurar recursos (importante para dcm4chee)

O dcm4chee é pesado — ajuste os recursos do Docker Desktop:

1. Abra **Docker Desktop → Settings → Resources**
2. Configure:
   - **CPUs:** mínimo 4 (recomendado 6+)
   - **Memory:** mínimo 6 GB (recomendado 8 GB+)
   - **Swap:** 2 GB
   - **Disk image size:** 60 GB+
3. Clique em **Apply & Restart**

### 2.4 Clonar o repositório

```powershell
# No PowerShell ou Terminal do Windows
git clone https://github.com/sua-org/pacs-mini.git
cd pacs-mini
```

> Se não tiver Git: baixe em [https://git-scm.com/download/win](https://git-scm.com/download/win)

---

## 3. Opção B — WSL2 + Docker Engine

Use esta opção se preferir um ambiente Linux nativo dentro do Windows.

### 3.1 Habilitar WSL2

```powershell
# PowerShell como Administrador
wsl --install
# Reinicie o computador após a instalação
```

Após reiniciar, instale uma distribuição Linux (recomendado Ubuntu 24.04):

```powershell
wsl --install -d Ubuntu-24.04
```

Configure usuário e senha quando solicitado.

### 3.2 Instalar Docker Engine no WSL2

Abra o terminal Ubuntu (WSL2) e execute:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker Engine
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version
docker compose version
```

### 3.3 Clonar e continuar

```bash
# Dentro do WSL2 (Ubuntu)
git clone https://github.com/sua-org/pacs-mini.git
cd pacs-mini
```

> A partir daqui, todos os comandos são executados **dentro do terminal WSL2**, não no PowerShell.

---

## 4. Configuração do .env

### Opção A (Docker Desktop — PowerShell)

```powershell
# Copiar o template
copy .env.example .env

# Editar com Notepad
notepad .env
```

### Opção B (WSL2 — Terminal Ubuntu)

```bash
cp .env.example .env
nano .env
```

### Configurações obrigatórias no .env

```env
# IP da máquina Windows na rede local
# Para descobrir: rode "ipconfig" no PowerShell e copie o IPv4
FRONTEND_URL=http://192.168.1.100
SERVER_PUBLIC_URL=http://192.168.1.100:3500
DCM4CHEE_PUBLIC_HOST=192.168.1.100

# Gerar senhas seguras (veja abaixo como gerar no Windows)
API_SECRET=cole-aqui-uma-chave-de-64-caracteres
POSTGRES_PASSWORD=cole-aqui-uma-senha-forte
```

### Gerar senhas seguras no Windows

```powershell
# PowerShell — gerar API_SECRET (64 hex chars)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

# Ou instalar OpenSSL e usar:
# openssl rand -hex 32
```

### Descobrir seu IP local

```powershell
ipconfig | findstr "IPv4"
# Exemplo de saída: IPv4 Address. . . : 192.168.1.100
```

---

## 5. Build e Inicialização

### Docker Desktop (PowerShell na pasta do projeto)

```powershell
# Build de todas as imagens (primeira vez — pode demorar 10-20 min)
docker compose build

# Iniciar todos os serviços em background
docker compose up -d

# Acompanhar logs
docker compose logs -f

# Ver status dos containers
docker compose ps
```

### WSL2 (Terminal Ubuntu)

```bash
# Mesmos comandos
docker compose build
docker compose up -d
docker compose logs -f arc
```

### Aguardar inicialização

O **dcm4chee Archive** demora **3-7 minutos** para inicializar no Windows (mais lento que Linux).

```powershell
# Monitorar o arc até aparecer "WildFly Full ... started"
docker compose logs -f arc
```

---

## 6. Acesso ao Sistema

Após todos os containers estarem saudáveis:

| Interface            | URL                                    |
|----------------------|----------------------------------------|
| **PACS Mini Web**    | `http://localhost` ou `http://SEU-IP`  |
| **API Backend**      | `http://localhost:3500`                |
| **API Health**       | `http://localhost:3500/health`         |
| **dcm4chee Admin**   | `http://localhost:8080/dcm4chee-arc/ui`|

### Credenciais dcm4chee

| Campo   | Padrão  |
|---------|---------|
| Usuário | `admin` |
| Senha   | `admin` |

> ⚠️ Troque a senha do dcm4chee imediatamente!

---

## 7. Firewall e Portas

O Windows Firewall pode bloquear o acesso externo. Para liberar as portas:

```powershell
# PowerShell como Administrador

# Interface Web (HTTP)
netsh advfirewall firewall add rule name="PACS Mini Web" dir=in action=allow protocol=TCP localport=80

# API Backend
netsh advfirewall firewall add rule name="PACS Mini API" dir=in action=allow protocol=TCP localport=3500

# dcm4chee REST
netsh advfirewall firewall add rule name="PACS dcm4chee" dir=in action=allow protocol=TCP localport=8080

# DICOM C-STORE
netsh advfirewall firewall add rule name="PACS DICOM" dir=in action=allow protocol=TCP localport=11112
```

Ou via **Windows Defender Firewall → Regras de Entrada → Nova Regra → Porta**.

---

## 8. Troubleshooting Windows

### "Docker Desktop starting..." nunca termina

1. Abra o **Gerenciador de Tarefas** → verifique se "Docker Desktop" consome muita RAM
2. Aguarde até 3 minutos na primeira inicialização
3. Se travar: clique com botão direito no ícone Docker na bandeja → **Restart**
4. Se persistir: `wsl --shutdown` no PowerShell e reabra o Docker Desktop

### "error during connect: ... pipe/docker_engine"

O Docker Desktop não está em execução.

```powershell
# Iniciar Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Aguarde o ícone ficar verde na bandeja
```

### Erro de virtualização: "WSL 2 requires an update"

```powershell
# PowerShell como Administrador
wsl --update
wsl --set-default-version 2
```

### Container arc não sobe / sai com erro

```powershell
# Ver logs detalhados
docker compose logs arc

# Problema comum: pouca memória RAM alocada
# Solução: Docker Desktop → Settings → Resources → Memory → aumentar para 8 GB
```

### "port is already allocated" (porta em uso)

```powershell
# Verificar qual processo usa a porta (ex: 8080)
netstat -ano | findstr :8080

# Ver processo pelo PID
tasklist | findstr <PID>

# Ou trocar a porta no .env:
# ARC_HTTP_PORT=8081
# WEB_PORT=8888
```

### Performance lenta no WSL2

Certifique-se de que o projeto está dentro do sistema de arquivos do WSL2 (`/home/seu-usuario/`), **não** em `/mnt/c/` (disco Windows mapeado). Acessar arquivos via `/mnt/c/` é muito mais lento.

```bash
# Mover projeto para dentro do WSL2 (mais rápido)
cp -r /mnt/c/Users/SeuUsuario/pacs-mini ~/pacs-mini
cd ~/pacs-mini
```

### Antivírus bloqueando Docker

Alguns antivírus (Windows Defender, Kaspersky, etc.) podem interferir com Docker.

Adicione exclusões no antivírus para:
- `C:\Program Files\Docker\`
- `C:\Users\%USERNAME%\AppData\Local\Docker\`
- O processo `docker.exe` e `com.docker.backend.exe`

### Reinicialização completa (preservando dados)

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Comandos Úteis no Windows

```powershell
# Status dos containers
docker compose ps

# Logs em tempo real
docker compose logs -f

# Parar tudo
docker compose down

# Reiniciar um serviço
docker compose restart pacs-server

# Health check da API
Invoke-WebRequest -Uri http://localhost:3500/health | Select-Object -ExpandProperty Content

# Acessar bash dentro de um container
docker compose exec pacs-server sh
docker compose exec arc bash
```

---

## Autostart no Windows (Opcional)

Para o PACS Mini iniciar automaticamente com o Windows:

1. Configure o **Docker Desktop** para iniciar com o Windows:
   - Docker Desktop → Settings → General → ✅ **Start Docker Desktop when you log in**

2. Crie um arquivo `start-pacs.bat` na pasta do projeto:

```bat
@echo off
cd /d "%~dp0"
docker compose up -d
echo PACS Mini iniciado!
pause
```

3. Adicione um atalho para `start-pacs.bat` na pasta de Inicialização do Windows:
   - Pressione `Win + R` → digite `shell:startup` → arraste o atalho para lá

---

*PACS Mini v2.0.0 — NordikIA | dcm4chee-arc-light 5.34.3*
