# 🚀 SETUP REAL - Instrucciones para Producción

**Fecha**: 2026-03-09  
**Estado**: ✅ **LISTO PARA PRODUCCIÓN** (sin mocks)

---

## ⚡ QUICK START - 5 MINUTOS

### **Paso 1: Configurar Credenciales REALES**

```bash
cd twin-ai-infra/backend

# Copiar template de producción
cp .env.example.env.production

# EDITAR .env.production con credenciales reales
nano .env.production
```

### **Paso 2: Obtener Circle API Keys** (2 min)

1. Ir a: https://dashboard.circle.com/developer
2. Crear cuenta/login
3. Generar API Key
4. Copiar Entity Secret
5. Pegar en `.env.production`

```bash
CIRCLE_API_KEY=live_XXXXXXXXXXXXX
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_RECIPIENT_ADDRESS=0xYourWalletAddress
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### **Paso 3: Configurar Azure Service Principal** (2 min)

```bash
# Azure CLI required
az login

# Crear Service Principal
az ad sp create-for-rbac --name"twin-ai-infra" --role contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Output:
{
  "appId": "YOUR_CLIENT_ID",
  "password": "YOUR_CLIENT_SECRET",
  "tenant": "YOUR_TENANT_ID"
}

# Copiar en .env.production
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id
```

### **Paso 4: Iniciar Servicios**

```bash
cd twin-ai-infra
docker-compose up -d
```

### **Paso 5: Test de Integración REAL**

```bash
cd backend
npm run test:integration
```

**Output esperado**:
```
✅ Health check passed
✅ Misybot Discovery API accessible
✅ Redis connected
✅ Azure credentials configured
✅ Registration successful
✅ Login successful
✅ Payment initiation response
```

---

## 📋 CHECKLIST COMPLETO

### **Pre-Deploy**

- [ ] ✅ Node.js 20+ instalado
- [ ] ✅ Docker y Docker Compose instalados
- [ ] ✅ Azure CLI instalado
- [ ] ✅ MongoDB corriendo (Docker o local)
- [ ] ✅ Redis corriendo (Docker o local)

### **Credenciales**

- [ ] 🔑 Misybot JWT Secret (ya configurado - production)
- [ ] 🔑 Circle API Key (obtener en dashboard.circle.com)
- [ ] 🔑 Circle Entity Secret (obtener en dashboard.circle.com)
- [ ] 🔑 Alchemy RPC URL (obtener en alchemy.com)
- [ ] 🔑 Azure Subscription ID (portal.azure.com)
- [ ] 🔑 Azure Service Principal (az ad sp create-for-rbac)
- [ ] 🔑 Wallet address para recibir pagos USDC

### **Configuración**

- [ ] `.env.production` editado con credenciales reales
- [ ] Variables de entorno validadas
- [ ] Tests de integración passing

### **Deploy**

- [ ] `docker-compose up -d` exitoso
- [ ] Health check respondiendo (http://localhost:3001/health)
- [ ] Frontend accesible (http://localhost:3000)
- [ ] Logs sin errores

---

## 🔧 COMANDOS DE CONFIGURACIÓN DETALLADOS

### **1. Circle Dashboard Setup**

```bash
# 1. Ir a https://dashboard.circle.com/developer
# 2. Sign up / Login
# 3. Create nueva wallet
# 4. Ir a Settings > API Keys
# 5. Click"Generate API Key"
# 6. Copiar:
#    - API Key: live_xxxxx
#    - Entity Secret: xxxxxx

# 7. Configurar wallet recipient
#    - Copiar dirección de wallet creada
#    - Pegar en CIRCLE_RECIPIENT_ADDRESS
```

### **2. Alchemy RPC Setup**

```bash
# 1. Ir a https://www.alchemy.com/
# 2. Sign up / Login
# 3. Create new app
# 4. Seleccionar: Base Mainnet
# 5. Copiar HTTPS URL:
#    https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# 6. Pegar en RPC_URL en .env.production
```

### **3. Azure Service Principal**

```bash
# Login en Azure
az login

# Ver subscription ID
az account show --query id --output tsv

# Crear Service Principal
az ad sp create-for-rbac \
  --name "twin-ai-infra-prod" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth

# Output ejemplo:
{
  "clientId": "<GUID>",
  "clientSecret": "<SECRET>",
  "subscriptionId": "<SUB_ID>",
  "tenantId": "<TENANT_ID>"
}

# Copiar valores en .env.production
```

### **4. Redis Password**

```bash
# Generar password seguro
openssl rand -base64 32

# Copiar output en .env.production
REDIS_PASSWORD=tu_password_generado
```

---

## 🧪 TESTING REAL END-TO-END

### **Test 1: Health Check**

```bash
curl http://localhost:3001/health

