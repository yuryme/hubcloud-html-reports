# DS Catalog

Автогенерируемый каталог запросов на основе `DS.txt` и `DS_FILTERS.txt`.
Редактировать вручную не обязательно.

## Block: main_query
- Target: report.main
- Status: active
- Applies-To: script.getDatasourceExpression
- Owner: user+agent

```dsl
catalog.номенклатура | Select (id as номенклатура, title as номенклатура_title, группа) | Gettitle() as t1;

движение_ном | склад (&склад)  | Period(,&dateStart.EndDay().AddDays(-1)) | GroupBy(номенклатура, колво as на_начало_)  as на_начало;
движение_ном | склад (&склад) | операция (11) | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as приход_, операция)  | GroupBy (номенклатура, приход_, операция)  as приход;
движение_ном | склад (&склад)  | операция (14)  | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as расход_, операция)  | GroupBy (номенклатура, расход_, операция)  as расход;
движение_ном | склад (&склад)  | операция (15)  | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as возврат_, операция)  | GroupBy (номенклатура, возврат_, операция)  as возврат;
движение_ном | склад (&склад) | операция (10) | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as инвентаризация_, операция)  | GroupBy (номенклатура, инвентаризация_, операция)  as инвентаризация;
TempTable.на_начало | FullJoinAuto(приход, приход.номенклатура =номенклатура) |  FullJoinAuto(расход, расход.номенклатура =номенклатура) |  FullJoinAuto(возврат, возврат.номенклатура =номенклатура)
|  FullJoinAuto(инвентаризация, инвентаризация.номенклатура =номенклатура)
| AddColumn (x, number, 0) | Coalesce (приход, приход_, x) | Coalesce (расход__, расход_, x)  | Coalesce (на_начало, на_начало_, x) | Coalesce (возврат__, возврат_, x) |  Coalesce (инвентаризация, инвентаризация_, x)
| Compute(расход, расход__ * -1) | Compute(возврат, возврат__* -1)
| Compute(на_конец, на_начало + приход - расход - возврат+инвентаризация) | DeleteColumn (на_начало_, приход_, расход_, расход__, возврат_, возврат__, инвентаризация_, x)
| LeftJoinAuto(t1, t1.номенклатура =номенклатура) | группа (&группа) 
| Compute(x, на_начало*на_начало+приход*приход+расход*расход+на_конец*на_конец+возврат*возврат+инвентаризация*инвентаризация) | Having (x>0) | OrderBy (номенклатура_title)
```

## Block: product_group
- Target: filter.product_group.options
- Status: active
- Applies-To: script.loadHubCloudFilters
- Owner: user+agent

```dsl
catalog.группа | Select (id, title) | OrderBy (title)
```

## Block: warehouse
- Target: filter.warehouse.options
- Status: active
- Applies-To: script.loadHubCloudFilters
- Owner: user+agent

```dsl
catalog.склад | Select (id, title) | OrderBy (title)
```
