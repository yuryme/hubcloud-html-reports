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

  function toIsoDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-CA');
  }

  function getPeriodAnchorDate(periodState) {
    var anchor = normalizeDateValue(periodState && periodState.periodAnchor);
    return anchor ? new Date(anchor + 'T00:00:00') : new Date();
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
      return formatDateLabel(range.start) + ' - ' + formatDateLabel(range.finish);
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

  function sanitizeDslNumericLiterals(expression) {
    return String(expression || '').replace(/\(\s*'(-?\d+(?:\.\d+)?)'\s*\)/g, '($1)');
  }

  function findUnresolvedDsPlaceholders(expression) {
    var source = String(expression || '');
    var matches = source.match(/&[A-Za-z\u0410-\u042F\u0430-\u044F_][A-Za-z\u0410-\u042F\u0430-\u044F0-9_\.\(\)-]*/g) || [];
    var unique = [];
    for (var i = 0; i < matches.length; ++i) {
      if (unique.indexOf(matches[i]) < 0) {
        unique.push(matches[i]);
      }
    }
    return unique;
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

  global.HC_REPORT_LOCAL_CORE = {
    getQueryParameters: getQueryParameters,
    normalizeDateValue: normalizeDateValue,
    toPeriodBoundary: toPeriodBoundary,
    getStandardPeriodModes: getStandardPeriodModes,
    buildStandardPeriodState: buildStandardPeriodState,
    getPeriodRange: getPeriodRange,
    formatDateLabel: formatDateLabel,
    formatPeriodLabel: formatPeriodLabel,
    canShiftPeriod: canShiftPeriod,
    shiftPeriodState: shiftPeriodState,
    sanitizeDslNumericLiterals: sanitizeDslNumericLiterals,
    findUnresolvedDsPlaceholders: findUnresolvedDsPlaceholders,
    replaceDsPlaceholders: replaceDsPlaceholders,
    getResponseDataItems: getResponseDataItems,
    normalizeReportRows: normalizeReportRows
  };
})(window);

var HC_REPORT_CORE_API = window.HC_REPORT_CORE || window.HC_REPORT_LOCAL_CORE;
var HC_REPORT_MANIFEST = window.HC_REPORT_MANIFEST || null;
var HC_REPORT_DS_TEXT = window.HC_REPORT_DS_TEXT || null;
var HC_REPORT_EMBEDDED_FALLBACK_CONFIG = {
  reportTitle: 'Рабочее место руководителя',
  mockDataFile: 'mock-data.json',
  tabs: [
    { key: 'expenses', title: 'Расходы DS' },
    { key: 'kp', title: 'КП' }
  ],
  filters: [],
  columns: [
    { key: 'id', label: 'id', type: 'text', alignClass: 'text-left' },
    { key: 'registrator', label: 'registrator_title', type: 'text', alignClass: 'text-left' },
    { key: 'date', label: 'date', type: 'text', alignClass: 'text-left' },
    { key: 'budgetitem', label: 'budgetitem_title', type: 'text', alignClass: 'text-left' },
    { key: 'companyaccount', label: 'companyaccount_title', type: 'text', alignClass: 'text-left' },
    { key: 'partner', label: 'partner_title', type: 'text', alignClass: 'text-left' },
    { key: 'person', label: 'person_title', type: 'text', alignClass: 'text-left' },
    { key: 'номер_заказа', label: 'номер_заказа', type: 'text', alignClass: 'text-left' },
    { key: 'комментарий', label: 'комментарий', type: 'text', alignClass: 'text-left' },
    { key: 'коммент_директор', label: 'коммент_директор', type: 'text', alignClass: 'text-left' },
    { key: 'amount', label: 'amount', type: 'text', alignClass: 'text-left' }
  ],
  rowMap: {
    id: ['id'],
    registrator: ['registrator_title', 'registrator'],
    date: ['date'],
    budgetitem: ['budgetitem_title', 'budgetitem'],
    companyaccount: ['companyaccount_title', 'companyaccount'],
    partner: ['partner_title', 'partner'],
    person: ['person_title', 'person'],
    '\u043d\u043e\u043c\u0435\u0440_\u0437\u0430\u043a\u0430\u0437\u0430': ['\u043d\u043e\u043c\u0435\u0440_\u0437\u0430\u043a\u0430\u0437\u0430'],
    '\u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439': ['\u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439'],
    '\u043a\u043e\u043c\u043c\u0435\u043d\u0442_\u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440': ['\u043a\u043e\u043c\u043c\u0435\u043d\u0442_\u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440'],
    amount: ['amount']
  },
  datasourceExpression: [
    'деньги | period (&dateStart, &dateFinish) |Select(id, registrator, date, budgetitem, companyaccount, partner, person,  номер_заказа, комментарий, коммент_директор) | Gettitle() as t1;',
    'TempTable.t1 | Select (id, date, registrator_title, номер_заказа, budgetitem_title,companyaccount_title, partner_title, person_title, комментарий, коммент_директор, amount)'
  ].join('\n')
};

