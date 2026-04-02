var CORE_BUILD = 'core-baseline-2026-04-03.1';
var HC_DEBUG = false;

var vueApp = new Vue({
  el: '#root',
  data: {
    reportTitle: 'Новый отчет',
    buildVersion: CORE_BUILD,
    isWaiting: false,
    dataSourceMode: 'hubcloud',
    mockDataUrl: './mock-data.json',

    period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA'),
    period_to: new Date().toLocaleDateString('en-CA'),
    dateStart: '',
    dateFinish: '',
    dateStartPrevEnd: '',

    // CORE: default filter contract. You can change titles, aliases, and option expressions for new reports.
    filters: [
      {
        key: 'warehouse',
        title: 'Склад',
        aliases: ['warehouse', 'склад', '$warehouse', '$склад'],
        optionsExpression: 'catalog.склад | Select(id, title)'
      },
      {
        key: 'group',
        title: 'Номенклатурная группа',
        aliases: ['group', 'номенклатурная_группа', 'группа', '$group', '$группа'],
        optionsExpression: 'catalog.группа | Select(id, title)'
      }
    ],

    filterValues: {},
    filterTitles: {},
    filterOptions: {},

    // CORE: report columns are customizable per report.
    columns: [
      { key: 'name', label: 'Наименование', type: 'text', alignClass: 'text-left' },
      { key: 'value', label: 'Значение', type: 'number', alignClass: 'text-right' }
    ],
    rows: []
  },
  methods: {
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
      var queryParameters = {};
      var externalParameters = window.HC_QUERY_PARAMETERS;
      if (externalParameters && typeof externalParameters === 'object') {
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

    normalizeParameterObject: function(value) {
      if (Array.isArray(value)) {
        return value.length > 0 ? this.normalizeParameterObject(value[0]) : { value: '', title: '' };
      }

      if (value && typeof value === 'object') {
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

        return { value: String(rawValue), title: String(rawTitle) };
      }

      if (value === null || typeof value === 'undefined') {
        return { value: '', title: '' };
      }

      return { value: String(value), title: String(value) };
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
      var normalizedDate = this.normalizeDateValue(dateValue);
      if (!normalizedDate) {
        return '';
      }
      return normalizedDate + (isEndOfDay ? ' 23:59:59' : ' 00:00:00');
    },

    getPreviousDayEndBoundary: function(dateValue) {
      var normalizedDate = this.normalizeDateValue(dateValue);
      if (!normalizedDate) {
        return '';
      }
      var baseDate = new Date(normalizedDate + 'T00:00:00');
      if (isNaN(baseDate.getTime())) {
        return '';
      }
      baseDate.setDate(baseDate.getDate() - 1);
      return baseDate.toLocaleDateString('en-CA') + ' 23:59:59';
    },

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
        var filter = this.filters[i];
        var param = this.normalizeParameterObject(this.getFirstDefinedValue(qp, filter.aliases || [filter.key]));
        this.filterValues[filter.key] = param.value;
        this.filterTitles[filter.key] = param.title;
        this.filterOptions[filter.key] = [];
      }

      this.debugLog('initializeRuntime', {
        period_from: this.period_from,
        period_to: this.period_to,
        filterValues: this.filterValues,
        dataSourceMode: this.dataSourceMode
      });
    },

    executeDatasourceRequest: function(config, doneCallback, failCallback) {
      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl)
          .done(function(mockResponse) {
            var normalized = mockResponse;
            if (Array.isArray(mockResponse)) {
              normalized = { isOK: true, data: mockResponse };
            } else if (!mockResponse || typeof mockResponse !== 'object') {
              normalized = { isOK: true, data: [] };
            }
            doneCallback(normalized);
          })
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
      var keys = Object.keys(tokenMap || {});
      for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        out = out.split('&' + key).join(tokenMap[key]);
      }
      return out;
    },

    // EXTENSION POINT: Replace this with report-specific DS text.
    // Use placeholders like &dateStart, &dateFinish, &warehouse, &group when needed.
    getDatasourceExpression: function() {
      return '';
    },

    // EXTENSION POINT: map DS row to UI row shape.
    normalizeHubCloudRow: function(item) {
      var normalized = {};
      for (var i = 0; i < this.columns.length; ++i) {
        var col = this.columns[i];
        normalized[col.key] = item[col.key];
      }
      return normalized;
    },

    buildHubCloudExpression: function() {
      this.dateStart = this.toPeriodBoundary(this.period_from, false);
      this.dateFinish = this.toPeriodBoundary(this.period_to, true);
      this.dateStartPrevEnd = this.getPreviousDayEndBoundary(this.period_from);

      var tokenMap = {
        dateStart: this.dateStart,
        dateFinish: this.dateFinish,
        dateStartPrevEnd: this.dateStartPrevEnd
      };

      for (var i = 0; i < this.filters.length; ++i) {
        var filter = this.filters[i];
        tokenMap[filter.key] = this.formatDslLiteral(this.filterValues[filter.key]);
      }

      var expression = this.getDatasourceExpression();
      expression = this.replaceDsPlaceholders(expression, tokenMap);
      expression = this.sanitizeDslNumericLiterals(expression);
      return expression;
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
              if (!this.filterValues[filter.key] && this.filterOptions[filter.key].length > 0) {
                this.filterValues[filter.key] = this.filterOptions[filter.key][0].value;
              }
              this.onFilterChange(filter.key);
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

    loadReport: function() {
      this.isWaiting = true;

      var expression = this.buildHubCloudExpression();
      if (!String(expression).trim()) {
        this.isWaiting = false;
        this.rows = [];
        this.makeToast('Не задан getDatasourceExpression() для текущего отчета', 'warning');
        return;
      }

      var unresolved = this.findUnresolvedDsPlaceholders(expression);
      if (unresolved.length > 0) {
        this.isWaiting = false;
        this.rows = [];
        this.makeToast('Не подставлены параметры DS: ' + unresolved.join(', '), 'danger');
        return;
      }

      this.executeDatasourceRequest(
        { expression: expression },
        function(responseData) {
          var sourceItems = Array.isArray(responseData.data) ? responseData.data : [];
          var out = [];
          for (var i = 0; i < sourceItems.length; ++i) {
            out.push(this.normalizeHubCloudRow(sourceItems[i] || {}));
          }
          this.rows = out;
          this.isWaiting = false;
        }.bind(this),
        function(jqXHR, textStatus, errorThrown) {
          this.rows = [];
          this.isWaiting = false;
          this.makeToast(textStatus || errorThrown || 'Ошибка загрузки отчета', 'danger');
        }.bind(this)
      );
    },

    onFilterChange: function(filterKey) {
      var options = this.filterOptions[filterKey] || [];
      var value = String(this.filterValues[filterKey] || '');
      for (var i = 0; i < options.length; ++i) {
        if (String(options[i].value) === value) {
          this.filterTitles[filterKey] = options[i].title;
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

      var header = '';
      for (var c = 0; c < this.columns.length; ++c) {
        header += '<th>' + this.escapeHtml(this.columns[c].label) + '</th>';
      }

      var body = '';
      for (var i = 0; i < this.rows.length; ++i) {
        body += '<tr>';
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
      link.download = 'report_' + this.period_from + '_to_' + this.period_to + '.xls';
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

    initializeData: function() {
      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl)
          .done(function(resp) {
            var payload = resp || {};
            var mockRows = Array.isArray(payload.rows) ? payload.rows : [];
            this.rows = mockRows;

            var mockFilters = payload.filters || {};
            for (var i = 0; i < this.filters.length; ++i) {
              var key = this.filters[i].key;
              var list = Array.isArray(mockFilters[key]) ? mockFilters[key] : [];
              this.filterOptions[key] = this.normalizeOptionList(list);
              if (!this.filterValues[key] && this.filterOptions[key].length > 0) {
                this.filterValues[key] = this.filterOptions[key][0].value;
              }
              this.onFilterChange(key);
            }
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
