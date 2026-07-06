# Skills Registry

Каталог проектных skills для Hermes/MiMo. Каждый skill = одна узкая задача с чётким workflow.

## Available skills

| Skill | Path | Purpose | When to Use | Does Not Do |
|-------|------|---------|-------------|-------------|
| lead-triage | `skills/lead-triage/SKILL.md` | Классификация входящих лидов: тип, приоритет, следующий шаг | Новый лид / заявка через сайт, Telegram, WhatsApp, email | Не отвечает клиенту, не создаёт КП, не меняет CRM |
| invoice-chase | `skills/invoice-chase/SKILL.md` | Контроль неоплаченных счетов: статус, follow-up, эскалация | Еженедельная проверка / по запросу / за 3 дня до дедлайна | Не отправляет сообщения, не меняет бухгалтерию, не обещает |
| smb-router | `skills/smb-router/SKILL.md` | Маршрутизация входящих SMB-сообщений: тип запроса → downstream-skill | Входящее сообщение из Telegram / WhatsApp / email / сайт | Не отвечает клиенту, не выполняет downstream-skill, не меняет CRM |
| website-brief-intake | `skills/website-brief-intake/SKILL.md` | Приём и структурирование брифа на сайт / лендинг | Клиент запрашивает сайт / лендинг, получен бриф | Не проектирует сайт, не генерирует дизайн, не обещает сроки |

## Usage rule

- Сначала проверь, нет ли уже подходящего skill в этом каталоге
- Один skill = один узкий workflow
- Skill не заменяет AGENTS.md и agent-guidelines.md
- Новые skills создавать по `docs/hermes/skill-creation-sop.md`

## Next candidates

| Skill | Описание | Связь с текущими |
|-------|----------|------------------|
| proposal-draft | Черновик КП по шаблону | Следующий шаг после lead-triage |
| appointment-followup | Напоминание о встрече | Дополняет invoice-chase (follow-up) |
