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

движение_ном  | склад (&склад) | Period(  , &dateStart.EndDay().AddDays(-1))  | GroupBy (номенклатура, колво as на_начало_)  as на_начало;
движение_ном | склад (&склад)  | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as приход_)  | Having(приход_ > 0) | GroupBy (номенклатура, приход_) as приход;
движение_ном | склад (&склад)  | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as расход_)  | Having(расход_< 0) | GroupBy (номенклатура, расход_)  as расход;
движение_ном | склад (&склад)  | Period(, &dateFinish) | Select (номенклатура, колво as на_конец)  | GroupBy (номенклатура, на_конец)  as на_конец;

TempTable.на_начало | FullJoinAuto(приход, приход.номенклатура =номенклатура) |  FullJoinAuto(расход, расход.номенклатура =номенклатура) |  FullJoinAuto(на_конец, на_конец.номенклатура =номенклатура)

| AddColumn (x, number, 0) | Coalesce (приход, приход_, x) | Coalesce (расход__, расход_, x)  | Coalesce (на_начало, на_начало_, x)
|  Compute(расход, расход__ * -1)
| DeleteColumn (на_начало_, приход_, расход_, расход__, x)
|  LeftJoinAuto(t1, t1.номенклатура =номенклатура) | группа (&группа) | OrderBy (номенклатура_title) 
| Compute(x, на_начало*на_начало+приход*приход+расход*расход+на_конец*на_конец) | Having (x>0) | OrderBy (номенклатура_title)
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
