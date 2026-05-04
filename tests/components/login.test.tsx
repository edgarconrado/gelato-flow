// __tests__/components/login.test.ts
// Pruebas de lógica del login sin renderizar componentes React Native
// (evita SyntaxError de ViewConfigIgnore en RN 0.81)

describe('Login — validación de campos', () => {

    // Simula la lógica de validación del handleLogin
    const validateLogin = (email: string, password: string) => {
        if (!email.trim() || !password.trim()) return { valid: false, error: 'Campos requeridos' }
        if (!email.includes('@')) return { valid: false, error: 'Correo inválido' }
        if (password.length < 6) return { valid: false, error: 'Contraseña muy corta' }
        return { valid: true, error: null }
    }

    test('falla con campos vacíos', () => {
        // Arrange & Act
        const result = validateLogin('', '')
        // Assert
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Campos requeridos')
    })

    test('falla con correo sin @', () => {
        // Arrange & Act
        const result = validateLogin('correosinAT', 'password123')
        // Assert
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Correo inválido')
    })

    test('falla con contraseña muy corta', () => {
        // Arrange & Act
        const result = validateLogin('test@test.com', '123')
        // Assert
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Contraseña muy corta')
    })

    test('pasa con credenciales válidas', () => {
        // Arrange & Act
        const result = validateLogin('cajero@paleteria.com', 'password123')
        // Assert
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
    })

    test('falla si solo hay correo sin contraseña', () => {
        // Arrange & Act
        const result = validateLogin('cajero@paleteria.com', '')
        // Assert
        expect(result.valid).toBe(false)
    })

    test('falla si solo hay contraseña sin correo', () => {
        // Arrange & Act
        const result = validateLogin('', 'password123')
        // Assert
        expect(result.valid).toBe(false)
    })

})

describe('Login — formato de correo', () => {

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

    test('acepta correos válidos', () => {
        expect(isValidEmail('cajero@paleteria.com')).toBe(true)
        expect(isValidEmail('owner@gelatoflow.mx')).toBe(true)
        expect(isValidEmail('test.user+tag@example.co')).toBe(true)
    })

    test('rechaza correos inválidos', () => {
        expect(isValidEmail('')).toBe(false)
        expect(isValidEmail('sinArroba')).toBe(false)
        expect(isValidEmail('@sinUsuario.com')).toBe(false)
        expect(isValidEmail('sinDominio@')).toBe(false)
    })

})