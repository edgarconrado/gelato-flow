// components/AnimatedSplash.tsx
// Splash screen animado con fade + scale suave.
// No requiere Lottie — usa Animated de React Native para máxima compatibilidad.

import { useEffect, useRef } from 'react'
import {
    View, Text, Image, StyleSheet, Animated, Dimensions,
} from 'react-native'
import * as SplashScreen from 'expo-splash-screen'

const { width } = Dimensions.get('window')

interface Props {
    onReady: () => void
}

export function AnimatedSplash({ onReady }: Props) {
    const opacity = useRef(new Animated.Value(0)).current
    const scale = useRef(new Animated.Value(0.85)).current
    const exitOpacity = useRef(new Animated.Value(1)).current

    useEffect(() => {
        SplashScreen.hideAsync()

        // Entrada: fade + spring scale
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1, duration: 600, useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1, tension: 40, friction: 8, useNativeDriver: true,
            }),
        ]).start(() => {
            setTimeout(() => {
                // Salida: fade out suave
                Animated.timing(exitOpacity, {
                    toValue: 0, duration: 350, useNativeDriver: true,
                }).start(() => onReady())
            }, 900)
        })
    }, [])

    return (
        <Animated.View style={[s.container, { opacity: exitOpacity }]}>
            <View style={s.ring1} />
            <View style={s.ring2} />

            <Animated.View style={[s.logoWrap, { opacity, transform: [{ scale }] }]}>
                <Image
                    source={require('../assets/icon.png')}
                    style={s.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Animated.View style={[s.textWrap, { opacity }]}>
                <Text style={s.appName}>Gelato Flow</Text>
                <Text style={s.tagline}>Sistema de gestión</Text>
            </Animated.View>

            <Animated.View style={[s.dotsWrap, { opacity }]}>
                <LoadingDots />
            </Animated.View>
        </Animated.View>
    )
}

function LoadingDots() {
    const dots = [
        useRef(new Animated.Value(0.3)).current,
        useRef(new Animated.Value(0.3)).current,
        useRef(new Animated.Value(0.3)).current,
    ]

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                    Animated.delay(600),
                ])
            ).start()

        animate(dots[0], 0)
        animate(dots[1], 200)
        animate(dots[2], 400)
    }, [])

    return (
        <View style={s.dots}>
            {dots.map((dot, i) => (
                <Animated.View key={i} style={[s.dot, { opacity: dot }]} />
            ))}
        </View>
    )
}

const INK = '#1A1A2E'
const MINT = '#3ECFB2'

const s = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    ring1: {
        position: 'absolute',
        width: width * 0.85, height: width * 0.85,
        borderRadius: width * 0.425,
        borderWidth: 1, borderColor: 'rgba(62,207,178,0.08)',
    },
    ring2: {
        position: 'absolute',
        width: width * 1.2, height: width * 1.2,
        borderRadius: width * 0.6,
        borderWidth: 1, borderColor: 'rgba(62,207,178,0.04)',
    },
    logoWrap: {
        width: 140, height: 140,
        borderRadius: 36, overflow: 'hidden',
        marginBottom: 32,
        shadowColor: MINT,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35, shadowRadius: 24,
        elevation: 16,
    },
    logo: { width: 140, height: 140 },
    textWrap: { alignItems: 'center', gap: 6 },
    appName: {
        fontSize: 28, fontWeight: '600',
        color: '#fff', letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 13, color: 'rgba(152,152,176,0.8)',
        letterSpacing: 2, textTransform: 'uppercase',
    },
    dotsWrap: { position: 'absolute', bottom: 80 },
    dots: { flexDirection: 'row', gap: 8 },
    dot: {
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: MINT,
    },
})