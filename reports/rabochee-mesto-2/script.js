(function(global) {
  'use strict';

  function getQueryParameters(search, externalParameters) {
    var queryParameters = {};

    if (externalParameters && typeof externalParameters === 'object') {
      queryParameters = Object.assign({}, externalParameters);
    }

    var urlParams = new URLSearchParams(search || '');
    urlParams.forEach(function(value, key) {
      queryParameters[key] = value;
    });

    return queryParameters;
  }

  function normalizeDateValue(value) {
    if (!value) {
      return '';
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toLocaleDateString('en-CA');
    }

    var dateValue = String(value).trim();
    var iso = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) {
      return iso[1];
    }

    var ru = dateValue.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (ru) {
      return ru[3] + '-' + ru[2] + '-' + ru[1];
    }

    var parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-CA');
    }

    return '';
  }

  function toIsoDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-CA');
  }

  function toPeriodBoundary(dateValue, isEndOfDay) {
    var normalizedDate = normalizeDateValue(dateValue);
    if (!normalizedDate) {
      return '';
    }
    return normalizedDate + (isEndOfDay ? ' 23:59:59' : ' 00:00:00');
  }

  function getStandardPeriodModes() {
    return [
      { key: 'day', label: 'День' },
      { key: 'month', label: 'Месяц' },
      { key: 'quarter', label: 'Квартал' },
      { key: 'year', label: 'Год' },
      { key: 'custom', label: 'Произвольный' },
      { key: 'unlimited', label: 'Без ограничения' }
    ];
  }

  function addMonths(date, delta) {
    var result = new Date(date.getTime());
    result.setDate(1);
    result.setMonth(result.getMonth() + delta);
    return result;
  }

  function addYears(date, delta) {
    var result = new Date(date.getTime());
    result.setDate(1);
    result.setFullYear(result.getFullYear() + delta);
    return result;
  }

  function getMonthLabel(date) {
    return date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    }).replace(/^./, function(char) { return char.toUpperCase(); });
  }

  function getQuarterNumber(date) {
    return Math.floor(date.getMonth() / 3) + 1;
  }

  function getQuarterStart(date) {
    return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
  }

  function getQuarterEnd(date) {
    return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 3, 0);
  }

  function getPeriodAnchorDate(periodState) {
    var anchor = normalizeDateValue(periodState && periodState.periodAnchor);
    return anchor ? new Date(anchor + 'T00:00:00') : new Date();
  }

  function buildStandardPeriodState(queryParameters) {
    var normalizedQuery = queryParameters || {};
    var anchor = normalizeDateValue(normalizedQuery.date || normalizedQuery.dateStart || new Date());
    var mode = String(normalizedQuery.periodMode || normalizedQuery.period || 'day').toLowerCase();
    var allowedModes = ['day', 'month', 'quarter', 'year', 'custom', 'unlimited'];

    if (allowedModes.indexOf(mode) < 0) {
      mode = 'day';
    }

    return {
      periodMode: mode,
      periodAnchor: anchor,
      customDateStart: anchor,
      customDateFinish: normalizeDateValue(normalizedQuery.dateFinish || normalizedQuery.dateStart || anchor),
      showPeriodMenu: false,
      periodModes: getStandardPeriodModes()
    };
  }

  function getPeriodRange(periodState) {
    var state = periodState || {};
    var anchor = getPeriodAnchorDate(state);
    var start;
    var finish;

    if (state.periodMode === 'unlimited') {
      return { start: '', finish: '' };
    }

    if (state.periodMode === 'custom') {
      return {
        start: normalizeDateValue(state.customDateStart),
        finish: normalizeDateValue(state.customDateFinish || state.customDateStart)
      };
    }

    if (state.periodMode === 'month') {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      finish = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    } else if (state.periodMode === 'quarter') {
      start = getQuarterStart(anchor);
      finish = getQuarterEnd(anchor);
    } else if (state.periodMode === 'year') {
      start = new Date(anchor.getFullYear(), 0, 1);
      finish = new Date(anchor.getFullYear(), 11, 31);
    } else {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      finish = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    }

    return {
      start: toIsoDate(start),
      finish: toIsoDate(finish)
    };
  }

  function formatDateLabel(value) {
    var normalizedDate = normalizeDateValue(value);
    if (!normalizedDate) {
      return '';
    }
    var parts = normalizedDate.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function formatPeriodLabel(periodState) {
    var state = periodState || {};
    var range = getPeriodRange(state);
    var anchor = getPeriodAnchorDate(state);

    if (state.periodMode === 'unlimited') {
      return 'Без ограничения';
    }
    if (state.periodMode === 'custom') {
      if (!range.start || !range.finish) {
        return 'Произвольный';
      }
      return formatDateLabel(range.start) + '-' + formatDateLabel(range.finish);
    }
    if (state.periodMode === 'month') {
      return getMonthLabel(anchor);
    }
    if (state.periodMode === 'quarter') {
      return getQuarterNumber(anchor) + ' квартал ' + anchor.getFullYear();
    }
    if (state.periodMode === 'year') {
      return String(anchor.getFullYear());
    }
    return formatDateLabel(range.start);
  }

  function canShiftPeriod(periodState) {
    var state = periodState || {};
    return state.periodMode !== 'custom' && state.periodMode !== 'unlimited';
  }

  function shiftPeriodState(periodState, delta) {
    var state = Object.assign({}, periodState || {});
    if (!canShiftPeriod(state)) {
      return state;
    }

    var anchor = getPeriodAnchorDate(state);
    if (state.periodMode === 'month') {
      anchor = addMonths(anchor, delta);
    } else if (state.periodMode === 'quarter') {
      anchor = addMonths(anchor, delta * 3);
    } else if (state.periodMode === 'year') {
      anchor = addYears(anchor, delta);
    } else {
      anchor.setDate(anchor.getDate() + delta);
    }

    state.periodAnchor = toIsoDate(anchor);
    return state;
  }

  function formatDslLiteral(value) {
    if (Array.isArray(value)) {
      var parts = [];

      for (var i = 0; i < value.length; ++i) {
        var current = formatDslLiteral(value[i]);
        if (current !== "''") {
          parts.push(current);
        }
      }

      return parts.length > 0 ? parts.join(', ') : "''";
    }

    if (value === null || typeof value === 'undefined') {
      return "''";
    }

    var str = String(value).trim();
    if (!str) {
      return "''";
    }
    if (/^-?\d+(?:\.\d+)?$/.test(str)) {
      return str;
    }

    return "'" + str.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }

  function sanitizeDslNumericLiterals(expression) {
    return String(expression || '').replace(/\(\s*'(-?\d+(?:\.\d+)?)'\s*\)/g, '($1)');
  }

  function replaceDsPlaceholders(expression, tokenMap) {
    var out = String(expression || '');
    var keys = Object.keys(tokenMap || {}).sort(function(a, b) {
      return b.length - a.length;
    });

    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i];
      out = out.split('&' + key).join(tokenMap[key]);
    }

    return out;
  }

  function getResponseDataItems(responseData) {
    return Array.isArray(responseData && responseData.data) ? responseData.data : [];
  }

  function normalizeReportRows(items, rowNormalizer) {
    var sourceItems = Array.isArray(items) ? items : [];
    var out = [];

    for (var i = 0; i < sourceItems.length; ++i) {
      out.push(rowNormalizer(sourceItems[i] || {}));
    }

    return out;
  }

  var core = global.HC_REPORT_CORE || {
    getQueryParameters: getQueryParameters,
    normalizeDateValue: normalizeDateValue,
    toPeriodBoundary: toPeriodBoundary,
    buildStandardPeriodState: buildStandardPeriodState,
    getPeriodRange: getPeriodRange,
    formatPeriodLabel: formatPeriodLabel,
    canShiftPeriod: canShiftPeriod,
    shiftPeriodState: shiftPeriodState,
    formatDslLiteral: formatDslLiteral,
    sanitizeDslNumericLiterals: sanitizeDslNumericLiterals,
    replaceDsPlaceholders: replaceDsPlaceholders,
    getResponseDataItems: getResponseDataItems,
    normalizeReportRows: normalizeReportRows
  };
  var fallbackConfig = {
    title: 'Рабочее место руководителя',
    tabs: [
      { key: 'expenses', title: 'По документам' },
      { key: 'kp', title: 'По статьям' },
      { key: 'kpi', title: 'По КП' }
    ],
    columns: [
      { key: 'registrator_title', title: 'Операция' },
      { key: 'date', title: 'Дата' },
      { key: 'budgetitem_title', title: 'Статья' },
      { key: 'номер_заказа_title', title: 'Номер заказа' },
      { key: 'комментарий', title: 'Комментарий' },
      { key: 'коммент_директор', title: 'Комментарий директора' },
      { key: 'amount', title: 'Сумма, руб', isTotal: true }
    ],
    datasourceExpression:
      'деньги | period (&dateStart, &dateFinish) | номер_заказа(&orderId) | template(&registratorTemplateId) | registrator(&registratorId) |Select(id, registrator, date, row, budgetitem, companyaccount, partner, person, template, amount,  номер_заказа, комментарий, коммент_директор) | Gettitle() as t1;\n' +
      'TempTable.t1 | Select (id, date, registrator, row, registrator_title, budgetitem, budgetitem_title, template, номер_заказа, номер_заказа_title, комментарий, коммент_директор, amount)',
    datasourceExpressionKpi:
      'operation.кп |  заказ_договор (&orderId) | Select (id, date, заказ_договор, заказ_договор_title, коммент_директор) | Gettitle() \n' +
      '| AddColumn(dateStart, DateTime, &dateStart) | AddColumn(dateFinish_, DateTime, &dateFinish) | ComputeFunction(dateFinish, dateFinish_.EndDay()) \n' +
      '| Having (date>=dateStart AND date<=dateFinish)'
  };

  var TEMPLATE_OPERATION_MAP = {
    '21': 'приход_дс',
    '22': 'оплата_дс',
    '24': 'выплата_зп'
  };

  function getConfig() {
    var fromGlobal =
      global.reportConfig && typeof global.reportConfig === 'object'
        ? global.reportConfig
        : (
          global.HC_REPORT_DEFAULT_CONFIG && typeof global.HC_REPORT_DEFAULT_CONFIG === 'object'
            ? global.HC_REPORT_DEFAULT_CONFIG
            : {}
        );
    return {
      title: fromGlobal.title || fallbackConfig.title,
      tabs: Array.isArray(fromGlobal.tabs) && fromGlobal.tabs.length ? fromGlobal.tabs : fallbackConfig.tabs,
      columns: Array.isArray(fromGlobal.columns) && fromGlobal.columns.length ? fromGlobal.columns : fallbackConfig.columns,
      datasourceExpression: fromGlobal.datasourceExpression || fallbackConfig.datasourceExpression,
      datasourceExpressionKpi: fromGlobal.datasourceExpressionKpi || fallbackConfig.datasourceExpressionKpi
    };
  }

  function toPlainValue(value) {
    if (value === null || typeof value === 'undefined') {
      return '';
    }
    return String(value);
  }

  function ensureRowKey(row, fallbackIndex) {
    if (row && row.__rowKey) {
      return String(row.__rowKey);
    }

    var parts = [];
    if (row) {
      parts.push(toPlainValue(row.id));
      parts.push(toPlainValue(row.registrator_title || row.registrator));
      parts.push(toPlainValue(row.date));
      parts.push(toPlainValue(row.budgetitem_title || row.budgetitem));
      parts.push(toPlainValue(row['номер_заказа']));
    }

    parts.push(String(typeof fallbackIndex === 'number' ? fallbackIndex : 0));
    return parts.join('|');
  }

  function cloneRow(item, index) {
    var row = Object.assign({}, item || {});
    row.__rowKey = ensureRowKey(row, index);
    return row;
  }

  function parseAmount(value) {
    var normalized = toPlainValue(value).replace(/\s+/g, '').replace(',', '.');
    var amount = Number(normalized);
    return isFinite(amount) ? amount : 0;
  }

  function formatShortDate(value) {
    var source = toPlainValue(value).trim();
    var iso = source.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) {
      return iso[1];
    }
    return source;
  }

  function formatAmount(value) {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  function normalizeDirectorCommentFromSource(value) {
    var text = toPlainValue(value);
    if (text === '""' || text === '!') {
      return '';
    }
    if (text.charAt(0) === '!') {
      return text.slice(1);
    }
    return text;
  }

  function buildDirectorCommentForPayload(value) {
    var sanitized = toPlainValue(value).replace(/,/g, '');
    return sanitized === '' ? '!' : sanitized;
  }

  function parseRegistratorComposite(value) {
    var parts = toPlainValue(value).split('|');
    if (parts.length < 2) {
      return {
        template: '',
        registrator: toPlainValue(parts[0])
      };
    }
    return {
      template: toPlainValue(parts[0]),
      registrator: toPlainValue(parts[1])
    };
  }

  function getPreviousMonthAnchorIso() {
    var now = new Date();
    var previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return toIsoDate(previousMonth);
  }

  function buildTokenMap(vm) {
    var range = core.getPeriodRange(vm) || { start: '', finish: '' };
    var registratorFilter = parseRegistratorComposite(vm.selectedRegistratorId);
    return {
      dateStart: core.toPeriodBoundary(range.start, false),
      dateFinish: core.toPeriodBoundary(range.finish, true),
      orderId: core.formatDslLiteral(vm.selectedOrderId || ''),
      registratorTemplateId: core.formatDslLiteral(registratorFilter.template || ''),
      registratorId: core.formatDslLiteral(registratorFilter.registrator || '')
    };
  }

  function makeDatasourceExpression(vm) {
    var expression = vm.datasourceExpression || '';
    if (!toPlainValue(vm.selectedOrderId)) {
      expression = expression.replace(/\|\s*номер_заказа\s*\(&orderId\)\s*/i, ' ');
    }
    if (!toPlainValue(vm.selectedRegistratorId)) {
      expression = expression.replace(/\|\s*template\s*\(&registratorTemplateId\)\s*/i, ' ');
    }
    if (!toPlainValue(vm.selectedRegistratorId)) {
      expression = expression.replace(/\|\s*registrator\s*\(&registratorId\)\s*/i, ' ');
    }
    if (vm.periodMode === 'unlimited' || vm.isPeriodFilterDisabled) {
      expression = expression.replace(/\|\s*period\s*\(&dateStart,\s*&dateFinish\)\s*/i, ' ');
    }

    return core.sanitizeDslNumericLiterals(core.replaceDsPlaceholders(expression, buildTokenMap(vm)));
  }

  function makeKpiDatasourceExpression(vm) {
    var expression = vm.datasourceExpressionKpi || '';
    expression = expression.replace(/Select\s*\(\s*(?!id\b)/i, 'Select (id, ');
    if (!toPlainValue(vm.selectedOrderId)) {
      expression = expression.replace(/\|\s*заказ_договор\s*\(&orderId\)\s*/i, ' ');
    }
    if (vm.periodMode === 'unlimited' || vm.isPeriodFilterDisabled) {
      expression = expression.replace(/\|\s*AddColumn\(dateStart,\s*DateTime,\s*&dateStart\)\s*/i, ' ');
      expression = expression.replace(/\|\s*AddColumn\(dateFinish_,\s*DateTime,\s*&dateFinish\)\s*/i, ' ');
      expression = expression.replace(/\|\s*ComputeFunction\(dateFinish,\s*dateFinish_\.EndDay\(\)\)\s*/i, ' ');
      expression = expression.replace(/\|\s*Having\s*\(date>=dateStart\s+AND\s+date<=dateFinish\)\s*/i, ' ');
    }
    return core.sanitizeDslNumericLiterals(core.replaceDsPlaceholders(expression, buildTokenMap(vm)));
  }

  function readRowsFromMock(payload) {
    if (Array.isArray(payload && payload.rows)) {
      return payload.rows;
    }
    return [];
  }

  function readKpiRowsFromMock(payload) {
    if (Array.isArray(payload && payload.kpiRows)) {
      return payload.kpiRows;
    }
    return [];
  }

  function requestJson(url, options) {
    return fetch(url, options).then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    });
  }

  function executeDatasourceRequest(config) {
    return new Promise(function(resolve, reject) {
      $.ajax({
        url: '/api/v1/datasource/execute/',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          expression: String((config && config.expression) || '').trim(),
          applyDimensionRights: true
        })
      })
      .done(resolve)
      .fail(function(jqXHR, textStatus, errorThrown) {
        reject(new Error(textStatus || errorThrown || 'Datasource request failed'));
      });
    });
  }

  function bootstrap(config) {
    var queryParameters = core.getQueryParameters(global.location.search);
    var periodState = core.buildStandardPeriodState(queryParameters);

    var root = document.getElementById('root');
    var templateHtml = root ? root.outerHTML : '<div id="root"></div>';
    if (root) {
      root.outerHTML = '<div id="root"></div>';
    }

    new Vue({
      el: '#root',
      template: templateHtml,
      data: function() {
        return {
          reportTitle: config.title,
          tabs: config.tabs,
          activeTab: config.tabs[0].key,
          columns: config.columns,
          sourceRows: [],
          rows: [],
          kpiRows: [],
          directorCommentDrafts: {},
          kpiDirectorCommentDrafts: {},
          selectedOrderId: toPlainValue(queryParameters.orderId || queryParameters['номер_заказа'] || ''),
          selectedRegistratorId: '',
          selectedBudgetItemIds: [],
          forcePeriodWithFilters: false,
          isWaiting: false,
          datasourceExpression: config.datasourceExpression,
          datasourceExpressionKpi: config.datasourceExpressionKpi,
          toasts: [],
          periodMode: periodState.periodMode,
          periodAnchor: periodState.periodAnchor,
          customDateStart: periodState.customDateStart,
          customDateFinish: periodState.customDateFinish,
          showPeriodMenu: false,
          periodModes: periodState.periodModes,
          showExcelPreview: false
        };
      },
      computed: {
        currentColumns: function() {
          return this.activeTab === 'expenses' ? this.columns : [];
        },
        currentTabTitle: function() {
          for (var i = 0; i < this.tabs.length; ++i) {
            if (this.tabs[i].key === this.activeTab) {
              return this.tabs[i].title;
            }
          }
          return '';
        },
        activeTabRowsCount: function() {
          if (this.activeTab === 'expenses') {
            return this.filteredRows.length;
          }
          if (this.activeTab === 'kp') {
            return this.summaryRows.length;
          }
          if (this.activeTab === 'kpi') {
            return this.kpiRows.length;
          }
          return 0;
        },
        currentTabHeadline: function() {
          if (this.activeTab !== 'expenses') {
            return this.currentTabTitle;
          }

          var parts = ['Поступления и выплаты'];
          var selectedOrderId = toPlainValue(this.selectedOrderId);
          var selectedRegistrator = parseRegistratorComposite(this.selectedRegistratorId);

          if (selectedOrderId) {
            var orderTitle = '';
            for (var i = 0; i < this.orderFilterOptions.length; ++i) {
              if (toPlainValue(this.orderFilterOptions[i].id) === selectedOrderId) {
                orderTitle = toPlainValue(this.orderFilterOptions[i].title);
                break;
              }
            }
            if (orderTitle) {
              parts.push('по заказу ' + orderTitle);
            }
          }

          if (!this.isPeriodFilterDisabled) {
            parts.push('за период ' + this.periodDisplayLabel);
          }

          if (selectedRegistrator.registrator) {
            var registratorTitle = '';
            for (var j = 0; j < this.registratorFilterOptions.length; ++j) {
              if (toPlainValue(this.registratorFilterOptions[j].id) === toPlainValue(this.selectedRegistratorId)) {
                registratorTitle = toPlainValue(this.registratorFilterOptions[j].title);
                break;
              }
            }
            if (registratorTitle) {
              parts.push('по операции ' + registratorTitle);
            }
          }

          return parts.join(' ');
        },
        periodDisplayLabel: function() {
          return core.formatPeriodLabel(this);
        },
        hasActiveFilters: function() {
          return !!toPlainValue(this.selectedOrderId) ||
            !!toPlainValue(this.selectedRegistratorId);
        },
        isPeriodFilterDisabled: function() {
          return this.hasActiveFilters && !this.forcePeriodWithFilters;
        },
        filterStateKey: function() {
          return toPlainValue(this.selectedOrderId) + '|' + toPlainValue(this.selectedRegistratorId);
        },
        canShiftPeriod: function() {
          return core.canShiftPeriod(this);
        },
        totalAmount: function() {
          var total = 0;
          for (var i = 0; i < this.filteredRows.length; ++i) {
            total += parseAmount(this.filteredRows[i].amount);
          }
          return total;
        },
        incomeAmount: function() {
          var total = 0;
          for (var i = 0; i < this.filteredRows.length; ++i) {
            var amount = parseAmount(this.filteredRows[i].amount);
            if (amount > 0) {
              total += amount;
            }
          }
          return total;
        },
        expenseAmount: function() {
          var total = 0;
          for (var i = 0; i < this.filteredRows.length; ++i) {
            var amount = parseAmount(this.filteredRows[i].amount);
            if (amount < 0) {
              total += Math.abs(amount);
            }
          }
          return total;
        },
        orderFilterOptions: function() {
          var seen = {};
          var options = [];
          for (var i = 0; i < this.sourceRows.length; ++i) {
            var row = this.sourceRows[i] || {};
            var id = toPlainValue(row['номер_заказа']);
            var title = toPlainValue(row['номер_заказа_title']);
            if (!id || seen[id]) {
              continue;
            }
            seen[id] = true;
            options.push({ id: id, title: title || id });
          }
          return options;
        },
        registratorFilterOptions: function() {
          var seen = {};
          var options = [];
          for (var i = 0; i < this.sourceRows.length; ++i) {
            var row = this.sourceRows[i] || {};
            var templateId = toPlainValue(row.template);
            var registratorId = toPlainValue(row.registrator);
            var id = templateId + '|' + registratorId;
            var title = toPlainValue(row.registrator_title);
            if (!templateId || !registratorId || seen[id]) {
              continue;
            }
            seen[id] = true;
            options.push({ id: id, title: title || id });
          }
          return options;
        },
        budgetItemFilterOptions: function() {
          var seen = {};
          var options = [];
          for (var i = 0; i < this.sourceRows.length; ++i) {
            var row = this.sourceRows[i] || {};
            var id = toPlainValue(row.budgetitem || row.budgetitem_title);
            var title = toPlainValue(row.budgetitem_title);
            if (!id || seen[id]) {
              continue;
            }
            seen[id] = true;
            options.push({ id: id, title: title || id });
          }
          return options;
        },
        isAllBudgetItemsSelected: function() {
          if (!this.budgetItemFilterOptions.length) {
            return false;
          }
          return this.selectedBudgetItemIds.length === this.budgetItemFilterOptions.length;
        },
        filteredRows: function() {
          var selectedOrderId = toPlainValue(this.selectedOrderId);
          var selectedRegistrator = parseRegistratorComposite(this.selectedRegistratorId);
          var selectedBudgetItems = Array.isArray(this.selectedBudgetItemIds)
            ? this.selectedBudgetItemIds.map(toPlainValue).filter(Boolean)
            : [];
          var selectedBudgetItemMap = {};
          for (var i = 0; i < selectedBudgetItems.length; ++i) {
            selectedBudgetItemMap[selectedBudgetItems[i]] = true;
          }
          return this.sourceRows.filter(function(row) {
            var orderOk = !selectedOrderId || toPlainValue(row['номер_заказа']) === selectedOrderId;
            var registratorOk = !selectedRegistrator.registrator ||
              (toPlainValue(row.registrator) === selectedRegistrator.registrator &&
               toPlainValue(row.template) === selectedRegistrator.template);
            var rowBudgetItemId = toPlainValue(row.budgetitem || row.budgetitem_title);
            var budgetItemOk = !selectedBudgetItems.length || !!selectedBudgetItemMap[rowBudgetItemId];
            return orderOk && registratorOk && budgetItemOk;
          });
        },
        summaryRows: function() {
          var groups = {};
          var order = [];

          for (var i = 0; i < this.filteredRows.length; ++i) {
            var row = this.filteredRows[i] || {};
            var key = toPlainValue(row.budgetitem_title) || 'Без категории';
            if (!Object.prototype.hasOwnProperty.call(groups, key)) {
              groups[key] = 0;
              order.push(key);
            }
            groups[key] += parseAmount(row.amount);
          }

          var result = [];
          for (var j = 0; j < order.length; ++j) {
            result.push({
              budgetitem_title: order[j],
              amount: groups[order[j]]
            });
          }

          return result;
        },
        summaryTotalAmount: function() {
          var total = 0;
          for (var i = 0; i < this.summaryRows.length; ++i) {
            total += parseAmount(this.summaryRows[i].amount);
          }
          return total;
        },
        summaryLabelSpan: function() {
          return Math.max(this.currentColumns.length - 1, 1);
        },
        summaryValueColumns: function() {
          if (!this.currentColumns.length) {
            return [];
          }
          return this.currentColumns.slice(this.summaryLabelSpan);
        },
        excelExportConfig: function() {
          if (this.activeTab === 'kp') {
            return {
              key: 'kp',
              filePrefix: 'po_statyam',
              sheetName: 'По статьям',
              columns: [
                { key: 'budgetitem_title', title: 'Статья' },
                { key: 'amount', title: 'Сумма, руб' }
              ],
              rows: this.summaryRows || []
            };
          }
          if (this.activeTab === 'kpi') {
            return {
              key: 'kpi',
              filePrefix: 'po_kp',
              sheetName: 'По КП',
              columns: [
                { key: 'date', title: 'Дата' },
                { key: 'order_title', title: 'Номер Заказа' },
                { key: 'коммент_директор', title: 'Комментарий директора' }
              ],
              rows: this.kpiRows || []
            };
          }
          return {
            key: 'expenses',
            filePrefix: 'po_dokumentam',
            sheetName: 'По документам',
            columns: this.columns || [],
            rows: this.filteredRows || []
          };
        },
        excelPreviewRows: function() {
          return Array.isArray(this.excelExportConfig.rows) ? this.excelExportConfig.rows : [];
        },
        excelPreviewColumns: function() {
          return Array.isArray(this.excelExportConfig.columns) ? this.excelExportConfig.columns : [];
        },
        excelPreviewColumnCount: function() {
          return this.excelPreviewColumns.length + 1;
        }
      },
      mounted: function() {
        this.loadRows();
        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleGlobalKeyDown);
      },
      beforeDestroy: function() {
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleGlobalKeyDown);
      },
      methods: {
        setActiveTab: function(tabKey) {
          this.activeTab = tabKey;
        },
        isBudgetItemSelected: function(itemId) {
          var normalized = toPlainValue(itemId);
          return this.selectedBudgetItemIds.indexOf(normalized) >= 0;
        },
        toggleBudgetItem: function(itemId, checked) {
          var normalized = toPlainValue(itemId);
          var next = this.selectedBudgetItemIds.slice();
          var index = next.indexOf(normalized);
          if (checked && index < 0) {
            next.push(normalized);
          }
          if (!checked && index >= 0) {
            next.splice(index, 1);
          }
          this.selectedBudgetItemIds = next;
        },
        toggleAllBudgetItems: function(checked) {
          if (checked) {
            this.selectedBudgetItemIds = this.budgetItemFilterOptions.map(function(option) {
              return toPlainValue(option.id);
            });
            return;
          }
          this.selectedBudgetItemIds = [];
        },
        handleRowClick: function(row) {
          var operationId = toPlainValue(row && row.registrator).trim();
          var templateId = toPlainValue(row && row.template).trim();
          var operationName = TEMPLATE_OPERATION_MAP[templateId];

          if (!operationId) {
            this.makeToast('Не найден registrator для перехода в операцию.', true);
            return;
          }
          if (!operationName) {
            this.makeToast('Для template=' + templateId + ' не настроено соответствие операции.', true);
            return;
          }

          var targetUrl = '/App/OperationV2/Edit/' + encodeURIComponent(operationName) + '/' + encodeURIComponent(operationId);
          global.location.href = targetUrl;
        },
        togglePeriodMenu: function() {
          if (this.isPeriodFilterDisabled) {
            return;
          }
          this.showPeriodMenu = !this.showPeriodMenu;
        },
        selectPeriodMode: function(modeKey) {
          if (this.isPeriodFilterDisabled || modeKey === 'unlimited') {
            return;
          }
          this.periodMode = modeKey;
          if (modeKey !== 'custom') {
            this.showPeriodMenu = false;
            this.loadRows();
          }
        },
        applyCustomPeriod: function() {
          this.showPeriodMenu = false;
          this.loadRows();
        },
        shiftPeriod: function(delta) {
          if (this.isPeriodFilterDisabled || !this.canShiftPeriod) {
            return;
          }
          var next = core.shiftPeriodState(this, delta);
          this.periodAnchor = next.periodAnchor;
          this.loadRows();
        },
        handleDocumentClick: function(event) {
          if (!this.showPeriodMenu) {
            return;
          }
          var periodToolbar = this.$el.querySelector('.period-toolbar');
          if (periodToolbar && !periodToolbar.contains(event.target)) {
            this.showPeriodMenu = false;
          }
        },
        handleGlobalKeyDown: function(event) {
          if (event && event.key === 'Escape' && this.showExcelPreview) {
            this.closeExcelPreview();
          }
        },
        openExcelPreview: function() {
          if (!Array.isArray(this.excelPreviewRows) || this.excelPreviewRows.length === 0) {
            this.makeToast('Нет данных для выгрузки', true);
            return;
          }
          this.showExcelPreview = true;
        },
        closeExcelPreview: function() {
          this.showExcelPreview = false;
        },
        confirmExcelExport: function() {
          if (!Array.isArray(this.excelPreviewRows) || this.excelPreviewRows.length === 0) {
            this.makeToast('Нет данных для выгрузки', true);
            this.closeExcelPreview();
            return;
          }
          this.downloadXlsxWorkbook();
          this.closeExcelPreview();
        },
        getExcelCellValue: function(row, column) {
          if (!column) {
            return '';
          }
          if (this.excelExportConfig.key === 'kpi' && column.key === 'order_title') {
            return this.displayKpiOrderTitle(row);
          }
          return this.displayCell(row, column);
        },
        displayCell: function(row, column) {
          if (column && column.key === 'date') {
            return formatShortDate(row[column.key]);
          }
          if (column && column.key === 'amount') {
            return formatAmount(parseAmount(row[column.key]));
          }
          if (column && column.key === 'коммент_директор') {
            return normalizeDirectorCommentFromSource(row[column.key]);
          }
          return toPlainValue(row[column.key]);
        },
        isDirectorCommentEditing: function(row) {
          return !!(row && Object.prototype.hasOwnProperty.call(this.directorCommentDrafts, row.__rowKey));
        },
        getDirectorCommentDraft: function(row) {
          if (!row) {
            return '';
          }
          if (this.isDirectorCommentEditing(row)) {
            return this.directorCommentDrafts[row.__rowKey];
          }
          return normalizeDirectorCommentFromSource(row['коммент_директор']);
        },
        startDirectorCommentEdit: function(row) {
          if (!row) {
            return;
          }
          this.$set(this.directorCommentDrafts, row.__rowKey, normalizeDirectorCommentFromSource(row['коммент_директор']));
          this.$nextTick(function() {
            var activeElement = this.$el.querySelector('.inline-editor-input');
            if (activeElement && typeof activeElement.focus === 'function') {
              activeElement.focus();
              if (typeof activeElement.select === 'function') {
                activeElement.select();
              }
            }
          }.bind(this));
        },
        updateDirectorCommentDraft: function(row, value) {
          if (!row) {
            return;
          }
          this.$set(this.directorCommentDrafts, row.__rowKey, toPlainValue(value));
        },
        confirmDirectorCommentEdit: function(row) {
          if (!row) {
            return;
          }
          var rowKey = row.__rowKey;
          var nextValue = toPlainValue(this.directorCommentDrafts[rowKey]);
          var updateRow = function(targetRow) {
            if (targetRow && targetRow.__rowKey === rowKey) {
              targetRow['коммент_директор'] = nextValue;
            }
          };

          updateRow(row);
          for (var i = 0; i < this.sourceRows.length; ++i) {
            updateRow(this.sourceRows[i]);
          }
          for (var j = 0; j < this.rows.length; ++j) {
            updateRow(this.rows[j]);
          }
          this.$delete(this.directorCommentDrafts, rowKey);
          this.saveDirectorComment(row, nextValue);
        },
        cancelDirectorCommentEdit: function(row) {
          if (!row) {
            return;
          }
          this.$delete(this.directorCommentDrafts, row.__rowKey);
        },
        formatTotalAmount: function(value) {
          return formatAmount(value);
        },
        totalCellValue: function(column) {
          if (column && column.key === 'amount') {
            return this.formatTotalAmount(this.totalAmount);
          }
          return '';
        },
        escapeXml: function(value) {
          return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        },
        encodeUtf8: function(value) {
          if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(String(value || ''));
          }
          return new Uint8Array(unescape(encodeURIComponent(String(value || ''))).split('').map(function(char) {
            return char.charCodeAt(0);
          }));
        },
        getZipCrcTable: function() {
          if (this._zipCrcTable) {
            return this._zipCrcTable;
          }
          var table = [];
          for (var i = 0; i < 256; ++i) {
            var c = i;
            for (var j = 0; j < 8; ++j) {
              c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
          }
          this._zipCrcTable = table;
          return table;
        },
        calculateCrc32: function(bytes) {
          var table = this.getZipCrcTable();
          var crc = 0xffffffff;
          for (var i = 0; i < bytes.length; ++i) {
            crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
          }
          return (crc ^ 0xffffffff) >>> 0;
        },
        createStoredZip: function(files) {
          var localChunks = [];
          var centralChunks = [];
          var localOffset = 0;

          var makeRecord = function(signature, size) {
            var buffer = new ArrayBuffer(size);
            var view = new DataView(buffer);
            view.setUint32(0, signature, true);
            return { view: view, bytes: new Uint8Array(buffer) };
          };
          var concat = function(chunks) {
            var total = 0;
            for (var i = 0; i < chunks.length; ++i) {
              total += chunks[i].length;
            }
            var result = new Uint8Array(total);
            var offset = 0;
            for (var j = 0; j < chunks.length; ++j) {
              result.set(chunks[j], offset);
              offset += chunks[j].length;
            }
            return result;
          };

          for (var fileIndex = 0; fileIndex < files.length; ++fileIndex) {
            var file = files[fileIndex];
            var nameBytes = this.encodeUtf8(file.name);
            var contentBytes = file.contentBytes;
            var crc32 = this.calculateCrc32(contentBytes);

            var local = makeRecord(0x04034b50, 30);
            local.view.setUint16(4, 20, true);
            local.view.setUint32(14, crc32, true);
            local.view.setUint32(18, contentBytes.length, true);
            local.view.setUint32(22, contentBytes.length, true);
            local.view.setUint16(26, nameBytes.length, true);
            localChunks.push(local.bytes, nameBytes, contentBytes);

            var central = makeRecord(0x02014b50, 46);
            central.view.setUint16(4, 20, true);
            central.view.setUint16(6, 20, true);
            central.view.setUint32(16, crc32, true);
            central.view.setUint32(20, contentBytes.length, true);
            central.view.setUint32(24, contentBytes.length, true);
            central.view.setUint16(28, nameBytes.length, true);
            central.view.setUint32(42, localOffset, true);
            centralChunks.push(central.bytes, nameBytes);

            localOffset += local.bytes.length + nameBytes.length + contentBytes.length;
          }

          var centralDirectory = concat(centralChunks);
          var end = makeRecord(0x06054b50, 22);
          end.view.setUint16(8, files.length, true);
          end.view.setUint16(10, files.length, true);
          end.view.setUint32(12, centralDirectory.length, true);
          end.view.setUint32(16, localOffset, true);
          return concat(localChunks.concat([centralDirectory, end.bytes]));
        },
        getExcelColumnName: function(index) {
          var result = '';
          var current = index;
          while (current > 0) {
            var modulo = (current - 1) % 26;
            result = String.fromCharCode(65 + modulo) + result;
            current = Math.floor((current - modulo) / 26);
          }
          return result || 'A';
        },
        buildXlsxCell: function(columnIndex, rowIndex, value, type, styleIndex) {
          var cellRef = this.getExcelColumnName(columnIndex) + rowIndex;
          var styleAttr = typeof styleIndex === 'number' ? ' s="' + styleIndex + '"' : '';
          if (type === 'number') {
            return '<c r="' + cellRef + '"' + styleAttr + '><v>' + (parseFloat(value) || 0) + '</v></c>';
          }
          return '<c r="' + cellRef + '" t="inlineStr"' + styleAttr + '><is><t>' + this.escapeXml(value) + '</t></is></c>';
        },
        buildWorksheetXml: function() {
          var exportColumns = this.excelPreviewColumns || [];
          var rows = this.excelPreviewRows || [];
          var rowsXml = [];

          var headerCells = [this.buildXlsxCell(1, 1, '#', 'string', 1)];
          for (var i = 0; i < exportColumns.length; ++i) {
            headerCells.push(this.buildXlsxCell(i + 2, 1, exportColumns[i].title || exportColumns[i].key, 'string', 1));
          }
          rowsXml.push('<row r="1">' + headerCells.join('') + '</row>');

          for (var rowIndex = 0; rowIndex < rows.length; ++rowIndex) {
            var row = rows[rowIndex] || {};
            var excelRow = rowIndex + 2;
            var cells = [this.buildXlsxCell(1, excelRow, rowIndex + 1, 'number', 0)];
            for (var colIndex = 0; colIndex < exportColumns.length; ++colIndex) {
              var col = exportColumns[colIndex] || {};
              var value = this.getExcelCellValue(row, col);
              var cellType = col.key === 'amount' ? 'number' : 'string';
              cells.push(this.buildXlsxCell(colIndex + 2, excelRow, value, cellType, 0));
            }
            rowsXml.push('<row r="' + excelRow + '">' + cells.join('') + '</row>');
          }

          var lastRow = Math.max(1, rows.length + 1);
          var lastColumn = this.getExcelColumnName(exportColumns.length + 1);
          return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
              '<dimension ref="A1:' + lastColumn + lastRow + '"/>' +
              '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
              '<sheetFormatPr defaultRowHeight="15"/>' +
              '<sheetData>' + rowsXml.join('') + '</sheetData>' +
            '</worksheet>'
          );
        },
        buildExpensesStylesXml: function() {
          return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
              '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
              '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
              '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
              '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
              '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
              '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '</styleSheet>'
          );
        },
        downloadXlsxWorkbook: function() {
          var safeSheetName = toPlainValue(this.excelExportConfig.sheetName || 'Данные').slice(0, 31) || 'Данные';
          var workbookXml =
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
              '<sheets><sheet name="' + this.escapeXml(safeSheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
            '</workbook>';
          var workbookRels =
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
              '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
            '</Relationships>';
          var rootRels =
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '</Relationships>';
          var contentTypes =
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
              '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
              '<Default Extension="xml" ContentType="application/xml"/>' +
              '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
              '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
              '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            '</Types>';

          var zipBytes = this.createStoredZip([
            { name: '[Content_Types].xml', contentBytes: this.encodeUtf8(contentTypes) },
            { name: '_rels/.rels', contentBytes: this.encodeUtf8(rootRels) },
            { name: 'xl/workbook.xml', contentBytes: this.encodeUtf8(workbookXml) },
            { name: 'xl/_rels/workbook.xml.rels', contentBytes: this.encodeUtf8(workbookRels) },
            { name: 'xl/worksheets/sheet1.xml', contentBytes: this.encodeUtf8(this.buildWorksheetXml()) },
            { name: 'xl/styles.xml', contentBytes: this.encodeUtf8(this.buildExpensesStylesXml()) }
          ]);

          var blob = new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = toPlainValue(this.excelExportConfig.filePrefix || 'excel') + '_' + new Date().toLocaleDateString('en-CA') + '.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        },
        exportToExcel: function() {
          this.openExcelPreview();
        },
        formatKpiDate: function(row) {
          return formatShortDate(row && row.date);
        },
        displayKpiOrderTitle: function(row) {
          return toPlainValue(row && (row['заказ_договор_title'] || row['номер_заказа_title'] || row['заказ_договор'] || row['номер_заказа']));
        },
        displayKpiDirectorComment: function(row) {
          return normalizeDirectorCommentFromSource(row && row['коммент_директор']);
        },
        isKpiDirectorCommentEditing: function(row) {
          return !!(row && Object.prototype.hasOwnProperty.call(this.kpiDirectorCommentDrafts, row.__rowKey));
        },
        getKpiDirectorCommentDraft: function(row) {
          if (!row) {
            return '';
          }
          if (this.isKpiDirectorCommentEditing(row)) {
            return this.kpiDirectorCommentDrafts[row.__rowKey];
          }
          return normalizeDirectorCommentFromSource(row['коммент_директор']);
        },
        startKpiDirectorCommentEdit: function(row) {
          if (!row) {
            return;
          }
          this.$set(this.kpiDirectorCommentDrafts, row.__rowKey, normalizeDirectorCommentFromSource(row['коммент_директор']));
          this.$nextTick(function() {
            var activeElement = this.$el.querySelector('.kpi-inline-editor-input');
            if (activeElement && typeof activeElement.focus === 'function') {
              activeElement.focus();
              if (typeof activeElement.select === 'function') {
                activeElement.select();
              }
            }
          }.bind(this));
        },
        updateKpiDirectorCommentDraft: function(row, value) {
          if (!row) {
            return;
          }
          this.$set(this.kpiDirectorCommentDrafts, row.__rowKey, toPlainValue(value));
        },
        confirmKpiDirectorCommentEdit: function(row) {
          if (!row) {
            return;
          }
          var rowKey = row.__rowKey;
          var nextValue = toPlainValue(this.kpiDirectorCommentDrafts[rowKey]);
          var updateRow = function(targetRow) {
            if (targetRow && targetRow.__rowKey === rowKey) {
              targetRow['коммент_директор'] = nextValue;
            }
          };

          updateRow(row);
          for (var i = 0; i < this.kpiRows.length; ++i) {
            updateRow(this.kpiRows[i]);
          }
          this.$delete(this.kpiDirectorCommentDrafts, rowKey);
          this.saveKpiDirectorComment(row, nextValue);
        },
        cancelKpiDirectorCommentEdit: function(row) {
          if (!row) {
            return;
          }
          this.$delete(this.kpiDirectorCommentDrafts, row.__rowKey);
        },
        makeToast: function(message, isError) {
          var toast = { id: Date.now() + Math.random(), message: message, isError: !!isError };
          this.toasts.push(toast);
          setTimeout(function() {
            var next = [];
            for (var i = 0; i < this.toasts.length; ++i) {
              if (this.toasts[i].id !== toast.id) {
                next.push(this.toasts[i]);
              }
            }
            this.toasts = next;
          }.bind(this), 3200);
        },
        sendRequest: function(url, reqType, dataSend, doneCallback, failCallback) {
          if ((global.location.search || '').indexOf('mode=mock') >= 0) {
            var mockResponse = { isOK: true, data: { mock: true } };
            if (typeof doneCallback === 'function') {
              doneCallback(mockResponse);
            }
            return Promise.resolve(mockResponse);
          }
          return $.ajax({
            url: url,
            type: reqType,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: dataSend
          }).done(doneCallback).fail(failCallback);
        },
        saveDirectorComment: function(row, commentText) {
          var payload = JSON.stringify({
            name: 'update_operation',
            resultStepName: 'operation_load',
            parameters: {
              header: {
                id: row && row.registrator
              },
              row: {
                registratorid: row && row.registrator,
                template: row && row.template,
                rownumber: row && row.row,
                budgetitem: row && row.budgetitem,
                номер_заказа: row && row['номер_заказа'],
                комментарий: row && row['комментарий'],
                amount: row && row.amount,
                коммент_директор: buildDirectorCommentForPayload(commentText)
              }
            }
          });

          return this.sendRequest(
            '/api/v1/workflowinner/await/',
            'POST',
            payload,
            function(responseData) {
              if (responseData && responseData.isOK) {
                this.makeToast('Комментарий отправлен в процесс.');
              } else {
                this.makeToast('HC вернул ошибку при сохранении комментария.', true);
              }
            }.bind(this),
            function(jqXHR, textStatus, errorThrown) {
              var errorMessage = textStatus || errorThrown || 'request failed';
              this.makeToast('Ошибка отправки в процесс: ' + errorMessage, true);
            }.bind(this)
          );
        },
        saveKpiDirectorComment: function(row, commentText) {
          var payload = JSON.stringify({
            name: 'update_operation',
            resultStepName: 'operation_load',
            parameters: {
              header: {
                id: row && row.id,
                template: 2,
                коммент_директор: buildDirectorCommentForPayload(commentText)
              }
            }
          });

          return this.sendRequest(
            '/api/v1/workflowinner/await/',
            'POST',
            payload,
            function(responseData) {
              if (responseData && responseData.isOK) {
                this.makeToast('Комментарий КП отправлен в процесс.');
              } else {
                this.makeToast('HC вернул ошибку при сохранении комментария КП.', true);
              }
            }.bind(this),
            function(jqXHR, textStatus, errorThrown) {
              var errorMessage = textStatus || errorThrown || 'request failed';
              this.makeToast('Ошибка отправки КП в процесс: ' + errorMessage, true);
            }.bind(this)
          );
        },
        loadRows: function() {
          this.isWaiting = true;
            if ((global.location.search || '').indexOf('mode=mock') >= 0) {
              return requestJson('./mock-data.json').then(function(payload) {
              this.sourceRows = readRowsFromMock(payload).map(cloneRow);
              this.rows = this.sourceRows.slice();
              this.kpiRows = readKpiRowsFromMock(payload).map(cloneRow);
              this.directorCommentDrafts = {};
              this.kpiDirectorCommentDrafts = {};
            }.bind(this)).catch(function(error) {
              this.sourceRows = [];
              this.rows = [];
              this.kpiRows = [];
              this.directorCommentDrafts = {};
              this.kpiDirectorCommentDrafts = {};
              this.makeToast('Не удалось загрузить mock-data.json: ' + error.message, true);
            }.bind(this)).finally(function() {
              this.isWaiting = false;
            }.bind(this));
          }

          var expensesRequest = executeDatasourceRequest({
            expression: makeDatasourceExpression(this)
          });
          var kpiRequest = executeDatasourceRequest({
            expression: makeKpiDatasourceExpression(this)
          });

          return Promise.all([expensesRequest, kpiRequest]).then(function(responses) {
            var expensesPayload = responses[0];
            var kpiPayload = responses[1];
            var expenseItems = core.getResponseDataItems(expensesPayload);
            var kpiItems = core.getResponseDataItems(kpiPayload);
            this.sourceRows = core.normalizeReportRows(expenseItems, function(item, index) { return cloneRow(item, index); });
            this.rows = this.sourceRows.slice();
            this.kpiRows = core.normalizeReportRows(kpiItems, function(item, index) { return cloneRow(item, index); });
            this.directorCommentDrafts = {};
            this.kpiDirectorCommentDrafts = {};
          }.bind(this)).catch(function(error) {
            this.sourceRows = [];
            this.rows = [];
            this.kpiRows = [];
            this.directorCommentDrafts = {};
            this.kpiDirectorCommentDrafts = {};
            this.makeToast('Ошибка загрузки datasource: ' + error.message, true);
          }.bind(this)).finally(function() {
            this.isWaiting = false;
          }.bind(this));
        }
      },
      watch: {
        filterStateKey: function(nextKey, previousKey) {
          if (nextKey === previousKey) {
            return;
          }

          var hadFilters = !!previousKey && previousKey !== '|';
          var hasFilters = !!nextKey && nextKey !== '|';

          this.showPeriodMenu = false;
          if (!hasFilters && hadFilters) {
            this.periodMode = 'month';
            this.periodAnchor = getPreviousMonthAnchorIso();
            this.forcePeriodWithFilters = false;
          }

          this.loadRows();
        },
        forcePeriodWithFilters: function(nextValue, previousValue) {
          if (nextValue === previousValue) {
            return;
          }
          this.showPeriodMenu = false;
          this.loadRows();
        }
      }
    });
  }

  function startWhenReady() {
    if (!document.getElementById('root') || typeof Vue === 'undefined') {
      return;
    }
    bootstrap(getConfig());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWhenReady);
  } else {
    startWhenReady();
  }
})(window);
