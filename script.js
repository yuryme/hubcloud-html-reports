var CORE_BUILD = 'core-baseline-2026-04-03.1';
var HC_DEBUG = false;
var HC_REPORT_FALLBACK_CORE = {
  getQueryParameters: function(search, externalParameters) {
    var queryParameters = {};
    if (externalParameters && typeof externalParameters === 'object') {
      queryParameters = Object.assign({}, externalParameters);
    }
    var urlParams = new URLSearchParams(search || '');
    urlParams.forEach(function(value, key) {
      queryParameters[key] = value;
    });
    return queryParameters;
  },

  getFirstDefinedValue: function(source, aliases) {
    for (var i = 0; i < aliases.length; ++i) {
      var key = aliases[i];
      if (
        Object.prototype.hasOwnProperty.call(source, key) &&
        source[key] !== null &&
        typeof source[key] !== 'undefined' &&
        source[key] !== ''
      ) {
        return source[key];
      }
    }
    return null;
  },

  normalizeSingleParameter: function(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      var rawValue = value.id;
      if (typeof rawValue === 'undefined' || rawValue === null || rawValue === '') {
        rawValue = value.value;
      }
      if (typeof rawValue === 'undefined' || rawValue === null || rawValue === '') {
        rawValue = value.code;
      }
      if (typeof rawValue === 'undefined' || rawValue === null) {
        rawValue = '';
      }

      var rawTitle = value.title;
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = value.label;
      }
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = value.text;
      }
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = value.name;
      }
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = rawValue;
      }

      return {
        value: typeof rawValue === 'undefined' || rawValue === null ? '' : String(rawValue),
        title: typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '' ? String(rawValue || '') : String(rawTitle)
      };
    }

    if (value === null || typeof value === 'undefined') {
      return { value: '', title: '' };
    }

    return { value: String(value), title: String(value) };
  },

  normalizeParameterObject: function(value, multiple) {
    if (Array.isArray(value)) {
      var list = [];
      var titles = [];
      for (var i = 0; i < value.length; ++i) {
        var item = HC_REPORT_FALLBACK_CORE.normalizeSingleParameter(value[i]);
        if (!item.value) {
          continue;
        }
        list.push(item.value);
        titles.push(item.title);
      }
      return {
        value: multiple ? list : (list[0] || ''),
        title: multiple ? titles : (titles[0] || '')
      };
    }

    var normalized = HC_REPORT_FALLBACK_CORE.normalizeSingleParameter(value);
    return {
      value: multiple ? (normalized.value ? [normalized.value] : []) : normalized.value,
      title: multiple ? (normalized.title ? [normalized.title] : []) : normalized.title
    };
  },

  normalizeDateValue: function(value) {
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
  },

  toPeriodBoundary: function(dateValue, isEndOfDay) {
    var normalizedDate = HC_REPORT_FALLBACK_CORE.normalizeDateValue(dateValue);
    if (!normalizedDate) {
      return '';
    }
    return normalizedDate + (isEndOfDay ? ' 23:59:59' : ' 00:00:00');
  },

  normalizeOptionList: function(items) {
    var normalized = [];
    for (var i = 0; i < items.length; ++i) {
      var item = items[i] || {};
      var rawValue = item.id;
      if (typeof rawValue === 'undefined' || rawValue === null || rawValue === '') {
        rawValue = item.value;
      }
      if (typeof rawValue === 'undefined' || rawValue === null || rawValue === '') {
        continue;
      }

      var rawTitle = item.title;
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = item.label;
      }
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = item.name;
      }
      if (typeof rawTitle === 'undefined' || rawTitle === null || rawTitle === '') {
        rawTitle = rawValue;
      }

      normalized.push({ value: String(rawValue), title: String(rawTitle) });
    }
    return normalized;
  },

  formatDslLiteral: function(value) {
    if (Array.isArray(value)) {
      var parts = [];
      for (var i = 0; i < value.length; ++i) {
        var current = HC_REPORT_FALLBACK_CORE.formatDslLiteral(value[i]);
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
  },

  sanitizeDslNumericLiterals: function(expression) {
    return String(expression || '').replace(/\(\s*'(-?\d+(?:\.\d+)?)'\s*\)/g, '($1)');
  },

  findUnresolvedDsPlaceholders: function(expression) {
    var source = String(expression || '');
    var matches = source.match(/&[A-Za-zА-Яа-я_][A-Za-zА-Яа-я0-9_\.\(\)-]*/g) || [];
    var unique = [];
    for (var i = 0; i < matches.length; ++i) {
      if (unique.indexOf(matches[i]) < 0) {
        unique.push(matches[i]);
      }
    }
    return unique;
  },

  replaceDsPlaceholders: function(expression, tokenMap) {
    var out = String(expression || '');
    var keys = Object.keys(tokenMap || {}).sort(function(a, b) {
      return b.length - a.length;
    });
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i];
      out = out.split('&' + key).join(tokenMap[key]);
    }
    return out;
  },

  getResponseDataItems: function(responseData) {
    return Array.isArray(responseData && responseData.data) ? responseData.data : [];
  },

  normalizeReportRows: function(items, rowNormalizer) {
    var sourceItems = Array.isArray(items) ? items : [];
    var out = [];
    for (var i = 0; i < sourceItems.length; ++i) {
      out.push(rowNormalizer(sourceItems[i] || {}));
    }
    return out;
  },

  rowMatchesMockFilter: function(row, filter, filterValues) {
    var selectedValue = filterValues[filter.key];
    var rowValue = row && typeof row[filter.key] !== 'undefined' && row[filter.key] !== null
      ? String(row[filter.key])
      : '';

    if (filter.multiple) {
      if (!Array.isArray(selectedValue) || selectedValue.length === 0) {
        return true;
      }
      return selectedValue.indexOf(rowValue) >= 0;
    }

    if (selectedValue === null || typeof selectedValue === 'undefined' || String(selectedValue) === '') {
      return true;
    }

    return String(selectedValue) === rowValue;
  },

  applyMockFilters: function(rows, filters, filterValues) {
    var sourceRows = Array.isArray(rows) ? rows : [];
    var filteredRows = [];

    for (var i = 0; i < sourceRows.length; ++i) {
      var row = sourceRows[i] || {};
      var isMatch = true;

      for (var j = 0; j < filters.length; ++j) {
        if (!HC_REPORT_FALLBACK_CORE.rowMatchesMockFilter(row, filters[j], filterValues)) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        filteredRows.push(row);
      }
    }

    return filteredRows;
  }
};
var HC_REPORT_CORE_API = window.HC_REPORT_CORE || HC_REPORT_FALLBACK_CORE;

