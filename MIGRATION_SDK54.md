# Guía de Migración: SDK 51 → SDK 54
## Paletería App

---

## ⚡ Comandos de limpieza e instalación limpia

Ejecuta estos comandos **en orden** desde la raíz del proyecto:

```bash
# 1. Eliminar node_modules y archivos de bloqueo
rm -rf node_modules
rm -f package-lock.json yarn.lock

# 2. Limpiar caché de Expo y Metro
npx expo install --fix   # (después de npm install)
npx expo start --clear   # borra caché de Metro al arrancar

# 3. Instalar dependencias limpias
npm install

# 4. Dejar que Expo corrija versiones incompatibles automáticamente
npx expo install --fix

# 5. Verificar salud del proyecto
npx expo-doctor

# 6. Arrancar con caché limpio
npx expo start --clear
```

> **Tip:** Si usas yarn en lugar de npm:
> ```bash
> rm -rf node_modules yarn.lock
> yarn install
> npx expo install --fix
> ```

---

## 🔄 Cambios entre SDK 51 → SDK 54

### 1. React Native & React
| | SDK 51 | SDK 54 |
|---|---|---|
| React Native | 0.74.x | **0.81.4** |
| React | 18.2.0 | **19.1.0** |
| New Architecture | Opcional | **Activa por defecto** |

### 2. expo-router: v3 → v6
El cambio más importante. expo-router v6 es compatible con React 19 y trae:
- Soporte para la pestaña inferior estilo iOS 26
- Mejor manejo de `useSegments()` con grupos `(tabs)`
- `GestureHandlerRootView` ahora es **obligatorio** en el layout raíz

**Archivo afectado:** `app/_layout.tsx` ✅ Ya actualizado

### 3. react-native-reanimated: v3 → v4
Reanimated v4 requiere `react-native-worklets` como peer dependency y
**solo soporta la New Architecture** (que ya está activa en SDK 54).

**Cambio en babel.config.js:** Ya NO necesitas agregar el plugin manualmente:
```js
// ❌ SDK 51 — tenías que agregar esto:
plugins: ['react-native-reanimated/plugin']

// ✅ SDK 54 — babel-preset-expo lo maneja automáticamente
presets: ['babel-preset-expo']
```

**Archivo afectado:** `babel.config.js` ✅ Ya actualizado

### 4. expo-secure-store: v13 → v14
API de bajo nivel es la misma (`getItemAsync`, `setItemAsync`, `deleteItemAsync`),
pero ahora acepta opciones de autenticación biométrica. Agregamos manejo de errores
en el adaptador para evitar crashes si SecureStore no está disponible.

**Archivo afectado:** `lib/supabase.ts` ✅ Ya actualizado

### 5. @expo/vector-icons: v14 → v15
Compatible con React 19. Sin breaking changes de API.

### 6. zustand: v4 → v5
Sin breaking changes en el uso básico con `create()`. Se eliminaron
algunos exports deprecados que no usamos en este proyecto.

### 7. Android: Edge-to-Edge habilitado por defecto
SDK 54 con React Native 0.81 activa edge-to-edge en Android 16+.
Ya lo manejamos con `react-native-safe-area-context` en todas las pantallas
usando `SafeAreaView`, por lo que **no requiere cambios** en el código.

**En `app.json`** se agregó:
```json
"android": {
  "edgeToEdgeEnabled": true
}
```

### 8. Node.js mínimo
SDK 54 requiere **Node.js 20.19.4 o superior**.

```bash
node --version  # Verifica que sea >= 20.19.4
```

---

## 🩺 Verificación post-instalación

```bash
# Debe mostrar solo ✅ o advertencias menores
npx expo-doctor

# Verifica versiones esperadas vs instaladas
npx expo install --check
```

Salida esperada de `expo-doctor`:
```
✅ Check Expo config for common issues
✅ Check package.json for common issues
✅ Check dependencies are compatible with installed expo package version
✅ Check for common project setup issues
```

---

## ❓ Problemas comunes y soluciones

**Error: `Reanimated worklets version mismatch`**
```bash
npx expo install react-native-worklets
```

**Error: `Missing peer dependency @expo/metro-runtime`**
```bash
npx expo install @expo/metro-runtime
```

**Error: `Incompatible React versions`**
No actualices React a 19.2.x manualmente — usa exactamente `19.1.0`
que es la versión que Expo SDK 54 certifica.

**Error en iOS: `CocoaPods fast_float`**
```bash
cd ios && pod install --repo-update
```
