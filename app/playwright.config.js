module.exports = {
  testDir: './tests',
  testMatch: '**/*.test.js',
  timeout: 30000,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    trace: 'retain-on-failure'
  }
};