// Core contract:
// Keep generic runtime, datasource transport, mock/live switching,
// filter state wiring, row normalization pipeline, and load/error helpers stable.
// Customize only report-specific config: title, filters, columns,
// datasource expression, and datasource-to-row field mapping.

var HC_REPORT_MANIFEST = window.HC_REPORT_MANIFEST || null;
var HC_REPORT_DS_TEXT = window.HC_REPORT_DS_TEXT || null;
var HC_REPORT_DEFAULT_CONFIG = {
  reportTitle: 'Отчет: Склад Розничный',
  mockDataFile: 'mock-data.json',
  filters: [
    {
      key: 'склад',
      dsKey: 'склад',
      title: 'Склад*',
      multiple: true,
      aliases: ['склад', 'warehouse', '$склад', '$warehouse'],
      optionsExpression: 'catalog.склад | Select(id, title)'
    },
    {
      key: 'группа',
      dsKey: 'группа',
      title: 'Группа',
      multiple: false,
      aliases: ['группа', 'group', '$группа', '$group'],
      optionsExpression: 'catalog.группа | Select (id,title)'
    }
  ],
  columns: [
    { key: 'номенклатура', label: 'Номенклатура', type: 'text', alignClass: 'text-left' },
    { key: 'остаток_на_начало', label: 'Остаток на начало', type: 'number', alignClass: 'text-right' },
    { key: 'приход', label: 'Приход', type: 'number', alignClass: 'text-right' },
    { key: 'расход', label: 'Расход', type: 'number', alignClass: 'text-right' },
    { key: 'возврат', label: 'Возврат', type: 'number', alignClass: 'text-right' },
    { key: 'инвентаризация', label: 'Инвентаризация', type: 'number', alignClass: 'text-right' },
    { key: 'остаток_на_конец', label: 'Остаток на конец', type: 'number', alignClass: 'text-right' }
  ],
  rowMap: {
    номенклатура: ['номенклатура_title', 'item_name', 'name'],
    остаток_на_начало: ['на_начало', 'opening_balance'],
    приход: ['приход', 'incoming'],
    расход: ['расход', 'outgoing'],
    возврат: ['возврат', 'return_qty'],
    инвентаризация: ['инвентаризация', 'inventory_qty'],
    остаток_на_конец: ['на_конец', 'closing_balance']
  }
};
var HC_REPORT_CONFIG = {
  reportTitle: (HC_REPORT_MANIFEST && HC_REPORT_MANIFEST.reportTitle) || HC_REPORT_DEFAULT_CONFIG.reportTitle,
  mockDataFile: (HC_REPORT_MANIFEST && HC_REPORT_MANIFEST.mockDataFile) || HC_REPORT_DEFAULT_CONFIG.mockDataFile,
  filters: (HC_REPORT_MANIFEST && Array.isArray(HC_REPORT_MANIFEST.filters) && HC_REPORT_MANIFEST.filters.length > 0)
    ? HC_REPORT_MANIFEST.filters
    : HC_REPORT_DEFAULT_CONFIG.filters,
  columns: (HC_REPORT_MANIFEST && Array.isArray(HC_REPORT_MANIFEST.columns) && HC_REPORT_MANIFEST.columns.length > 0)
    ? HC_REPORT_MANIFEST.columns
    : HC_REPORT_DEFAULT_CONFIG.columns,
  rowMap: (HC_REPORT_MANIFEST && HC_REPORT_MANIFEST.rowMap) || HC_REPORT_DEFAULT_CONFIG.rowMap
};
var HC_REPORT_DEFAULT_DATASOURCE_EXPRESSION = [
  'catalog.номенклатура | Select (id as номенклатура, title as номенклатура_title, группа) | Gettitle() as t1;',
  '',
  'движение_ном | склад (&склад) | Period(,&dateStart.EndDay().AddDays(-1)) | GroupBy(номенклатура, колво as на_начало_) as на_начало;',
  'движение_ном | склад (&склад) | операция (11) | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as приход_, операция) | GroupBy (номенклатура, приход_, операция) as приход;',
  'движение_ном | склад (&склад) | операция (14) | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as расход_, операция) | GroupBy (номенклатура, расход_, операция) as расход;',
  'движение_ном | склад (&склад) | операция (15) | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as возврат_, операция) | GroupBy (номенклатура, возврат_, операция) as возврат;',
  'движение_ном | склад (&склад) | операция (10) | Period(&dateStart, &dateFinish) | Select (номенклатура, колво as инвентаризация_, операция) | GroupBy (номенклатура, инвентаризация_, операция) as инвентаризация;',
  '',
  'TempTable.на_начало | FullJoinAuto(приход, приход.номенклатура =номенклатура) | FullJoinAuto(расход, расход.номенклатура =номенклатура) | FullJoinAuto(возврат, возврат.номенклатура =номенклатура)',
  '| FullJoinAuto(инвентаризация, инвентаризация.номенклатура =номенклатура)',
  '',
  '| AddColumn (x, number, 0) | Coalesce (приход, приход_, x) | Coalesce (расход__, расход_, x) | Coalesce (на_начало, на_начало_, x) | Coalesce (возврат__, возврат_, x) | Coalesce (инвентаризация, инвентаризация_, x)',
  '| Compute(расход, расход__ * -1) | Compute(возврат, возврат__ * -1)',
  '| Compute(на_конец, на_начало + приход - расход - возврат + инвентаризация) | DeleteColumn (на_начало_, приход_, расход_, расход__, возврат_, возврат__, инвентаризация_, x)',
  '| LeftJoinAuto(t1, t1.номенклатура =номенклатура) | группа (&группа)',
  '| Compute(x, на_начало*на_начало+приход*приход+расход*расход+на_конец*на_конец+возврат*возврат+инвентаризация*инвентаризация) | Having (x>0) | OrderBy (номенклатура_title)'
].join('\n');
function buildInitialFilterValues(filters) {
  var state = {};
  for (var i = 0; i < filters.length; ++i) {
    state[filters[i].key] = filters[i].multiple ? [] : '';
  }
  return state;
}

