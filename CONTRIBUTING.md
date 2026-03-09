# 🤝 Guía de Contribución - Twin AI Infrastructure

¡Gracias por tu interés en contribuir! Este documento establece las guías para contribuir al proyecto.

## 📋 Tipos de Contribuciones

### 1. Reporte de Bugs
- Usar GitHub Issues
- Incluir descripción clara
- Agregar pasos para reproducir
- Mencionar entorno (OS, Node version)

### 2. Nuevas Features
- Abrir issue primero para discusión
- Esperar aprobación antes de codificar
- Seguir estándares de código existentes

### 3. Mejoras de Documentación
- Corregir errores ortográficos
- Clarificar secciones confusas
- Agregar ejemplos de uso

### 4. Tests
- Agregar tests para features nuevos
- Mejorar cobertura de código existente
- Reportar bugs encontrados en tests

## 🚀 Flujo de Trabajo

### Paso 1: Fork
```bash
git fork https://github.com/Alejob60/turbo-invention
```

### Paso 2: Clone
```bash
git clone https://github.com/TU_USUARIO/turbo-invention.git
cd twin-ai-infra
```

### Paso 3: Create Branch
```bash
git checkout -b feature/nombre-feature
```

**Nomenclatura de ramas**:
- `feature/nombre` - Nuevas características
- `fix/nombre` - Corrección de bugs
- `docs/nombre` - Cambios de documentación
- `test/nombre` - Tests
- `refactor/nombre` - Refactorización

### Paso 4: Make Changes
```bash
# Hacer cambios en el código
git add .
git commit -m "feat: Add nueva feature

Descripción detallada de los cambios.
Incluir motivación y contexto."
```

**Convenciones de commits**:
- `feat:` - Nueva característica
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Cambios de formato (sin lógica)
- `refactor:` - Refactorización
- `test:` - Agregar/modificar tests
- `chore:` - Cambios de configuración/build

### Paso 5: Push
```bash
git push origin feature/nombre-feature
```

### Paso 6: Pull Request
1. Ir a https://github.com/Alejob60/turbo-invention/pulls
2. Click "New Pull Request"
3. Seleccionar branch comparado
4. Llenar template de PR
5. Esperar review

## 📏 Estándares de Código

### TypeScript/JavaScript
```typescript
// ✅ BUENO - Tipado explícito
interface User {
  id: string;
  email: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
}

async function login(email: string, password: string): Promise<User> {
  // Implementación
}

// ❌ MALO - Sin tipos
const login = async (email, password) => {
  // Implementación
}
```

### Documentación
```typescript
/**
 * Verifica payment signature usando EIP-712
 * @param signature- Firma criptográfica del usuario
 * @param paymentDetails - Detalles del pago (amount, resource, nonce)
 * @returns Resultado de verificación con signer address
 */
async verifyPayment(signature: string, paymentDetails: PaymentDetails): Promise<PaymentVerification> {
  // Implementación
}
```

### Tests
```typescript
describe('Circle Gateway', () => {
  it('should verify valid payment signature', async () => {
    // Arrange
   const signature = '0x...';
   const details = { amount: '10000000', ... };

    // Act
   const result = await circleGateway.verifyPayment(signature, details);

    // Assert
   expect(result.valid).toBe(true);
   expect(result.signerAddress).toBeDefined();
  });
});
```

## 🧪 Testing Requirements

Antes de hacer submit de un PR:

```bash
# Instalar dependencias
npm install

# Ejecutar tests
npm run test:integration

# Verificar linting
npm run lint

# Build exitoso
npm run build
```

**Requisitos mínimos**:
- ✅ Todos los tests passing
- ✅ Sin errores de linting
- ✅ Build exitoso
- ✅ Cobertura> 80% (para features críticas)

## 🔍 Code Review Process

### Qué buscan los reviewers:
- [ ] Código sigue estándares
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] Sin breaking changes no documentados
- [ ] Performance considerations
- [ ] Security implications

### Timeline esperado:
- Primer review: 24-48 horas
- Feedback incorporation: Según complejidad
- Merge approval: Después de 2 approvals

## 📚 Recursos Útiles

### Documentación
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema
- [SETUP_REAL.md](./SETUP_REAL.md) - Setup producción
- [README.md](./README.md) - Overview general

### Herramientas
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Circle Developer Docs](https://developers.circle.com/)
- [Azure SDK Docs](https://learn.microsoft.com/en-us/azure/developer/javascript/)

## 💬 Comunicación

- **GitHub Issues**: Bugs y features
- **GitHub Discussions**: Questions y ideas generales
- **Email**: soporte@colombia-ti.com (asuntos sensibles)

## 🎯 Áreas que Necesitan Ayuda

### Prioritarias
1. **Security Layer** - Fraud detection implementation
2. **Testing** - Aumentar cobertura de tests
3. **Documentation** - Traducir a inglés/español
4. **Monitoring** - Prometheus + Grafana setup

### Secundarias
1. **UI/UX** - Mejorar dashboard frontend
2. **Performance** - Optimizaciones de base de datos
3. **DevOps** - CI/CD pipeline configuration
4. **Multi-cloud** - AWS y GCP integration

## 🏆 Reconocimientos

Contribuidores destacados serán reconocidos en:
- README.md (sección de contribuidores)
- Release notes
- Social media de Colombia TI

---

**¡Gracias por contribuir a Twin AI Infrastructure!** 🚀

Tu trabajo ayuda a construir la economía de agentes autónomos.
