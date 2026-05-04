module.exports = {
    scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    removeNotificationSubscription: jest.fn(),
    AndroidImportance: { HIGH: 5 },
}