function buildInitialFilterTitles(filters) {
  var state = {};
  for (var i = 0; i < filters.length; ++i) {
    state[filters[i].key] = filters[i].multiple ? [] : '';
  }
  return state;
}

function buildInitialFilterOptions(filters) {
  var state = {};
  for (var i = 0; i < filters.length; ++i) {
    state[filters[i].key] = [];
  }
  return state;
}

var vueApp = new Vue({
  el: '#root',
  data: {
    // Report-specific config: title and visible report identity.
    reportTitle: HC_REPORT_CONFIG.reportTitle,
    buildVersion: CORE_BUILD,
    isWaiting: false,
    dataSourceMode: 'hubcloud',
    mockDataUrl: './' + HC_REPORT_CONFIG.mockDataFile,

    period_from: new Date().toLocaleDateString('en-CA'),
    period_to: new Date().toLocaleDateString('en-CA'),
    dateStart: '',
    dateFinish: '',

    // Report-specific config: filter definitions for the current report.
    filters: HC_REPORT_CONFIG.filters,

    filterValues: buildInitialFilterValues(HC_REPORT_CONFIG.filters),
    filterTitles: buildInitialFilterTitles(HC_REPORT_CONFIG.filters),
    filterOptions: buildInitialFilterOptions(HC_REPORT_CONFIG.filters),

    // Report-specific config: visible table columns for the current report.
    columns: HC_REPORT_CONFIG.columns,
    rows: []
  },
  methods: {
    // Runtime and diagnostics
    debugLog: function(tag, payload) {
      if (!HC_DEBUG || typeof console === 'undefined' || !console.log) {
        return;
      }
      if (typeof payload === 'undefined') {
        console.log('[HC-DEBUG] ' + tag);
      } else {
        console.log('[HC-DEBUG] ' + tag, payload);
      }
    },

    getQueryParameters: function() {
      return HC_REPORT_CORE_API.getQueryParameters(window.location.search, window.HC_QUERY_PARAMETERS);
    },

    // Parameter normalization
    getFirstDefinedValue: function(source, aliases) {
      return HC_REPORT_CORE_API.getFirstDefinedValue(source, aliases);
    },

    normalizeSingleParameter: function(value) {
      return HC_REPORT_CORE_API.normalizeSingleParameter(value);
    },

    normalizeParameterObject: function(value, multiple) {
      return HC_REPORT_CORE_API.normalizeParameterObject(value, multiple);
    },

    initializeFilterStateFromQuery: function(filter, queryParameters) {
      var aliases = filter.aliases || [filter.key];
      var rawValue = this.getFirstDefinedValue(queryParameters, aliases);
      var normalized = this.normalizeParameterObject(rawValue, !!filter.multiple);

      this.filterValues[filter.key] = normalized.value;
      this.filterTitles[filter.key] = normalized.title;
      this.filterOptions[filter.key] = [];
    },

    normalizeDateValue: function(value) {
      return HC_REPORT_CORE_API.normalizeDateValue(value);
    },

    // Period controls
    shiftPeriod: function(days) {
      var fromDate = new Date(this.normalizeDateValue(this.period_from) + 'T00:00:00');
      var toDate = new Date(this.normalizeDateValue(this.period_to) + 'T00:00:00');
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return;
      }
      fromDate.setDate(fromDate.getDate() + days);
      toDate.setDate(toDate.getDate() + days);
      this.period_from = fromDate.toLocaleDateString('en-CA');
      this.period_to = toDate.toLocaleDateString('en-CA');
      this.loadReport();
    },

    toPeriodBoundary: function(dateValue, isEndOfDay) {
      return HC_REPORT_CORE_API.toPeriodBoundary(dateValue, isEndOfDay);
    },

    // Runtime initialization
    detectDataSourceMode: function() {
      var qp = this.getQueryParameters();
      var requestedMode = String(qp.mode || qp.source || '').toLowerCase();
      if (requestedMode === 'mock' || requestedMode === 'local') {
        return 'mock';
      }
      if (qp.mock === '1' || qp.mock === 'true') {
        return 'mock';
      }
      return 'hubcloud';
    },

    initializeRuntime: function() {
      var qp = this.getQueryParameters();
      this.dataSourceMode = this.detectDataSourceMode();

      var singleDate = this.getFirstDefinedValue(qp, ['$h.date', 'h.date', 'date']);
      if (singleDate) {
        var normalizedSingleDate = this.normalizeDateValue(singleDate);
        if (normalizedSingleDate) {
          this.period_from = normalizedSingleDate;
          this.period_to = normalizedSingleDate;
        }
      }

      var periodFromValue = this.getFirstDefinedValue(qp, ['period_from', 'date_from', 'from', '$h.period_from', 'h.period_from']);
      var periodToValue = this.getFirstDefinedValue(qp, ['period_to', 'date_to', 'to', '$h.period_to', 'h.period_to']);
      var normalizedFrom = this.normalizeDateValue(periodFromValue);
      var normalizedTo = this.normalizeDateValue(periodToValue);
      if (normalizedFrom) {
        this.period_from = normalizedFrom;
      }
      if (normalizedTo) {
        this.period_to = normalizedTo;
      }

      for (var i = 0; i < this.filters.length; ++i) {
        this.initializeFilterStateFromQuery(this.filters[i], qp);
      }

      this.debugLog('initializeRuntime', {
        period_from: this.period_from,
        period_to: this.period_to,
        filterValues: this.filterValues,
        dataSourceMode: this.dataSourceMode
      });
    },

    // Datasource transport and preparation
    executeDatasourceRequest: function(config, doneCallback, failCallback) {
      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl)
          .done(function(mockResponse) {
            var normalized = mockResponse;
            if (Array.isArray(mockResponse)) {
              normalized = { isOK: true, data: this.applyMockFilters(mockResponse) };
            } else if (mockResponse && typeof mockResponse === 'object' && Array.isArray(mockResponse.rows)) {
              normalized = { isOK: true, data: this.applyMockFilters(mockResponse.rows) };
            } else if (!mockResponse || typeof mockResponse !== 'object') {
              normalized = { isOK: true, data: [] };
            }
            doneCallback(normalized);
          }.bind(this))
          .fail(failCallback);
        return;
      }

      var safeConfig = {
        expression: String((config && config.expression) || '').trim(),
        applyDimensionRights: true
      };

      if (!safeConfig.expression) {
        failCallback(null, 'empty_expression', 'Datasource expression is empty');
        return;
      }

      this.debugLog('executeDatasourceRequest', {
        expressionLength: safeConfig.expression.length,
        expressionPreview: safeConfig.expression.slice(0, 800)
      });

      $.ajax({
        url: '/api/v1/datasource/execute/',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify(safeConfig)
      })
      .done(doneCallback)
      .fail(failCallback);
    },

    // Filter option helpers
    normalizeOptionList: function(items) {
      return HC_REPORT_CORE_API.normalizeOptionList(items);
    },

    // Datasource expression helpers
    formatDslLiteral: function(value) {
      return HC_REPORT_CORE_API.formatDslLiteral(value);
    },

    sanitizeDslNumericLiterals: function(expression) {
      return HC_REPORT_CORE_API.sanitizeDslNumericLiterals(expression);
    },

    findUnresolvedDsPlaceholders: function(expression) {
      return HC_REPORT_CORE_API.findUnresolvedDsPlaceholders(expression);
    },

    replaceDsPlaceholders: function(expression, tokenMap) {
      return HC_REPORT_CORE_API.replaceDsPlaceholders(expression, tokenMap);
    },

    getDatasourceExpression: function() {
      if (HC_REPORT_DS_TEXT && String(HC_REPORT_DS_TEXT).trim()) {
        return String(HC_REPORT_DS_TEXT).trim();
      }
      return HC_REPORT_DEFAULT_DATASOURCE_EXPRESSION;
    },

    // Report row normalization
    readField: function(item, keys, fallback) {
      for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (Object.prototype.hasOwnProperty.call(item, key) && item[key] !== null && typeof item[key] !== 'undefined') {
          return item[key];
        }
      }
      return fallback;
    },

    getRowMapKeys: function(fieldName, fallbackKeys) {
      if (HC_REPORT_CONFIG.rowMap && Array.isArray(HC_REPORT_CONFIG.rowMap[fieldName])) {
        return HC_REPORT_CONFIG.rowMap[fieldName];
      }
      if (HC_REPORT_DEFAULT_CONFIG.rowMap && Array.isArray(HC_REPORT_DEFAULT_CONFIG.rowMap[fieldName])) {
        return HC_REPORT_DEFAULT_CONFIG.rowMap[fieldName];
      }
      return fallbackKeys || [];
    },

    normalizeMappedValue: function(item, column) {
      var key = column.key;
      var rawValue = this.readField(item, this.getRowMapKeys(key), column.type === 'number' ? 0 : '');
      if (column.type === 'number') {
        return Number(rawValue || 0);
      }
      if (rawValue === null || typeof rawValue === 'undefined') {
        return '';
      }
      return String(rawValue);
    },

    normalizeHubCloudRow: function(item) {
      var row = {};
      for (var i = 0; i < this.columns.length; ++i) {
        var column = this.columns[i];
        row[column.key] = this.normalizeMappedValue(item, column);
      }
      return row;
    },

    normalizeReportRows: function(items) {
      return HC_REPORT_CORE_API.normalizeReportRows(items, this.normalizeHubCloudRow.bind(this));
    },

    getResponseDataItems: function(responseData) {
      return HC_REPORT_CORE_API.getResponseDataItems(responseData);
    },

    rowMatchesMockFilter: function(row, filter) {
      return HC_REPORT_CORE_API.rowMatchesMockFilter(row, filter, this.filterValues);
    },

    applyMockFilters: function(rows) {
      return HC_REPORT_CORE_API.applyMockFilters(rows, this.filters, this.filterValues);
    },

    resetRowsWithToast: function(message, alertClass) {
      this.rows = [];
      this.isWaiting = false;
      this.makeToast(message, alertClass);
    },

    finishReportLoadSuccess: function(responseData) {
      this.rows = this.normalizeReportRows(this.getResponseDataItems(responseData));
      this.isWaiting = false;
    },

    finishReportLoadError: function(jqXHR, textStatus, errorThrown) {
      this.resetRowsWithToast(textStatus || errorThrown || 'Ошибка загрузки отчета', 'danger');
    },

    buildHubCloudExpression: function() {
      this.dateStart = this.toPeriodBoundary(this.period_from, false);
      this.dateFinish = this.toPeriodBoundary(this.period_to, true);

      var tokenMap = {
        dateStart: this.dateStart,
        dateFinish: this.dateFinish
      };

      for (var i = 0; i < this.filters.length; ++i) {
        var filter = this.filters[i];
        tokenMap[filter.dsKey || filter.key] = this.formatDslLiteral(this.filterValues[filter.key]);
      }

      var expression = this.getDatasourceExpression();
      expression = this.replaceDsPlaceholders(expression, tokenMap);
      expression = this.sanitizeDslNumericLiterals(expression);
      return expression;
    },

    // Filter loading and defaults
    applyDefaultFilterSelection: function(filter) {
      var options = this.filterOptions[filter.key] || [];
      var currentValue = this.filterValues[filter.key];
      if (filter.multiple) {
        if (!Array.isArray(currentValue) || currentValue.length === 0) {
          this.filterValues[filter.key] = options.length > 0 ? [options[0].value] : [];
        }
        return;
      }
      if ((!currentValue || currentValue.length === 0) && options.length > 0) {
        this.filterValues[filter.key] = options[0].value;
      }
    },

    syncFilterState: function(filter) {
      this.applyDefaultFilterSelection(filter);
      this.onFilterChange(filter.key);
    },

    loadHubCloudFilters: function() {
      if (!this.filters.length) {
        return $.Deferred().resolve().promise();
      }

      var pending = [];
      for (var i = 0; i < this.filters.length; ++i) {
        (function(filter) {
          var deferred = $.Deferred();
          pending.push(deferred.promise());

          if (!filter.optionsExpression) {
            this.filterOptions[filter.key] = [];
            deferred.resolve();
            return;
          }

          this.executeDatasourceRequest(
            { expression: filter.optionsExpression },
            function(responseData) {
              var items = Array.isArray(responseData.data) ? responseData.data : [];
              this.filterOptions[filter.key] = this.normalizeOptionList(items);
              this.syncFilterState(filter);
              deferred.resolve();
            }.bind(this),
            function() {
              this.filterOptions[filter.key] = [];
              deferred.resolve();
            }.bind(this)
          );
        }.bind(this))(this.filters[i]);
      }

      return $.when.apply($, pending);
    },

    // Report loading
    loadReport: function() {
      this.isWaiting = true;

      var expression = this.buildHubCloudExpression();
      if (HC_DEBUG && typeof console !== 'undefined' && console.log) {
        console.log('[HC-DS-FINAL]', expression);
      }
      if (!String(expression).trim()) {
        this.resetRowsWithToast('Не задан getDatasourceExpression() для текущего отчета', 'warning');
        return;
      }

      var unresolved = this.findUnresolvedDsPlaceholders(expression);
      if (unresolved.length > 0) {
        this.resetRowsWithToast('Не подставлены параметры DS: ' + unresolved.join(', '), 'danger');
        return;
      }

      this.executeDatasourceRequest(
        { expression: expression },
        this.finishReportLoadSuccess.bind(this),
        this.finishReportLoadError.bind(this)
      );
    },

    // Rendering helpers
    onFilterChange: function(filterKey) {
      var options = this.filterOptions[filterKey] || [];
      var selectedValue = this.filterValues[filterKey];
      if (Array.isArray(selectedValue)) {
        var selectedTitles = [];
        for (var i = 0; i < options.length; ++i) {
          if (selectedValue.indexOf(String(options[i].value)) >= 0) {
            selectedTitles.push(options[i].title);
          }
        }
        this.filterTitles[filterKey] = selectedTitles;
        return;
      }

      var value = String(selectedValue || '');
      for (var j = 0; j < options.length; ++j) {
        if (String(options[j].value) === value) {
          this.filterTitles[filterKey] = options[j].title;
          return;
        }
      }
    },

    formatNumber: function(value) {
      var numberValue = Number(value || 0);
      if (isNaN(numberValue)) {
        return '';
      }
      return numberValue.toLocaleString('ru-RU', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      });
    },

    formatCell: function(column, value) {
      if (column.type === 'number') {
        return this.formatNumber(value);
      }
      if (value === null || typeof value === 'undefined') {
        return '';
      }
      return String(value);
    },

    cellClass: function(column, value) {
      var align = column.alignClass || '';
      if (column.type === 'number' && Number(value || 0) < 0) {
        return align + ' core-neg';
      }
      return align;
    },

    // UI actions
    escapeHtml: function(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    exportToExcel: function() {
      if (!Array.isArray(this.rows) || this.rows.length === 0) {
        this.makeToast('Нет данных для выгрузки', 'warning');
        return;
      }

      var header = '<th>#</th>';
      for (var c = 0; c < this.columns.length; ++c) {
        header += '<th>' + this.escapeHtml(this.columns[c].label) + '</th>';
      }

      var body = '';
      for (var i = 0; i < this.rows.length; ++i) {
        body += '<tr><td>' + this.escapeHtml(i + 1) + '</td>';
        for (var j = 0; j < this.columns.length; ++j) {
          var col = this.columns[j];
          body += '<td>' + this.escapeHtml(this.formatCell(col, this.rows[i][col.key])) + '</td>';
        }
        body += '</tr>';
      }

      var html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>" +
        "<table border='1'><thead><tr>" + header + "</tr></thead><tbody>" + body + "</tbody></table></body></html>";

      var blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'retail_stock_turnover_' + this.period_from + '_to_' + this.period_to + '.xls';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },

    printReport: function() {
      window.print();
    },

    makeToast: function(text, alertClass) {
      var template = "<div id='toastAlert' class='alert alert-%class% alert-dismissable' style='width:360px; position:fixed; top:20px; right:20px; z-index:9999;'><a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a><span>%text%</span></div>";
      template = template.replace('%text%', text || '');
      template = template.replace('%class%', alertClass || 'info');
      $('#toastAlert').remove();
      $('body').append(template);
      $('#toastAlert').fadeOut(4500);
    },

    // App bootstrap
    initializeData: function() {
      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl)
          .done(function(resp) {
            var payload = resp || {};

            var mockFilters = payload.filters || {};
            for (var j = 0; j < this.filters.length; ++j) {
              var filter = this.filters[j];
              var key = filter.key;
              var list = Array.isArray(mockFilters[key]) ? mockFilters[key] : [];
              this.filterOptions[key] = this.normalizeOptionList(list);
              this.syncFilterState(filter);
            }

            this.rows = this.normalizeReportRows(this.applyMockFilters(payload.rows));
          }.bind(this))
          .fail(function() {
            this.rows = [];
            this.makeToast('Не удалось загрузить mock-data.json', 'warning');
          }.bind(this));
        return;
      }

      this.loadHubCloudFilters().always(function() {
        this.loadReport();
      }.bind(this));
    }
  },
  mounted: function() {
    this.initializeRuntime();
    this.initializeData();
  }
});
