# Отзывчивость управления

Здесь собраны изменения для [задачи #5](https://github.com/Planetary-Annihilation-Fandom/pa.dynastiya.server/issues/5). Исходные файлы установленной игры не заменяются.

| Файл | Назначение |
|---|---|
| `control_feedback.css` | Мгновенные CSS-переходы всех элементов и псевдоэлементов |
| `instant_motion.js` | Мгновенные jQuery-эффекты и завершение известных анимаций появления/исчезновения за 1 мс |
| `main.js` | Скрытие заставки и возврат из видео без ожидания animationend |

CSS и `instant_motion.js` подключены через `global_mod_list`, `main.js` через сцену `main`. Конечная геометрия, видимость и `pointer-events` панелей остаются под управлением исходных классов. Время чтения сообщений и готовность сцен сохраняются; непрерывные пульсации и боевые вспышки этой правкой не отключаются.

Общие правила UI находятся в [`docs/ui/README.md`](https://github.com/Planetary-Annihilation-Fandom/pa.dynastiya.server/blob/main/docs/ui/README.md) серверного репозитория. Изменения генератора планет вынесены в отдельную [задачу #11](https://github.com/Planetary-Annihilation-Fandom/pa.dynastiya.server/issues/11).
