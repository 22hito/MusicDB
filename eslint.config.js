const globals = require('globals');

module.exports = [
  {
    files: ['wwwroot/app.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        YT: 'readonly',
        signalR: 'readonly',
      },
    },
    rules: {
      // vars:'local' — не чіпаємо верхньорівневі function-декларації: вони
      // викликаються з onclick="..." у index.html, лінтер цього не бачить.
      // args:'none' — те саме для catch(e){} з порожнім тілом (усюди в коді).
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-redeclare': 'warn',
      'no-var': 'warn',
    },
  },
  {
    files: ['wwwroot/sw.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
  },
];
