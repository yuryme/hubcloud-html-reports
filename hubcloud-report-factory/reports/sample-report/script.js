var vueApp = new Vue({
    el: "#root",
    data: {
        reportTitle: "Отчет по остаткам на складе",
        period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA"),
        period_to: new Date().toLocaleDateString("en-CA"),
        dataSourceMode: "hubcloud",
        mockDataUrl: "./mock-data.json",
        warehouseValue: "1",
        warehouseTitle: "Основной",
        groupValue: "5",
        groupTitle: "Хлеб",
        warehouseOptions: [],
        groupOptions: [],
        summaryCards: [],
        balanceColumns: [
            { key: "item_name", label: "Номенклатура", type: "text", alignClass: "text-left" },
            { key: "opening_balance", label: "Остаток на начало", type: "number", alignClass: "text-right" },
            { key: "incoming", label: "Приход", type: "number", alignClass: "text-right" },
            { key: "outgoing", label: "Расход", type: "number", alignClass: "text-right" },
            { key: "closing_balance", label: "Остаток на конец", type: "number", alignClass: "text-right" }
        ],
        balanceRows: [],
        sections: []
    },
    computed: {
        periodLabel: function() {
            return "Период: " + this.period_from + " - " + this.period_to;
        }
    },
    methods: {
        getQueryParameters: function() {
            var queryParameters = {};
            var externalParameters = window.HC_QUERY_PARAMETERS;

            if (externalParameters && typeof externalParameters === "object") {
                queryParameters = Object.assign({}, externalParameters);
            }

            var urlParams = new URLSearchParams(window.location.search);
            urlParams.forEach(function(value, key) {
                queryParameters[key] = value;
            });

            return queryParameters;
        },

        getFirstDefinedValue: function(source, aliases) {
            for (var i = 0; i < aliases.length; ++i) {
                if (Object.prototype.hasOwnProperty.call(source, aliases[i]) && source[aliases[i]] !== null && typeof source[aliases[i]] !== "undefined" && source[aliases[i]] !== "") {
                    return source[aliases[i]];
                }
            }

            return null;
        },

        normalizeParameterObject: function(value) {
            if (Array.isArray(value)) {
                return value.length > 0 ? this.normalizeParameterObject(value[0]) : { value: "", title: "" };
            }

            if (value && typeof value === "object") {
                var rawValue = value.id;
                if (typeof rawValue === "undefined" || rawValue === null || rawValue === "") {
                    rawValue = value.value;
                }
                if (typeof rawValue === "undefined" || rawValue === null || rawValue === "") {
                    rawValue = value.code;
                }
                if (typeof rawValue === "undefined" || rawValue === null) {
                    rawValue = "";
                }

                var rawTitle = value.title;
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = value.label;
                }
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = value.text;
                }
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = value.name;
                }
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = rawValue;
                }

                return {
                    value: String(rawValue),
                    title: String(rawTitle)
                };
            }

            if (value === null || typeof value === "undefined") {
                return { value: "", title: "" };
            }

            return {
                value: String(value),
                title: String(value)
            };
        },

        normalizeOptionList: function(items) {
            var normalized = [];

            for (var i = 0; i < items.length; ++i) {
                var item = items[i] || {};
                var rawValue = item.id;
                if (typeof rawValue === "undefined" || rawValue === null || rawValue === "") {
                    rawValue = item.value;
                }
                if (typeof rawValue === "undefined" || rawValue === null || rawValue === "") {
                    continue;
                }

                var rawTitle = item.title;
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = item.label;
                }
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = item.name;
                }
                if (typeof rawTitle === "undefined" || rawTitle === null || rawTitle === "") {
                    rawTitle = rawValue;
                }

                normalized.push({
                    value: String(rawValue),
                    title: String(rawTitle)
                });
            }

            return normalized;
        },

        findOptionTitle: function(options, value, fallbackTitle) {
            var normalizedValue = value === null || typeof value === "undefined" ? "" : String(value);

            for (var i = 0; i < options.length; ++i) {
                if (String(options[i].value) === normalizedValue) {
                    return options[i].title;
                }
            }

            return fallbackTitle || "";
        },

        onWarehouseChange: function() {
            this.warehouseTitle = this.findOptionTitle(this.warehouseOptions, this.warehouseValue, this.warehouseTitle);
        },

        onGroupChange: function() {
            this.groupTitle = this.findOptionTitle(this.groupOptions, this.groupValue, this.groupTitle);
        },

        syncFilterTitles: function() {
            this.onWarehouseChange();
            this.onGroupChange();
        },

        normalizeDateValue: function(value) {
            if (!value) {
                return "";
            }

            if (value instanceof Date && !isNaN(value.getTime())) {
                return value.toLocaleDateString("en-CA");
            }

            var dateValue = value.toString().trim();
            if (!dateValue) {
                return "";
            }

            var isoMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return isoMatch[1];
            }

            var ruMatch = dateValue.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/);
            if (ruMatch) {
                return ruMatch[3] + "-" + ruMatch[2] + "-" + ruMatch[1];
            }

            var parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleDateString("en-CA");
            }

            return "";
        },

        toPeriodBoundary: function(dateValue, isEndOfDay) {
            var normalizedDate = this.normalizeDateValue(dateValue);
            if (!normalizedDate) {
                return "";
            }

            return normalizedDate + (isEndOfDay ? " 23:59:59" : " 00:00:00");
        },

        shiftDateBoundary: function(dateValue, dayShift, isEndOfDay) {
            var normalizedDate = this.normalizeDateValue(dateValue);
            if (!normalizedDate) {
                return "";
            }

            var baseDate = new Date(normalizedDate + "T00:00:00");
            baseDate.setDate(baseDate.getDate() + dayShift);
            var shiftedDate = baseDate.toLocaleDateString("en-CA");
            return shiftedDate + (isEndOfDay ? " 23:59:59" : " 00:00:00");
        },

        detectDataSourceMode: function() {
            var queryParameters = this.getQueryParameters();
            var requestedMode = (queryParameters.mode || queryParameters.source || "").toString().toLowerCase();

            if (requestedMode === "mock" || requestedMode === "local") {
                return "mock";
            }

            if (requestedMode === "hubcloud" || requestedMode === "api") {
                return "hubcloud";
            }

            if (queryParameters.mock === "1" || queryParameters.mock === "true") {
                return "mock";
            }

            if (window.HC_QUERY_PARAMETERS && typeof window.HC_QUERY_PARAMETERS === "object") {
                return "hubcloud";
            }

            return "hubcloud";
        },

        initializeRuntime: function() {
            var queryParameters = this.getQueryParameters();
            var singleDate = this.getFirstDefinedValue(queryParameters, ["$h.date", "h.date", "date"]);
            var periodFromValue = this.getFirstDefinedValue(queryParameters, ["period_from", "date_from", "from", "$h.period_from", "h.period_from"]);
            var periodToValue = this.getFirstDefinedValue(queryParameters, ["period_to", "date_to", "to", "$h.period_to", "h.period_to"]);

            if (singleDate) {
                var normalizedSingleDate = this.normalizeDateValue(singleDate);
                if (normalizedSingleDate) {
                    this.period_from = normalizedSingleDate;
                    this.period_to = normalizedSingleDate;
                }
            } else {
                var normalizedFrom = this.normalizeDateValue(periodFromValue);
                var normalizedTo = this.normalizeDateValue(periodToValue);

                if (normalizedFrom) {
                    this.period_from = normalizedFrom;
                }
                if (normalizedTo) {
                    this.period_to = normalizedTo;
                }
            }

            var warehouseParameter = this.normalizeParameterObject(this.getFirstDefinedValue(queryParameters, ["warehouse", "склад", "$warehouse", "$склад"]));
            var groupParameter = this.normalizeParameterObject(this.getFirstDefinedValue(queryParameters, ["group", "product_group", "номенклатурная_группа", "группа", "$group", "$группа"]));

            if (warehouseParameter.value !== "") {
                this.warehouseValue = warehouseParameter.value;
                this.warehouseTitle = warehouseParameter.title;
            }

            if (groupParameter.value !== "") {
                this.groupValue = groupParameter.value;
                this.groupTitle = groupParameter.title;
            }

            this.dataSourceMode = this.detectDataSourceMode();
        },

        formatCell: function(value) {
            if (value === null || typeof value === "undefined") {
                return "";
            }

            return String(value);
        },

        formatNumber: function(value) {
            var numberValue = Number(value || 0);
            if (isNaN(numberValue)) {
                return "";
            }

            return numberValue.toLocaleString("ru-RU", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
            });
        },

        buildSummaryCards: function(rows) {
            var totalOpening = 0;
            var totalIncoming = 0;
            var totalOutgoing = 0;
            var totalClosing = 0;

            for (var i = 0; i < rows.length; ++i) {
                totalOpening += Number(rows[i].opening_balance || 0);
                totalIncoming += Number(rows[i].incoming || 0);
                totalOutgoing += Number(rows[i].outgoing || 0);
                totalClosing += Number(rows[i].closing_balance || 0);
            }

            this.summaryCards = [
                { label: "Позиций", value: String(rows.length) },
                { label: "На начало", value: this.formatNumber(totalOpening) },
                { label: "Приход", value: this.formatNumber(totalIncoming) },
                { label: "Расход", value: this.formatNumber(totalOutgoing) },
                { label: "На конец", value: this.formatNumber(totalClosing) }
            ];
        },

        buildSourceInfoSection: function(extraRows) {
            var rows = [
                { field: "Режим", value: this.dataSourceMode },
                { field: "Склад", value: this.warehouseTitle || "Не задан" },
                { field: "ID склада", value: this.warehouseValue || "Не задан" },
                { field: "Номенклатурная группа", value: this.groupTitle || "Не задана" },
                { field: "ID группы", value: this.groupValue || "Не задан" },
                { field: "Период c", value: this.period_from },
                { field: "Период по", value: this.period_to },
                { field: "Загружено строк", value: String(this.balanceRows.length) }
            ];

            if (Array.isArray(extraRows) && extraRows.length > 0) {
                rows = rows.concat(extraRows);
            }

            this.sections = [
                {
                    title: "Служебная информация",
                    columns: [
                        { key: "field", label: "Поле" },
                        { key: "value", label: "Значение" }
                    ],
                    rows: rows
                }
            ];
        },

        applyMockData: function(payload) {
            var rows = Array.isArray(payload.data) ? payload.data : [];
            this.balanceRows = rows;
            this.warehouseTitle = payload.warehouse || this.warehouseTitle || "Основной";
            this.groupTitle = payload.group || this.groupTitle || "Хлеб";
            this.buildSummaryCards(rows);
            this.buildSourceInfoSection();
        },

        formatDslLiteral: function(value) {
            if (value === null || typeof value === "undefined" || value === "") {
                return "";
            }

            var stringValue = String(value).trim();
            if (!stringValue) {
                return "";
            }

            if (/^-?\d+(?:\.\d+)?$/.test(stringValue)) {
                return stringValue;
            }

            if ((stringValue[0] === "'" && stringValue[stringValue.length - 1] === "'") || (stringValue[0] === '"' && stringValue[stringValue.length - 1] === '"')) {
                return stringValue;
            }

            return "'" + stringValue.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
        },

        buildHubCloudExpression: function() {
            var openingBoundary = this.shiftDateBoundary(this.period_from, -1, true);
            var dateStart = this.toPeriodBoundary(this.period_from, false);
            var dateFinish = this.toPeriodBoundary(this.period_to, true);
            var warehouseFilter = this.formatDslLiteral(this.warehouseValue);
            var groupFilter = this.formatDslLiteral(this.groupValue);
            var warehouseClause = warehouseFilter ? " | склад (" + warehouseFilter + ")" : "";
            var groupClause = groupFilter ? " | группа (" + groupFilter + ")" : "";

            return [
                "catalog.номенклатура | Select (id as номенклатура, title as номенклатура_title, группа) | Gettitle() as t1;",
                "",
                "движение_ном" + warehouseClause + " | Period(, " + openingBoundary + ") | GroupBy (номенклатура, колво as на_начало_) as на_начало;",
                "движение_ном" + warehouseClause + " | Period(" + dateStart + ", " + dateFinish + ") | Select (номенклатура, колво as приход_) | Having(приход_ > 0) | GroupBy (номенклатура, приход_) as приход;",
                "движение_ном" + warehouseClause + " | Period(" + dateStart + ", " + dateFinish + ") | Select (номенклатура, колво as расход_) | Having(расход_ < 0) | GroupBy (номенклатура, расход_) as расход;",
                "движение_ном" + warehouseClause + " | Period(, " + dateFinish + ") | Select (номенклатура, колво as на_конец) | GroupBy (номенклатура, на_конец) as на_конец;",
                "",
                "TempTable.на_начало | FullJoinAuto(приход, приход.номенклатура = номенклатура) | FullJoinAuto(расход, расход.номенклатура = номенклатура) | FullJoinAuto(на_конец, на_конец.номенклатура = номенклатура)",
                "| AddColumn (x, number, 0) | Coalesce (приход, приход_, x) | Coalesce (расход__, расход_, x) | Coalesce (на_начало, на_начало_, x)",
                "| Compute(расход, расход__ * -1)",
                "| DeleteColumn (на_начало_, приход_, расход_, расход__, x)",
                "| LeftJoinAuto(t1, t1.номенклатура = номенклатура)" + groupClause + " | OrderBy (номенклатура_title)",
                "| Compute(x, на_начало * на_начало + приход * приход + расход * расход + на_конец * на_конец) | Having (x > 0) | OrderBy (номенклатура_title)"
            ].join("\n");
        },

        buildOptionsExpression: function(sourceName) {
            return sourceName + " | Select (id, title) | OrderBy (title)";
        },

        normalizeHubCloudRow: function(item) {
            return {
                item_name: item["номенклатура_title"] || item.item_name || "",
                opening_balance: Number(item["на_начало"] || item.opening_balance || 0),
                incoming: Number(item["приход"] || item.incoming || 0),
                outgoing: Number(item["расход"] || item.outgoing || 0),
                closing_balance: Number(item["на_конец"] || item.closing_balance || 0)
            };
        },

        sendRequest: function(url, reqType, dataSend, doneCallback, failCallback) {
            $.ajax({
                url: url,
                type: reqType,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                data: dataSend
            })
                .done(doneCallback)
                .fail(failCallback);
        },

        executeDatasourceRequest: function(config, doneCallback, failCallback) {
            if (this.dataSourceMode === "mock") {
                $.getJSON(this.mockDataUrl)
                    .done(function(mockResponse) {
                        var normalizedResponse = mockResponse;

                        if (Array.isArray(mockResponse)) {
                            normalizedResponse = { isOK: true, data: mockResponse };
                        } else if (!mockResponse || typeof mockResponse !== "object" || !("isOK" in mockResponse)) {
                            normalizedResponse = { isOK: true, data: [] };
                        }

                        doneCallback(normalizedResponse);
                    })
                    .fail(function(jqXHR, textStatus, errorThrown) {
                        failCallback(jqXHR, textStatus, errorThrown);
                    });

                return;
            }

            this.sendRequest("/api/v1/datasource/execute/", "POST", JSON.stringify(config), doneCallback, failCallback);
        },

        loadMockFilters: function() {
            this.warehouseOptions = [
                { value: "1", title: "Основной" },
                { value: "2", title: "Резервный" }
            ];
            this.groupOptions = [
                { value: "5", title: "Хлеб" },
                { value: "6", title: "Булочки" }
            ];
            this.syncFilterTitles();
            return $.Deferred().resolve().promise();
        },

        loadHubCloudFilters: function() {
            var warehouseConfig = {
                expression: this.buildOptionsExpression("catalog.склад"),
                applyDimensionRights: true
            };
            var groupConfig = {
                expression: this.buildOptionsExpression("catalog.группа"),
                applyDimensionRights: true
            };

            var warehouseDeferred = $.Deferred();
            var groupDeferred = $.Deferred();

            this.executeDatasourceRequest(
                warehouseConfig,
                function(responseData) {
                    var items = Array.isArray(responseData.data) ? responseData.data : [];
                    this.warehouseOptions = this.normalizeOptionList(items);
                    warehouseDeferred.resolve();
                }.bind(this),
                function() {
                    this.warehouseOptions = [];
                    warehouseDeferred.resolve();
                }.bind(this)
            );

            this.executeDatasourceRequest(
                groupConfig,
                function(responseData) {
                    var items = Array.isArray(responseData.data) ? responseData.data : [];
                    this.groupOptions = this.normalizeOptionList(items);
                    groupDeferred.resolve();
                }.bind(this),
                function() {
                    this.groupOptions = [];
                    groupDeferred.resolve();
                }.bind(this)
            );

            return $.when(warehouseDeferred.promise(), groupDeferred.promise()).then(function() {
                this.syncFilterTitles();
            }.bind(this));
        },

        loadFilters: function() {
            if (this.dataSourceMode === "mock") {
                return this.loadMockFilters();
            }

            return this.loadHubCloudFilters();
        },

        loadMockReport: function() {
            $.getJSON(this.mockDataUrl)
                .done(function(response) {
                    this.applyMockData(response || {});
                }.bind(this))
                .fail(function() {
                    this.balanceRows = [];
                    this.summaryCards = [];
                    this.buildSourceInfoSection([{ field: "Статус", value: "Не удалось загрузить mock-data.json" }]);
                }.bind(this));
        },

        loadHubCloudReport: function() {
            var config = {
                expression: this.buildHubCloudExpression(),
                applyDimensionRights: true
            };

            this.executeDatasourceRequest(
                config,
                function(responseData) {
                    var responseItems = Array.isArray(responseData.data) ? responseData.data : [];
                    var normalizedRows = [];

                    for (var i = 0; i < responseItems.length; ++i) {
                        normalizedRows.push(this.normalizeHubCloudRow(responseItems[i]));
                    }

                    this.balanceRows = normalizedRows;
                    this.buildSummaryCards(normalizedRows);
                    this.buildSourceInfoSection([
                        { field: "Статус", value: normalizedRows.length > 0 ? "Данные загружены" : "Источник вернул 0 строк" },
                        { field: "Источник", value: "HubCloud datasource" }
                    ]);
                }.bind(this),
                function(jqXHR, textStatus, errorThrown) {
                    var errorText = (jqXHR && jqXHR.responseText) ? jqXHR.responseText : (errorThrown || textStatus || "Неизвестная ошибка");
                    this.balanceRows = [];
                    this.summaryCards = [];
                    this.buildSourceInfoSection([
                        { field: "Статус", value: "Ошибка загрузки" },
                        { field: "Ошибка", value: String(errorText).slice(0, 500) }
                    ]);
                }.bind(this)
            );
        },

        loadReport: function() {
            this.syncFilterTitles();

            if (this.dataSourceMode === "mock") {
                this.loadMockReport();
                return;
            }

            this.loadHubCloudReport();
        }
    },
    mounted: function() {
        this.initializeRuntime();
        this.loadFilters().always(function() {
            this.loadReport();
        }.bind(this));
    }
});
