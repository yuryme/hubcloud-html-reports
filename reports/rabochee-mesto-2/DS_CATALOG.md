# DS Catalog

Автогенерируемый каталог запросов на основе `DS.txt` и `DS_FILTERS.txt`.
Редактировать вручную не обязательно.

## Block: main_query
- Target: report.main
- Status: active
- Applies-To: script.getDatasourceExpression
- Owner: user+agent

```dsl
деньги | period (&dateStart, &dateFinish) | номер_заказа(&orderId) | template(&registratorTemplateId) | registrator(&registratorId) |Select(id, registrator, date, row, budgetitem, companyaccount, partner, person, template, amount,  номер_заказа, комментарий, коммент_директор) | Gettitle() as t1;
TempTable.t1 | Select (id, date, registrator, row, registrator_title, budgetitem, budgetitem_title, template, номер_заказа, номер_заказа_title, комментарий, коммент_директор, amount)
```
