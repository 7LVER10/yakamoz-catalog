# Skill Creation SOP

Стандартная процедура создания нового Hermes/MiMo skill в YAKAMOZ.

---

## Purpose

Один skill = одна конкретная задача с чётким trigger, workflow и критерием "готово". Этот SOP гарантирует, что каждый новый skill можно найти, загрузить и выполнить без дополнительных уточнений.

---

## When to use

**Создавать skill когда:**
- Есть повторяющаяся задача (автоматизация, workflow, шаблон)
- Задача имеет чёткие входы/выходы
- Нужно, чтобы Hermes выполнял её автономно

**Не нужно skill когда:**
- Задача разовая и уникальная
- Нет чёткого trigger
- Достаточно обычного запроса в чат

---

## Input requirements

Перед созданием skill必须有:

| Поле | Описание |
|------|----------|
| **Цель** | Одно предложение: что делает skill |
| **Trigger** | Когда запускать (условие / запрос пользователя) |
| **Expected output** | Конкретный результат (файл, ответ, действие) |
| **Ограничения** | Чего skill НЕ делает, какие данные не трогает |
| **Workflow** | Пошаговый процесс (если есть) |
| **API / repo context** | Ссылки на API, репо, файлы (если используются) |

---

## Standard skill structure

Каждый skill хранится в папке `skills/<skill-name>/` и содержит:

```
skills/<skill-name>/
├── SKILL.md              ← Основной файл (frontmatter + тело)
└── references/           ← Доп. материалы (если нужны)
    └── workflows.md
```

### SKILL.md — YAML frontmatter

```yaml
---
name: skill-name-kebab-case
description: >
  Краткое описание (1–2 предложения) для поиска агентом.
domain: yakamoz
tags: [tag1, tag2, tag3]
version: "1.0"
author: 7LVER10
license: MIT
---
```

### SKILL.md — Markdown body

1. **When to Use** — триггер активации skill
2. **Prerequisites** — что нужно до запуска
3. **Workflow** — пошаговый процесс
4. **Verification** — как проверить, что skill выполнился
5. **Done Criteria** — конкретный признак успеха

---

## Creation workflow

1. **Определить задачу** — что именно повторяется и зачем
2. **Проверить существующие** — нет ли уже похожего skill в `skills/` или в `docs/hermes-n8n-workflows.md`
3. **Выбрать имя** — короткое, kebab-case, отражает суть (например: `smb-router`, `invoice-chase`)
4. **Заполнить frontmatter** — name, description, tags, version
5. **Описать workflow** — 3–7 шагов с конкретными действиями
6. **Добавить verification** — как агент поймёт, что задача выполнена
7. **Проверить на дубли** — убедиться, что нет конфликта с другими skills
8. **Сохранить** — `skills/<name>/SKILL.md`
9. **Протестировать** — Hermes должен найти skill по тегам и выполнить

---

## Quality gates

Перед сохранением проверь:

- [ ] Skill узкий, не расплывчатый
- [ ] Один trigger → один результат
- [ ] Нет лишней теории
- [ ] Есть done criteria
- [ ] Есть ограничения (что НЕ делает)
- [ ] Не конфликтует с AGENTS.md и agent-guidelines.md
- [ ] Имя уникально среди существующих skills

---

## Anti-patterns

| Нельзя | Почему |
|--------|--------|
| Giant mega-skill | Слишком много = нигде не работает |
| Vague wording | Агент не поймёт когда запускать |
| Нет verification | Невозможно проверить результат |
| Нет scope boundaries | Skill может сломать другие задачи |
| Дублирование | Два skill на одно — путаница |

---

## Example

### skills/smb-router/SKILL.md

```yaml
---
name: smb-router
description: >
  Маршрутизация входящих сообщений SMB из Telegram
  в нужный обработчик (заказ, вопрос, жалоба).
domain: yakamoz
tags: [telegram, smb, router, automation]
version: "1.0"
author: 7LVER10
---
```

**When to Use:**
При поступлении нового сообщения от SMB-клиента в Telegram.

**Prerequisites:**
- Telegram bot запущен
- N8N webhook активен

**Workflow:**
1. Получить сообщение из Telegram
2. Определить тип (заказ / вопрос / жалоба)
3. Маршрутизировать в соответствующий N8N workflow
4. Отправить подтверждение в Telegram

**Verification:**
- Сообщение доставлено в нужный workflow
- Клиент получил подтверждение

**Done Criteria:**
Тип определён, маршрут выбран, подтверждение отправлено.

---

## Next use

Ближайшие skills для создания по этому SOP:
- `invoice-chase` — автоматическая отправка напоминаний по счетам
- `lead-triage` — маршрутизация входящих лидов
