# Skills Overview

Этот файл описывает skills, которые используются для технологии создания отчетов в этом репозитории.

## Зачем они нужны

Skills фиксируют повторяемые части проектной технологии. Они не заменяют `START_HERE.md`, `COLLABORATION_PROTOCOL.md` и остальные правила проекта, а дополняют их.

## Какие skills есть

- `hubcloud-workflow`
  Общий процесс работы: локальная реализация, проверки, песочница, подготовка к переносу в HubCloud.

- `hubcloud-datasource-pattern`
  Подключение источника данных: путь от `mock-data.json` к реальному datasource, единая точка запроса и нормализация ответа.

- `hubcloud-filter-pattern`
  Фильтры отчета: загрузка option lists, отображение `title`, передача `id` в основной datasource.

- `hubcloud-report-style`
  Эталонный стиль проекта: канонический visual language, layout contract, KPI behavior, modal behavior, print behavior.

## Как они связаны

Обычный порядок такой:

1. Сначала `hubcloud-workflow`
2. Затем по задаче:
   - `hubcloud-datasource-pattern`
   - `hubcloud-filter-pattern`
   - `hubcloud-report-style`

`hubcloud-workflow` задает общий маршрут работы.
Остальные skills подключаются по типу задачи.

## Нужно ли помнить их названия

Нет, не обязательно.

Если задача сформулирована достаточно ясно, Codex может подобрать нужный skill по смыслу.
Если нужен явный вызов, используйте:

- `$hubcloud-workflow`
- `$hubcloud-datasource-pattern`
- `$hubcloud-filter-pattern`
- `$hubcloud-report-style`

## Практическая памятка

- Нужен общий процесс и проверки -> `hubcloud-workflow`
- Нужно подключить реальные данные -> `hubcloud-datasource-pattern`
- Нужно добавить или исправить фильтры -> `hubcloud-filter-pattern`
- Нужно привести отчет к эталонному стилю -> `hubcloud-report-style`
