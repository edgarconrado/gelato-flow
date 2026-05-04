module.exports = {
    useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    Link: 'Link',
    Stack: { Screen: 'Screen' },
    Tabs: { Screen: 'Screen' },
}