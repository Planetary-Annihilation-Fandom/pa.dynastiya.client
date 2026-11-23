![Dynastiya](assets/readme-banner_crop.png)

# Dynastiya

Dynastiya Client declares the client mods for Legion Expansion, Exiles Faction, and Second Wave Expansion. To host a game, enable [Dynastiya Server](https://github.com/Planetary-Annihilation-Fandom/pa.dynastiya.server) in Community Mods.

## Модели матча

`DynastiyaMatchModels` хранит JSON-значения в памяти сцены `live_game`. Контекст создаётся заново при входе в сцену и перезапуске симуляции; значения не переживают переподключение. Получение состава командеров восстанавливается из `army_state` сервера после переподключения. Данные клиента не ограничивают симуляцию.

Методы `get`, `set` и `remove` принимают имя и область: `{}` для матча, `{ army: id }` для армии, `{ army: id, player: id }` для игрока. Неизвестную армию или игрока нельзя заменять `null`. `get` возвращает `null`, если значения нет. Значения копируются через JSON.

Для панели используйте `api.Panel.query(api.Panel.parentId, 'panel.invoke', ['dynastiyaModels', null, 'context'])`, затем передавайте полученный токен в запросах `['dynastiyaModels', token, 'get', name, scope]` или `['dynastiyaModels', token, 'set', name, scope, value]`. После смены контекста старый токен отклоняется.

Модель `startingCommanderClasses` в области армии содержит массив `{ spec, classId }` в порядке слотов сервера. Повторяющиеся классы сохраняются, неизвестному командеру соответствует `classId: null`. У наблюдателя и в повторе нет подразумеваемой собственной армии: её идентификатор выбирает вызывающий код из данных игры.
