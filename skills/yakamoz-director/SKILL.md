---
name: yakamoz-director
description: >
  Дирижёр и исполнитель для YAKAMOZ: IVA-проекты, сайты, инвойсы,
  деплой и контроль среды.
domain: yakamoz
tags: [director, orchestrator, IVA, website, invoice, deployment, environment]
version: "1.0"
author: 7LVER10
license: MIT
---

## When to Use

Используй этот skill, когда:
- приходит задача из IVA/Command Center (Operation Falcon и похожие),
- нужно спланировать/сделать сайт, инвойс или мини-деплой,
- нужно проверить состояние компа, браузера, рабочего окружения.

## Prerequisites

- Доступ к терминалу
- Доступ к файловой системе
- Доступ к браузеру (при необходимости)
- GitHub CLI авторизован (для деплоя)

## Workflow

### 1. Определи тип задачи

| Тип | Действие |
|-----|----------|
| IVA/проект | Загрузи наш слой: lead-triage, website-brief-intake, smb-router, invoice-chase |
| Сайт/лендинг | Добавь системные skills: popular-web-designs, sketch, plan |
| Инвойс/финансы | Работай с invoice-chase и smb-router |
| Деплой/репозиторий | Используй github-auth, github-pr-workflow, терминал |

### 2. Работа через браузер и окружение

Для задач, где нужно открыть сайт, дашборд, IVA или панель:
- используй встроенный browser tools Hermes:
  navigate → читать страницу → при необходимости делать скриншоты/лог
- Следи за состоянием окружения:
  при подозрениях на ошибки проверяй базовые логи, доступность сервисов, структуру папок

### 3. Делегирование и MiMo

Если шаг слишком тяжёлый для текущей модели (сложный код, длинный ресёрч, много шагов в деплое):
- сформулируй чёткое техзадание
- делегируй внешнему агенту (MiMo или другой код-агент)
- сам оставайся дирижёром

## Verification

- Тип задачи определён
- Нужные skills загружены
- Результат зафиксирован в HERMES_LOGS

## Done Criteria

Задача выполнена, результат проверен, лог записан.

## Limitations

Skill **НЕ** делает:
- Не включает тяжёлые MLOps- и видео-скиллы по умолчанию
- Не заменяет ручное управление деплоем
- Не принимает критические бизнес-решения без подтверждения

## References

- [skills/lead-triage](../lead-triage/SKILL.md) — классификация лидов
- [skills/invoice-chase](../invoice-chase/SKILL.md) — контроль счетов
- [skills/smb-router](../smb-router/SKILL.md) — маршрутизация входящих
- [skills/website-brief-intake](../website-brief-intake/SKILL.md) — сбор брифов
- [skills/README.md](../README.md) — реестр skills