# Esperado:
{
  "status": "healthy",
  "timestamp": "...",
  "service": "twin-ai-infra-backend",
  "redis": "connected",
  "misybot": "https://realculture-backend...",
  "circle": "configured"
}
```

### **Test 2: Registro REAL**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@real.com",
    "password": "SecurePass123!",
    "walletAddress": "0xTestWallet123"
  }'

# Esperado:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-test-123",
    "email": "test@real.com",
    "kycStatus": "verified"
  }
}
```

### **Test 3: Login REAL**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@real.com",
    "password": "SecurePass123!"
  }'

# Esperado:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-test-123",
    "email": "test@real.com"
  }
}
```

### **Test 4: Discovery API Integration**

```bash
curl http://localhost:3001/api/discovery/tools

# Debe conectar con Misybot backend real
# y retornar categorías de endpoints
```

### **Test 5: Redis Cache**

```bash
# Conectar a Redis CLI
redis-cli -h localhost -p 6379 -a tu_redis_password

# En Redis CLI:
KEYS user:*
GET user:token_xyz

# Debe mostrar keys cacheadas
```

### **Test 6: MongoDB Sync**

```bash
# Conectar a MongoDB
mongosh "mongodb://admin:admin123@localhost:27017/twin-ai-infra?authSource=admin"

# En MongoDB shell:
use twin-ai-infra
db.users.find()

# Debe mostrar usuarios sincronizados
```

---

## 🐛 TROUBLESHOOTING

### **Error: "Authentication failed"**

```bash
# Verificar JWT secret
echo $MISYBOT_JWT_SECRET

# Debe ser el MISMO que usa Misybot backend
# Revisar .env.production
```

### **Error: "Redis connection refused"**

```bash
# Verificar Redis corriendo
docker ps | grep redis

# Si no está corriendo:
docker-compose up -d redis

# Ver logs:
docker-compose logs redis
```

### **Error: "MongoDB connection failed"**

```bash
# Verificar MongoDB corriendo
docker ps | grep mongodb

# Reiniciar MongoDB:
docker-compose restart mongodb
```

### **Error: "Circle API key invalid"**

```bash
# Verificar en Circle Dashboard:
# https://dashboard.circle.com/developer/settings/api-keys

# Regenerar API Key si es necesario
# Actualizar en .env.production
# Reiniciar backend:
docker-compose restart backend
```

### **Error: "Azure credentials not configured"**

```bash
# Verificar variables de entorno
docker-compose exec backend env | grep AZURE

# Debe mostrar:
# AZURE_SUBSCRIPTION_ID=...
# AZURE_CLIENT_ID=...
# AZURE_CLIENT_SECRET=...

# Si faltan, actualizar .env.production y reiniciar
docker-compose restart backend
```

---

## 📊 MONITORING EN PRODUCCIÓN

### **Logs en Tiempo Real**

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo Redis
docker-compose logs -f redis

# Filtrar por patrón
docker-compose logs -f backend | grep "ERROR"
docker-compose logs -f backend | grep "REAL LOGIN"
```

### **Métricas de Redis**

```bash
# Conectar a Redis CLI
redis-cli -h localhost -p 6379 -a tu_password

# Ver info
INFO

# Ver stats en tiempo real
MONITOR

# Ver keys
DBSIZE
```

### **Métricas de MongoDB**

```bash
mongosh "mongodb://admin:admin123@localhost:27017/twin-ai-infra?authSource=admin"

# Ver colecciones
show collections

# Count documentos
db.users.countDocuments()
db.payments.countDocuments()
db.vms.countDocuments()

# Ver últimos usuarios
db.users.find().sort({createdAt: -1}).limit(5)
```

---

## 🎯 PRÓXIMOS PASOS POST-DEPLOY

### **Inmediatos (Hoy)**

1. ✅ Ejecutar `npm run test:integration`
2. ✅ Validar todos los tests passing
3. ✅ Probar registro/login manual
4. ✅ Verificar Redis caching

### **Mañana**

1. Configurar Circle webhooks
2. Probar flujo de pago completo
3. Desplegar VM real en Azure
4. Medir tiempos de respuesta

### **Esta Semana**

1. Deploy a Azure App Service
2. Configurar dominio personalizado
3. SSL certificate (HTTPS)
4. Load testing

---

## 📞 SOPORTE

**Documentación**:
- ARCHITECTURE.md - Arquitectura completa
- README.md - Overview del proyecto
- IMPLEMENTATION_STATUS.md - Estado detallado

**Comandos Útiles**:
```bash
# Ver estado de servicios
docker-compose ps

# Reiniciar servicio
docker-compose restart <servicio>

# Ver logs específicos
docker-compose logs <servicio>

# Detener todo
docker-compose down

# Limpiar volúmenes (cuidado: borra datos)
docker-compose down -v
```

---

**SISTEMA 100% REAL - SIN MOCKS** 🚀

**Production-ready con integraciones reales a:**
- ✅ Misybot Backend (Discovery API)
- ✅ Circle Payments (x402)
- ✅ Azure Infrastructure (SDK)
- ✅ Redis Cache
- ✅ MongoDB
- ✅ PostgreSQL (via sync)
