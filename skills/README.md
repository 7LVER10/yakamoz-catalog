# Skills Registry

Каталог проектных skills для Hermes/MiMo. Каждый skill = одна узкая задача с чётким workflow.

## Available skills

| Skill | Path | Purpose | When to Use | Does Not Do |
|-------|------|---------|-------------|-------------|
| lead-triage | `skills/lead-triage/SKILL.md` | Классификация входящих лидов: тип, приоритет, следующий шаг | Новый лид / заявка через сайт, Telegram, WhatsApp, email | Не отвечает клиенту, не создаёт КП, не меняет CRM |
| invoice-chase | `skills/invoice-chase/SKILL.md` | Контроль неоплаченных счетов: статус, follow-up, эскалация | Еженедельная проверка / по запросу / за 3 дня до дедлайна | Не отправляет сообщения, не меняет бухгалтерию, не обещает |

## Usage rule

- Сначала проверь, нет ли уже подходящего skill в этом каталоге
- Один skill = один узкий workflow
- Skill не заменяет AGENTS.md и agent-guidelines.md
- Новые skills создавать по `docs/hermes/skill-creation-sop.md`

## Next candidates

| Skill | Описание | Связь с текущими |
|-------|----------|------------------|
| smb-router | Маршрутизация сообщений SMB из Telegram | Расширяет lead-triage для Telegram |
| website-brief-intake | Приём брифа на сайт через форму | Связан с lead-triage (тип "заказ") |
| proposal-draft | Черновик КП по шаблону | Следующий шаг после lead-triage |
| appointment-followup | Напоминание о встрече | Дополняет invoice-chase (follow-up) |
