# Code Review Checklist

## Для каждого PR проверять:

### 1. Correctness
- [ ] Код делает то, что заявлено в PR description
- [ ] Нет off-by-one ошибок
- [ ] Edge cases обработаны (пустые массивы, null, undefined)
- [ ] Error handling присутствует (try/catch, .catch())
- [ ] Нет race conditions

### 2. Security
- [ ] Нет hardcoded secrets/keys
- [ ] Input validation присутствует (query params, body)
- [ ] SQL injection невозможен (parameterized queries)
- [ ] XSS невозможен (escaping)
- [ ] Rate limiting на новых endpoints
- [ ] CSP headers не нарушены

### 3. Performance
- [ ] Нет N+1 queries
- [ ] Кэширование используется где нужно
- [ ] Нет memory leaks (setInterval, event listeners)
- [ ] Prepared statements для повторяющихся запросов
- [ ] Batch operations вместо циклов

### 4. Testing
- [ ] Tests написаны для нового кода
- [ ] Tests покрывают edge cases
- [ ] Tests не flaky (нет random, time-dependent)
- [ ] `npm test` проходит
- [ ] Coverage не уменьшился

### 5. Code Quality
- [ ] Код читаемый (имена переменных, функций)
- [ ] Нет дублирования кода (DRY)
- [ ] Функции <50 строк
- [ ] Модули <300 строк
- [ ] Нет unused imports/variables
- [ ] Comments только где нужно (не over-commenting)

### 6. Architecture
- [ ] Код следует existing patterns
- [ ] Нет circular dependencies
- [ ] Proper separation of concerns
- [ ] Config values в config.js, не hardcoded
- [ ] New modules добавлены в module exports

### 7. Documentation
- [ ] README обновлён (если user-facing changes)
- [ ] ADR добавлен (если architectural decision)
- [ ] JSDoc для новых public functions
- [ ] CHANGELOG обновлён

### 8. Deployment
- [ ] .env.example обновлён (если новые env vars)
- [ ] Dockerfile обновлён (если новые deps)
- [ ] k8s manifests обновлён (если infrastructure changes)
- [ ] vps.js deploy работает

## Blocking Issues (нельзя мержить)
- Hardcoded secrets
- SQL injection vulnerabilities
- Memory leaks
- Missing error handling
- Broken tests

## Non-blocking (можно мержить с TODO)
- Style improvements
- Performance optimizations (non-critical)
- Documentation gaps
- Test coverage gaps