function buildMergedReportConfig(baseConfig, overrideConfig) {
  var base = baseConfig || {};
  var override = overrideConfig || {};

  return {
    reportTitle: override.reportTitle || base.reportTitle || '',
    mockDataFile: override.mockDataFile || base.mockDataFile || 'mock-data.json',
    tabs: Array.isArray(override.tabs) && override.tabs.length > 0
      ? override.tabs
      : (Array.isArray(base.tabs) ? base.tabs : []),
    filters: Array.isArray(override.filters) && override.filters.length > 0
      ? override.filters
      : (Array.isArray(base.filters) ? base.filters : []),
    columns: Array.isArray(override.columns) && override.columns.length > 0
      ? override.columns
      : (Array.isArray(base.columns) ? base.columns : []),
    rowMap: override.rowMap || base.rowMap || {},
    datasourceExpression: override.datasourceExpression || base.datasourceExpression || ''
  };
}

var HC_REPORT_DEFAULT_CONFIG = buildMergedReportConfig(
  HC_REPORT_EMBEDDED_FALLBACK_CONFIG,
  window.HC_REPORT_DEFAULT_CONFIG || null
);
var HC_REPORT_CONFIG = buildMergedReportConfig(HC_REPORT_DEFAULT_CONFIG, HC_REPORT_MANIFEST);

function buildReportAssetUrl(fileName) {
  return './' + String(fileName || '');
}

