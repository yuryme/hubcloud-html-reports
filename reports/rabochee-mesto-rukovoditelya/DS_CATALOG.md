# DS Catalog

Автогенерируемый каталог запросов на основе `DS.txt` и `DS_FILTERS.txt`.
Редактировать вручную не обязательно.

## Block: main_query
- Target: report.main
- Status: active
- Applies-To: script.getDatasourceExpression
- Owner: user+agent

```dsl
деньги | period (&dateStart, &dateFinish) |Select(id, registrator, date, budgetitem, companyaccount, partner, person,  номер_заказа, комментарий, коммент_директор) | Gettitle() as t1;
TempTable.t1 | Select (id, date, registrator_title, номер_заказа, budgetitem_title,companyaccount_title, partner_title, person_title, комментарий, коммент_директор, amount)
```