var vueApp = new Vue({
  el: '#root',
  data: {
    reportTitle: HC_REPORT_CONFIG.reportTitle,
    tabs: HC_REPORT_CONFIG.tabs,
    activeTab: 'expenses',
    dataSourceMode: 'hubcloud',
    isWaiting: false,
    mockDataUrl: buildReportAssetUrl(HC_REPORT_CONFIG.mockDataFile),
    columns: HC_REPORT_CONFIG.columns,
    rows: [],
    statusPanelDragging: false,
    statusPanelPosition: {
      x: null,
      y: null
    },
    statusPanelDragOffset: {
      x: 0,
      y: 0
    },
    periodMode: 'day',
    periodAnchor: '',
    customDateStart: '',
    customDateFinish: '',
    showPeriodMenu: false,
    periodModes: HC_REPORT_CORE_API.getStandardPeriodModes()
  },
  computed: {
    currentColumns: function() {
      return this.activeTab === 'expenses' ? this.columns : [];
    },

    activeTabTitle: function() {
      for (var i = 0; i < this.tabs.length; ++i) {
        if (this.tabs[i].key === this.activeTab) {
          return this.tabs[i].title;
        }
      }
      return '';
    },

    totalAmount: function() {
      var sum = 0;
      for (var i = 0; i < this.rows.length; ++i) {
        sum += this.parseAmount(this.rows[i].amount);
      }
      return sum;
    },

    periodDisplayLabel: function() {
      return HC_REPORT_CORE_API.formatPeriodLabel(this.getPeriodState());
    },

    canShiftPeriod: function() {
      return HC_REPORT_CORE_API.canShiftPeriod(this.getPeriodState());
    },

    statusPanelStyle: function() {
      if (this.statusPanelPosition.x === null || this.statusPanelPosition.y === null) {
        return null;
      }

      return {
        left: this.statusPanelPosition.x + 'px',
        top: this.statusPanelPosition.y + 'px',
        right: 'auto'
      };
    }
  },
  methods: {
    getQueryParameters: function() {
      return HC_REPORT_CORE_API.getQueryParameters(window.location.search, window.HC_QUERY_PARAMETERS);
    },

    getPeriodState: function() {
      return {
        periodMode: this.periodMode,
        periodAnchor: this.periodAnchor,
        customDateStart: this.customDateStart,
        customDateFinish: this.customDateFinish,
        showPeriodMenu: this.showPeriodMenu
      };
    },

    applyPeriodState: function(nextState) {
      var state = nextState || {};
      this.periodMode = state.periodMode || 'day';
      this.periodAnchor = state.periodAnchor || '';
      this.customDateStart = state.customDateStart || '';
      this.customDateFinish = state.customDateFinish || '';
      this.showPeriodMenu = !!state.showPeriodMenu;
      if (Array.isArray(state.periodModes) && state.periodModes.length > 0) {
        this.periodModes = state.periodModes;
      }
    },

    detectDataSourceMode: function() {
      var queryParameters = this.getQueryParameters();
      var requestedMode = String(queryParameters.mode || queryParameters.source || '').toLowerCase();
      if (requestedMode === 'mock' || requestedMode === 'local') {
        return 'mock';
      }
      if (queryParameters.mock === '1' || queryParameters.mock === 'true') {
        return 'mock';
      }
      return 'hubcloud';
    },

    initializeRuntime: function() {
      var queryParameters = this.getQueryParameters();
      this.dataSourceMode = this.detectDataSourceMode();
      this.applyPeriodState(HC_REPORT_CORE_API.buildStandardPeriodState(queryParameters));
    },

    togglePeriodMenu: function() {
      this.showPeriodMenu = !this.showPeriodMenu;
    },

    selectPeriodMode: function(modeKey) {
      this.periodMode = modeKey;
      if (modeKey !== 'custom') {
        this.showPeriodMenu = false;
        this.loadReport();
      }
    },

    applyCustomPeriod: function() {
      if (!this.customDateStart || !this.customDateFinish) {
        this.makeToast('Укажите обе даты для произвольного периода', 'warning');
        return;
      }

      this.showPeriodMenu = false;
      this.loadReport();
    },

    shiftPeriod: function(delta) {
      if (!this.canShiftPeriod) {
        return;
      }

      this.applyPeriodState(HC_REPORT_CORE_API.shiftPeriodState(this.getPeriodState(), delta));
      this.loadReport();
    },

    handleDocumentClick: function(event) {
      var shell = this.$refs.periodMenuShell;
      if (!shell || shell.contains(event.target)) {
        return;
      }
      this.showPeriodMenu = false;
    },

    getPointerPoint: function(event) {
      if (event.touches && event.touches.length > 0) {
        return {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }

      return {
        x: event.clientX,
        y: event.clientY
      };
    },

    startStatusPanelDrag: function(event) {
      if (window.innerWidth <= 980) {
        return;
      }

      var panel = this.$refs.statusPanel;
      if (!panel) {
        return;
      }

      var point = this.getPointerPoint(event);
      var rect = panel.getBoundingClientRect();

      this.statusPanelDragging = true;
      this.statusPanelPosition = {
        x: rect.left,
        y: rect.top
      };
      this.statusPanelDragOffset = {
        x: point.x - rect.left,
        y: point.y - rect.top
      };

      if (event.cancelable) {
        event.preventDefault();
      }
    },

    updateStatusPanelDrag: function(event) {
      if (!this.statusPanelDragging) {
        return;
      }

      var panel = this.$refs.statusPanel;
      if (!panel) {
        return;
      }

      var point = this.getPointerPoint(event);
      var panelWidth = panel.offsetWidth || 320;
      var panelHeight = panel.offsetHeight || 240;
      var nextX = point.x - this.statusPanelDragOffset.x;
      var nextY = point.y - this.statusPanelDragOffset.y;
      var maxX = Math.max(8, window.innerWidth - panelWidth - 8);
      var maxY = Math.max(8, window.innerHeight - panelHeight - 8);

      this.statusPanelPosition = {
        x: Math.min(Math.max(8, nextX), maxX),
        y: Math.min(Math.max(8, nextY), maxY)
      };

      if (event.cancelable) {
        event.preventDefault();
      }
    },

    stopStatusPanelDrag: function() {
      if (!this.statusPanelDragging) {
        return;
      }

      this.statusPanelDragging = false;
    },

    executeDatasourceRequest: function(config, doneCallback, failCallback) {
      if (this.dataSourceMode === 'mock') {
        this.loadMockPayload()
          .done(function(mockPayload) {
            doneCallback(this.buildMockDatasourceResponse(mockPayload));
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

    getDatasourceExpression: function() {
      if (HC_REPORT_DS_TEXT && String(HC_REPORT_DS_TEXT).trim()) {
        return String(HC_REPORT_DS_TEXT).trim();
      }
      return HC_REPORT_CONFIG.datasourceExpression || '';
    },

    getReportPeriodRange: function() {
      return HC_REPORT_CORE_API.getPeriodRange(this.getPeriodState());
    },

    buildDatasourceTokenMap: function() {
      var range = this.getReportPeriodRange();
      var isUnlimited = this.periodMode === 'unlimited';

      return {
        dateStart: isUnlimited ? '' : HC_REPORT_CORE_API.toPeriodBoundary(range.start, false),
        dateFinish: isUnlimited ? '' : HC_REPORT_CORE_API.toPeriodBoundary(range.finish, true)
      };
    },

    buildHubCloudExpression: function() {
      var tokenMap = this.buildDatasourceTokenMap();
      var expression = this.getDatasourceExpression();
      expression = HC_REPORT_CORE_API.replaceDsPlaceholders(expression, tokenMap);
      expression = HC_REPORT_CORE_API.sanitizeDslNumericLiterals(expression);
      return expression;
    },

    validateDatasourceExpression: function(expression) {
      if (!String(expression || '').trim()) {
        return 'Не задан getDatasourceExpression() для текущего отчета';
      }

      var unresolved = HC_REPORT_CORE_API.findUnresolvedDsPlaceholders(expression);
      if (unresolved.length > 0) {
        return 'Не подставлены параметры DS: ' + unresolved.join(', ');
      }

      return '';
    },

    loadMockPayload: function() {
      return $.getJSON(this.mockDataUrl).then(function(response) {
        return response || {};
      });
    },

    getMockRows: function(mockPayload) {
      if (Array.isArray(mockPayload)) {
        return mockPayload;
      }
      if (mockPayload && typeof mockPayload === 'object' && Array.isArray(mockPayload.rows)) {
        return mockPayload.rows;
      }
      return [];
    },

    buildMockDatasourceResponse: function(mockPayload) {
      return {
        isOK: true,
        data: this.getMockRows(mockPayload)
      };
    },

    readField: function(item, keys, fallback) {
      for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (Object.prototype.hasOwnProperty.call(item, key) && item[key] !== null && typeof item[key] !== 'undefined') {
          return item[key];
        }
      }
      return fallback;
    },

    getRowMapKeys: function(fieldName) {
      if (HC_REPORT_CONFIG.rowMap && Array.isArray(HC_REPORT_CONFIG.rowMap[fieldName])) {
        return HC_REPORT_CONFIG.rowMap[fieldName];
      }
      return [fieldName];
    },

    normalizeHubCloudRow: function(item) {
      var row = {};
      for (var i = 0; i < this.columns.length; ++i) {
        var column = this.columns[i];
        var value = this.readField(item, this.getRowMapKeys(column.key), '');
        row[column.key] = value === null || typeof value === 'undefined' ? '' : String(value);
      }
      return row;
    },

    normalizeReportRows: function(items) {
      return HC_REPORT_CORE_API.normalizeReportRows(items, this.normalizeHubCloudRow.bind(this));
    },

    finishReportLoadSuccess: function(responseData) {
      this.rows = this.normalizeReportRows(HC_REPORT_CORE_API.getResponseDataItems(responseData));
      this.isWaiting = false;
    },

    finishReportLoadError: function(jqXHR, textStatus, errorThrown) {
      this.rows = [];
      this.isWaiting = false;
      this.makeToast(textStatus || errorThrown || 'Ошибка загрузки отчета', 'danger');
    },

    loadReport: function() {
      this.isWaiting = true;

      var expression = this.buildHubCloudExpression();
      var validationError = this.validateDatasourceExpression(expression);
      if (validationError) {
        this.rows = [];
        this.isWaiting = false;
        this.makeToast(validationError, validationError.indexOf('Не задан') === 0 ? 'warning' : 'danger');
        return;
      }

      this.executeDatasourceRequest(
        { expression: expression },
        this.finishReportLoadSuccess.bind(this),
        this.finishReportLoadError.bind(this)
      );
    },

    switchTab: function(tabKey) {
      this.activeTab = tabKey;
    },

    formatCell: function(column, value) {
      if (value === null || typeof value === 'undefined') {
        return '';
      }
      return String(value);
    },

    parseAmount: function(value) {
      if (value === null || typeof value === 'undefined') {
        return 0;
      }

      var normalized = String(value).replace(/\s+/g, '').replace(',', '.');
      var numeric = parseFloat(normalized);
      return isNaN(numeric) ? 0 : numeric;
    },

    formatTotalAmount: function(value) {
      return Number(value || 0).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    totalCellValue: function(column) {
      if (column.key === 'id') {
        return '\u0418\u0442\u043e\u0433\u0438';
      }
      if (column.key === 'amount') {
        return this.formatTotalAmount(this.totalAmount);
      }
      return '';
    },

    escapeHtml: function(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    exportToExcel: function() {
      if (this.activeTab !== 'expenses') {
        this.makeToast('Экспорт пока доступен только для вкладки «Расходы DS»', 'warning');
        return;
      }

      if (!Array.isArray(this.rows) || this.rows.length === 0) {
        this.makeToast('Нет данных для выгрузки', 'warning');
        return;
      }

      var header = '<th>#</th>';
      for (var c = 0; c < this.currentColumns.length; ++c) {
        header += '<th>' + this.escapeHtml(this.currentColumns[c].label) + '</th>';
      }

      var body = '';
      for (var i = 0; i < this.rows.length; ++i) {
        body += '<tr><td>' + this.escapeHtml(i + 1) + '</td>';
        for (var j = 0; j < this.currentColumns.length; ++j) {
          var col = this.currentColumns[j];
          body += '<td>' + this.escapeHtml(this.formatCell(col, this.rows[i][col.key])) + '</td>';
        }
        body += '</tr>';
      }

      var html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><table border='1'><thead><tr>" + header + "</tr></thead><tbody>" + body + "</tbody></table></body></html>";
      var blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'rabochee_mesto_rukovoditelya_rashody_ds.xls';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },

    makeToast: function(text, alertClass) {
      var template = "<div id='toastAlert' class='toast-alert toast-%class%'><button type='button' class='toast-close'>&times;</button><span>%text%</span></div>";
      template = template.replace('%class%', alertClass || 'info');
      template = template.replace('%text%', this.escapeHtml(text || ''));
      $('#toastAlert').remove();
      $('body').append(template);
      $('#toastAlert .toast-close').on('click', function() {
        $('#toastAlert').remove();
      });
      setTimeout(function() {
        $('#toastAlert').fadeOut(400, function() {
          $(this).remove();
        });
      }, 4200);
    },

    bootstrapMockData: function(payload) {
      this.rows = this.normalizeReportRows(this.buildMockDatasourceResponse(payload).data);
    },

    startMockMode: function() {
      this.loadMockPayload()
        .done(function(payload) {
          this.bootstrapMockData(payload);
        }.bind(this))
        .fail(function() {
          this.rows = [];
          this.makeToast('Не удалось загрузить mock-data.json', 'warning');
        }.bind(this));
    },

    initializeData: function() {
      if (this.dataSourceMode === 'mock') {
        this.startMockMode();
        return;
      }

      this.loadReport();
    }
  },
  mounted: function() {
    this.initializeRuntime();
    this.initializeData();
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('mousemove', this.updateStatusPanelDrag);
    document.addEventListener('mouseup', this.stopStatusPanelDrag);
    document.addEventListener('touchmove', this.updateStatusPanelDrag, { passive: false });
    document.addEventListener('touchend', this.stopStatusPanelDrag);
  },
  beforeDestroy: function() {
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('mousemove', this.updateStatusPanelDrag);
    document.removeEventListener('mouseup', this.stopStatusPanelDrag);
    document.removeEventListener('touchmove', this.updateStatusPanelDrag);
    document.removeEventListener('touchend', this.stopStatusPanelDrag);
  }
});

