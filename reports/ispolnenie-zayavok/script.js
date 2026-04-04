var embeddedFallbackConfig = {
  reportTitle: 'Отчет: Исполнение заявок',
  mockDataFile: 'mock-data.json',
  filters: [
    {
      key: 'клиент',
      dsKey: 'клиент',
      title: 'Клиент',
      multiple: false,
      aliases: ['клиент', 'partner', '$' + 'клиент', '$' + 'partner'],
      optionsExpression: 'catalog.partner | свойвнешний (1) | Select (id, title) | Gettitle()'
    }
  ],
  columns: [
    { key: 'partner_title', label: 'Клиент', type: 'text', alignClass: 'text-left' }
  ],
  rowMap: {
    partner: ['partner', 'клиент'],
    partner_title: ['partner_title', 'partner_name', 'клиент_title'],
    product: ['номенклатура', 'product'],
    product_title: ['номенклатура_title', 'product_title', 'name'],
    qty: ['колво', 'qty', 'количество']
  },
  layout: {
    rows: ['Клиент'],
    columns: ['Номенклатура'],
    values: ['Кол-во']
  },
  datasourceExpression: 'исполнение_заявок | Period(&dateStart,&dateFinish ) | partner(&клиент) | GroupBy(partner, номенклатура, колво) | GetTitle() | Having (колво > 0)'
};

var reportDefaults = Object.assign({}, embeddedFallbackConfig, window.HC_REPORT_DEFAULT_CONFIG || {});
var reportManifest = window.HC_REPORT_MANIFEST || {};
var reportConfig = Object.assign({}, reportDefaults, reportManifest);
var reportCore = window.HC_REPORT_CORE || null;

new Vue({
  el: '#root',
  data: {
    reportTitle: reportConfig.reportTitle || 'Отчет: Исполнение заявок',
    dataSourceMode: 'hubcloud',
    mockDataUrl: reportConfig.mockDataFile || 'mock-data.json',
    periodMode: 'day',
    periodAnchor: '',
    customDateStart: '',
    customDateFinish: '',
    showPeriodMenu: false,
    periodModes: reportCore && typeof reportCore.getStandardPeriodModes === 'function'
      ? reportCore.getStandardPeriodModes()
      : [
          { key: 'day', label: 'День' },
          { key: 'month', label: 'Месяц' },
          { key: 'quarter', label: 'Квартал' },
          { key: 'year', label: 'Год' },
          { key: 'custom', label: 'Произвольный' },
          { key: 'unlimited', label: 'Без ограничения' }
        ],
    filters: Array.isArray(reportConfig.filters) ? reportConfig.filters : [],
    filterValues: { клиент: '' },
    filterOptions: { клиент: [] },
    rawRows: [],
    axisOptions: [
      { key: 'partner_title', label: 'Клиент' },
      { key: 'product_title', label: 'Номенклатура' }
    ],
    columnAxisOptionsList: [
      { key: 'none', label: 'Не выбрано' },
      { key: 'partner_title', label: 'Клиент' },
      { key: 'product_title', label: 'Номенклатура' }
    ],
    rowAxis: 'partner_title',
    columnAxis: 'product_title',
    visibleColumns: [{ key: 'partner_title', label: 'Клиент' }],
    dynamicColumns: [],
    pivotRows: [],
    totalsRow: {},
    hoveredRowIndex: -1,
    hoverTooltip: {
      visible: false,
      label: '',
      total: 0,
      left: 0,
      top: 0
    },
    detailModal: {
      visible: false,
      closing: false,
      title: '',
      subtitle: '',
      dimensionLabel: '',
      items: [],
      total: 0
    },
    isWaiting: false,
    _zipCrcTable: null
  },

  computed: {
    rowAxisLabel: function() {
      return this.getAxisLabel(this.rowAxis);
    },

    periodDisplayLabel: function() {
      return this.formatPeriodLabel();
    },

    canShiftPeriod: function() {
      if (reportCore && typeof reportCore.canShiftPeriod === 'function') {
        return reportCore.canShiftPeriod({
          periodMode: this.periodMode
        });
      }
      return this.periodMode !== 'custom' && this.periodMode !== 'unlimited';
    },

    rowAxisOptions: function() {
      return this.axisOptions.slice();
    },

    columnAxisOptions: function() {
      return this.columnAxisOptionsList.slice();
    }
  },

  methods: {
    getAxisLabel: function(axisKey) {
      for (var i = 0; i < this.axisOptions.length; ++i) {
        if (this.axisOptions[i].key === axisKey) {
          return this.axisOptions[i].label;
        }
      }
      return axisKey;
    },

    onAxisChange: function(changedAxis) {
      if (this.columnAxis !== 'none' && this.rowAxis === this.columnAxis) {
        if (changedAxis === 'row') {
          this.columnAxis = this.rowAxis === 'partner_title' ? 'product_title' : 'partner_title';
        } else {
          this.rowAxis = this.columnAxis === 'partner_title' ? 'product_title' : 'partner_title';
        }
      }
      this.buildPivotMatrix(this.rawRows);
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

    detectDataSourceMode: function() {
      var queryParameters = this.getQueryParameters();
      var requestedMode = (queryParameters.mode || '').toString().toLowerCase();
      if (requestedMode === 'mock' || queryParameters.mock === '1' || queryParameters.mock === 'true') {
        return 'mock';
      }
      return 'hubcloud';
    },

    normalizeDateValue: function(value) {
      if (!value) {
        return '';
      }
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toLocaleDateString('en-CA');
      }
      var iso = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso) {
        return iso[1];
      }
      var ru = String(value).match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (ru) {
        return ru[3] + '-' + ru[2] + '-' + ru[1];
      }
      var parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-CA');
      }
      return '';
    },

    formatDateLabel: function(value) {
      if (reportCore && typeof reportCore.formatDateLabel === 'function') {
        return reportCore.formatDateLabel(value);
      }
      var normalized = this.normalizeDateValue(value);
      if (!normalized) {
        return '';
      }
      var parts = normalized.split('-');
      return parts[2] + '.' + parts[1] + '.' + parts[0];
    },

    getPeriodAnchorDate: function() {
      var anchor = this.normalizeDateValue(this.periodAnchor);
      return anchor ? new Date(anchor + 'T00:00:00') : new Date();
    },

    toIsoDate: function(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('en-CA');
    },

    addMonths: function(date, delta) {
      var result = new Date(date.getTime());
      result.setDate(1);
      result.setMonth(result.getMonth() + delta);
      return result;
    },

    addYears: function(date, delta) {
      var result = new Date(date.getTime());
      result.setDate(1);
      result.setFullYear(result.getFullYear() + delta);
      return result;
    },

    getMonthLabel: function(date) {
      return date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
      }).replace(/^./, function(char) { return char.toUpperCase(); });
    },

    getQuarterNumber: function(date) {
      return Math.floor(date.getMonth() / 3) + 1;
    },

    getQuarterStart: function(date) {
      return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
    },

    getQuarterEnd: function(date) {
      return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 3, 0);
    },

    getPeriodRange: function() {
      if (reportCore && typeof reportCore.getPeriodRange === 'function') {
        return reportCore.getPeriodRange({
          periodMode: this.periodMode,
          periodAnchor: this.periodAnchor,
          customDateStart: this.customDateStart,
          customDateFinish: this.customDateFinish
        });
      }
      var anchor = this.getPeriodAnchorDate();
      var start;
      var end;

      if (this.periodMode === 'unlimited') {
        return { start: '', finish: '' };
      }

      if (this.periodMode === 'custom') {
        return {
          start: this.normalizeDateValue(this.customDateStart),
          finish: this.normalizeDateValue(this.customDateFinish || this.customDateStart)
        };
      }

      if (this.periodMode === 'month') {
        start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      } else if (this.periodMode === 'quarter') {
        start = this.getQuarterStart(anchor);
        end = this.getQuarterEnd(anchor);
      } else if (this.periodMode === 'year') {
        start = new Date(anchor.getFullYear(), 0, 1);
        end = new Date(anchor.getFullYear(), 11, 31);
      } else {
        start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
        end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      }

      return {
        start: this.toIsoDate(start),
        finish: this.toIsoDate(end)
      };
    },

    formatPeriodLabel: function() {
      if (reportCore && typeof reportCore.formatPeriodLabel === 'function') {
        return reportCore.formatPeriodLabel({
          periodMode: this.periodMode,
          periodAnchor: this.periodAnchor,
          customDateStart: this.customDateStart,
          customDateFinish: this.customDateFinish
        });
      }
      var range = this.getPeriodRange();
      var anchor = this.getPeriodAnchorDate();

      if (this.periodMode === 'unlimited') {
        return 'Без ограничения';
      }
      if (this.periodMode === 'custom') {
        if (!range.start || !range.finish) {
          return 'Произвольный';
        }
        return this.formatDateLabel(range.start) + '-' + this.formatDateLabel(range.finish);
      }
      if (this.periodMode === 'month') {
        return this.getMonthLabel(anchor);
      }
      if (this.periodMode === 'quarter') {
        return this.getQuarterNumber(anchor) + ' квартал ' + anchor.getFullYear();
      }
      if (this.periodMode === 'year') {
        return String(anchor.getFullYear());
      }
      return this.formatDateLabel(range.start);
    },

    togglePeriodMenu: function() {
      this.showPeriodMenu = !this.showPeriodMenu;
    },

    handleDocumentClick: function(event) {
      var shell = this.$refs.periodMenuShell;
      if (!shell || shell.contains(event.target)) {
        return;
      }
      this.showPeriodMenu = false;
    },

    selectPeriodMode: function(modeKey) {
      var previousRange = this.getPeriodRange();
      this.periodMode = modeKey;
      if (modeKey === 'custom') {
        this.customDateStart = previousRange.start || this.normalizeDateValue(new Date());
        this.customDateFinish = previousRange.finish || this.customDateStart;
        return;
      }
      this.showPeriodMenu = false;
      this.loadReport();
    },

    applyCustomPeriod: function() {
      var start = this.normalizeDateValue(this.customDateStart);
      var finish = this.normalizeDateValue(this.customDateFinish || this.customDateStart);
      if (!start || !finish) {
        this.makeToast('Укажи обе даты периода', 'warning');
        return;
      }
      if (start > finish) {
        this.makeToast('Дата начала больше даты окончания', 'warning');
        return;
      }
      this.customDateStart = start;
      this.customDateFinish = finish;
      this.periodAnchor = start;
      this.showPeriodMenu = false;
      this.loadReport();
    },

    shiftPeriod: function(delta) {
      if (!this.canShiftPeriod) {
        return;
      }
      if (reportCore && typeof reportCore.shiftPeriodState === 'function') {
        var nextState = reportCore.shiftPeriodState({
          periodMode: this.periodMode,
          periodAnchor: this.periodAnchor,
          customDateStart: this.customDateStart,
          customDateFinish: this.customDateFinish
        }, delta);
        this.periodAnchor = nextState.periodAnchor;
        this.loadReport();
        return;
      }
      var anchor = this.getPeriodAnchorDate();
      if (this.periodMode === 'month') {
        anchor = this.addMonths(anchor, delta);
      } else if (this.periodMode === 'quarter') {
        anchor = this.addMonths(anchor, delta * 3);
      } else if (this.periodMode === 'year') {
        anchor = this.addYears(anchor, delta);
      } else {
        anchor.setDate(anchor.getDate() + delta);
      }
      this.periodAnchor = this.toIsoDate(anchor);
      this.loadReport();
    },

    toPeriodBoundary: function(dateValue, isEndOfDay) {
      var normalized = this.normalizeDateValue(dateValue);
      if (!normalized) {
        return '';
      }
      return normalized + (isEndOfDay ? ' 23:59:59' : ' 00:00:00');
    },

    formatDslLiteral: function(value) {
      if (value === null || typeof value === 'undefined' || String(value).trim() === '') {
        return "''";
      }
      var str = String(value).trim();
      if (/^-?\d+(?:\.\d+)?$/.test(str)) {
        return str;
      }
      return "'" + str.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    },

    replaceDsPlaceholders: function(expression, tokenMap) {
      var output = String(expression || '');
      Object.keys(tokenMap || {}).sort(function(a, b) { return b.length - a.length; }).forEach(function(key) {
        output = output.split('&' + key).join(tokenMap[key]);
      });
      return output;
    },

    sendRequest: function(url, reqType, dataSend, doneCallback, failCallback) {
      $.ajax({
        url: url,
        type: reqType,
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: dataSend
      }).done(doneCallback).fail(failCallback);
    },

    prependAllClientsOption: function(options) {
      var list = Array.isArray(options) ? options.slice() : [];
      var normalized = list.filter(function(item) {
        return !(String(item && item.value || '') === '' && String(item && item.title || '') === 'Все клиенты');
      });
      normalized.unshift({ value: '', title: 'Все клиенты' });
      return normalized;
    },

    executeDatasourceRequest: function(config, doneCallback, failCallback) {
      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl)
          .done(function(mockPayload) {
            var rows = Array.isArray(mockPayload && mockPayload.data) ? mockPayload.data : [];
            var selectedClient = String(this.filterValues.клиент || '');
            if (selectedClient) {
              rows = rows.filter(function(item) {
                return String(item.клиент || item.partner || '') === selectedClient;
              });
            }
            doneCallback({ isOK: true, data: rows, filters: mockPayload.filters || {} });
          }.bind(this))
          .fail(failCallback);
        return;
      }

      this.sendRequest(
        '/api/v1/datasource/execute/',
        'POST',
        JSON.stringify({
          expression: String(config && config.expression ? config.expression : '').trim(),
          applyDimensionRights: true
        }),
        doneCallback,
        failCallback
      );
    },

    loadFilterOptions: function() {
      var clientFilter = this.filters[0];
      if (!clientFilter) {
        return;
      }

      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl).done(function(payload) {
          var options = Array.isArray(payload && payload.filters && payload.filters.клиент) ? payload.filters.клиент : [];
          this.filterOptions.клиент = this.prependAllClientsOption(options.map(function(opt) {
            return { value: String(opt.id), title: String(opt.title) };
          }));
          if (!this.filterValues.клиент && this.filterOptions.клиент.length > 0) {
            this.filterValues.клиент = this.filterOptions.клиент[0].value;
          }
          this.loadReport();
        }.bind(this));
        return;
      }

      this.sendRequest(
        '/api/v1/datasource/execute/',
        'POST',
        JSON.stringify({
          expression: clientFilter.optionsExpression,
          applyDimensionRights: true
        }),
        function(responseData) {
          var items = Array.isArray(responseData && responseData.data) ? responseData.data : [];
          this.filterOptions.клиент = this.prependAllClientsOption(items.map(function(item) {
            return {
              value: String(item.id || item.value || ''),
              title: String(item.title || item.label || item.name || item.id || '')
            };
          }).filter(function(item) {
            return item.value !== '';
          }));
          if (!this.filterValues.клиент && this.filterOptions.клиент.length > 0) {
            this.filterValues.клиент = this.filterOptions.клиент[0].value;
          }
          this.loadReport();
        }.bind(this),
        function() {
          this.filterOptions.клиент = [];
        }.bind(this)
      );
    },

    getDatasourceExpression: function() {
      return window.HC_REPORT_DS_TEXT || reportConfig.datasourceExpression || '';
    },

    buildDatasourceTokenMap: function() {
      var periodRange = this.getPeriodRange();
      var clientValue = String(this.filterValues.клиент || '').trim();
      return {
        dateStart: this.toPeriodBoundary(periodRange.start, false),
        dateFinish: this.toPeriodBoundary(periodRange.finish, true),
        клиент: clientValue ? this.formatDslLiteral(clientValue) : 'true'
      };
    },

    normalizeRawRow: function(item) {
      var rowMap = reportConfig.rowMap || {};
      function pick(keys) {
        var keyList = Array.isArray(keys) ? keys : [];
        for (var i = 0; i < keyList.length; ++i) {
          if (typeof item[keyList[i]] !== 'undefined' && item[keyList[i]] !== null && item[keyList[i]] !== '') {
            return item[keyList[i]];
          }
        }
        return '';
      }
      return {
        partner: String(pick(rowMap.partner) || ''),
        partner_title: String(pick(rowMap.partner_title) || pick(rowMap.partner) || 'Без клиента'),
        product: String(pick(rowMap.product) || ''),
        product_title: String(pick(rowMap.product_title) || pick(rowMap.product) || 'Без названия'),
        qty: parseFloat(pick(rowMap.qty)) || 0
      };
    },

    buildPivotMatrix: function(rows) {
      var sourceRows = Array.isArray(rows) ? rows : [];
      var rowAxisKey = this.rowAxis;
      var columnAxisKey = this.columnAxis;
      var rowOrder = [];
      var rowSeen = {};
      var columnOrder = [];
      var columnSeen = {};
      var matrix = {};
      var totals = {};

      if (columnAxisKey === 'none') {
        for (var singleIndex = 0; singleIndex < sourceRows.length; ++singleIndex) {
          var singleRow = this.normalizeRawRow(sourceRows[singleIndex] || {});
          var singleLabel = String(singleRow[rowAxisKey] || 'Без названия');

          if (!rowSeen[singleLabel]) {
            rowSeen[singleLabel] = true;
            rowOrder.push(singleLabel);
            matrix[singleLabel] = { total: 0 };
          }

          matrix[singleLabel].total += singleRow.qty;
          totals.total = (totals.total || 0) + singleRow.qty;
        }

        this.dynamicColumns = [{ key: 'total', label: 'Кол-во' }];
        this.visibleColumns = [{ key: rowAxisKey, label: this.getAxisLabel(rowAxisKey) }].concat(this.dynamicColumns);
        this.totalsRow = totals;
        this.pivotRows = rowOrder.map(function(label) {
          return {
            row_label: label,
            values: { total: matrix[label].total }
          };
        });
        return;
      }

      for (var i = 0; i < sourceRows.length; ++i) {
        var row = this.normalizeRawRow(sourceRows[i] || {});
        var rowLabel = String(row[rowAxisKey] || 'Без названия');
        var columnLabel = String(row[columnAxisKey] || 'Без названия');

        if (!rowSeen[rowLabel]) {
          rowSeen[rowLabel] = true;
          rowOrder.push(rowLabel);
          matrix[rowLabel] = {};
        }

        if (!columnSeen[columnLabel]) {
          columnSeen[columnLabel] = true;
          columnOrder.push(columnLabel);
          totals[columnLabel] = 0;
        }

        matrix[rowLabel][columnLabel] = (matrix[rowLabel][columnLabel] || 0) + row.qty;
        totals[columnLabel] += row.qty;
      }

      this.dynamicColumns = columnOrder.map(function(title) {
        return { key: title, label: title };
      });
      this.dynamicColumns.push({ key: '__row_total__', label: 'Сумма' });
      this.visibleColumns = [{ key: rowAxisKey, label: this.getAxisLabel(rowAxisKey) }].concat(this.dynamicColumns);
      totals.__row_total__ = 0;
      this.totalsRow = totals;
      this.pivotRows = rowOrder.map(function(label) {
        var rowValues = matrix[label];
        var rowTotal = 0;
        for (var columnIndex = 0; columnIndex < columnOrder.length; ++columnIndex) {
          var columnKey = columnOrder[columnIndex];
          rowTotal += parseFloat(rowValues[columnKey]) || 0;
        }
        rowValues.__row_total__ = rowTotal;
        totals.__row_total__ += rowTotal;
        return {
          row_label: label,
          values: rowValues
        };
      });
    },

    formatPivotValue: function(value) {
      var numeric = parseFloat(value);
      if (isNaN(numeric) || numeric === 0) {
        return '';
      }
      if (Math.round(numeric) === numeric) {
        return String(numeric);
      }
      return numeric.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    },

    getRowTotal: function(row) {
      var values = row && row.values ? row.values : {};
      var total = 0;
      for (var i = 0; i < this.dynamicColumns.length; ++i) {
        var key = this.dynamicColumns[i].key;
        total += parseFloat(values[key]) || 0;
      }
      return total;
    },

    getDetailDimensionConfig: function() {
      if (this.rowAxis === 'partner_title') {
        return {
          key: 'product_title',
          label: 'Номенклатура',
          subtitlePrefix: 'Клиент'
        };
      }
      return {
        key: 'partner_title',
        label: 'Клиент',
        subtitlePrefix: 'Номенклатура'
      };
    },

    buildDetailItemsForRow: function(rowLabel) {
      var detailConfig = this.getDetailDimensionConfig();
      var grouped = {};
      var order = [];

      for (var i = 0; i < this.rawRows.length; ++i) {
        var row = this.normalizeRawRow(this.rawRows[i] || {});
        var currentRowLabel = String(row[this.rowAxis] || 'Без названия');
        if (currentRowLabel !== String(rowLabel || '')) {
          continue;
        }
        var detailLabel = String(row[detailConfig.key] || 'Без названия');
        if (!grouped.hasOwnProperty(detailLabel)) {
          grouped[detailLabel] = 0;
          order.push(detailLabel);
        }
        grouped[detailLabel] += row.qty;
      }

      return order.map(function(label) {
        return {
          label: label,
          qty: grouped[label]
        };
      });
    },

    openDetailModal: function(row) {
      if (this._detailModalCloseTimer) {
        clearTimeout(this._detailModalCloseTimer);
        this._detailModalCloseTimer = null;
      }
      var rowLabel = String(row && row.row_label || '');
      var detailConfig = this.getDetailDimensionConfig();
      var items = this.buildDetailItemsForRow(rowLabel);
      var total = 0;
      for (var i = 0; i < items.length; ++i) {
        total += parseFloat(items[i].qty) || 0;
      }

      this.detailModal.visible = true;
      this.detailModal.closing = false;
      this.detailModal.title = 'Расшифровка суммы';
      this.detailModal.subtitle = detailConfig.subtitlePrefix + ': ' + rowLabel;
      this.detailModal.dimensionLabel = detailConfig.label;
      this.detailModal.items = items;
      this.detailModal.total = total;
    },

    closeDetailModal: function() {
      if (!this.detailModal.visible || this.detailModal.closing) {
        return;
      }
      this.detailModal.closing = true;
      this._detailModalCloseTimer = setTimeout(function() {
        this.detailModal.visible = false;
        this.detailModal.closing = false;
        this._detailModalCloseTimer = null;
      }.bind(this), 720);
    },

    onRowClick: function(row) {
      if (this.columnAxis !== 'none') {
        return;
      }
      this.openDetailModal(row);
    },

    updateHoverTooltipPosition: function(event) {
      if (!event) {
        return;
      }
      this.hoverTooltip.left = (event.clientX || 0) + 18;
      this.hoverTooltip.top = (event.clientY || 0) + 18;
    },

    onRowMouseEnter: function(row, rowIndex, event) {
      this.hoveredRowIndex = rowIndex;
      this.hoverTooltip.visible = true;
      this.hoverTooltip.label = String(row && row.row_label || '');
      this.hoverTooltip.total = this.getRowTotal(row);
      this.updateHoverTooltipPosition(event);
    },

    onRowMouseMove: function(event) {
      if (!this.hoverTooltip.visible) {
        return;
      }
      this.updateHoverTooltipPosition(event);
    },

    onRowMouseLeave: function() {
      this.hoveredRowIndex = -1;
      this.hoverTooltip.visible = false;
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

      function makeRecord(signature, size) {
        var buffer = new ArrayBuffer(size);
        var view = new DataView(buffer);
        view.setUint32(0, signature, true);
        return { view: view, bytes: new Uint8Array(buffer) };
      }

      function concat(chunks) {
        var total = 0;
        chunks.forEach(function(chunk) { total += chunk.length; });
        var result = new Uint8Array(total);
        var offset = 0;
        chunks.forEach(function(chunk) {
          result.set(chunk, offset);
          offset += chunk.length;
        });
        return result;
      }

      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
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
      var rowsXml = [];
      var headerRow = [this.buildXlsxCell(1, 1, this.rowAxisLabel, 'string', 1)];
      for (var i = 0; i < this.dynamicColumns.length; ++i) {
        headerRow.push(this.buildXlsxCell(i + 2, 1, this.dynamicColumns[i].label, 'string', 1));
      }
      rowsXml.push('<row r="1">' + headerRow.join('') + '</row>');

      for (var rowIndex = 0; rowIndex < this.pivotRows.length; ++rowIndex) {
        var rowNumber = rowIndex + 2;
        var row = this.pivotRows[rowIndex];
        var cells = [this.buildXlsxCell(1, rowNumber, row.row_label, 'string', 0)];
        for (var colIndex = 0; colIndex < this.dynamicColumns.length; ++colIndex) {
          var col = this.dynamicColumns[colIndex];
          cells.push(this.buildXlsxCell(colIndex + 2, rowNumber, row.values[col.key] || 0, 'number', 0));
        }
        rowsXml.push('<row r="' + rowNumber + '">' + cells.join('') + '</row>');
      }

      if (this.pivotRows.length > 0) {
        var totalIndex = this.pivotRows.length + 2;
        var totalCells = [this.buildXlsxCell(1, totalIndex, 'Итого', 'string', 2)];
        for (var totalCol = 0; totalCol < this.dynamicColumns.length; ++totalCol) {
          var totalColumn = this.dynamicColumns[totalCol];
          totalCells.push(this.buildXlsxCell(totalCol + 2, totalIndex, this.totalsRow[totalColumn.key] || 0, 'number', 2));
        }
        rowsXml.push('<row r="' + totalIndex + '">' + totalCells.join('') + '</row>');
      }

      var lastRow = Math.max(1, this.pivotRows.length + 2);
      var lastColumn = this.getExcelColumnName(this.dynamicColumns.length + 1);

      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<dimension ref="A1:' + lastColumn + lastRow + '"/>' +
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="15"/>' +
        '<sheetData>' + rowsXml.join('') + '</sheetData>' +
        '</worksheet>';
    },

    buildStylesXml: function() {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFB3B3B3"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>';
    },

    downloadXlsxWorkbook: function() {
      var workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Исполнение заявок" sheetId="1" r:id="rId1"/></sheets></workbook>';
      var workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>';
      var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';
      var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
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
        { name: 'xl/styles.xml', contentBytes: this.encodeUtf8(this.buildStylesXml()) }
      ]);

      var blob = new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ispolnenie_zayavok_' + this.formatPeriodLabel().replace(/[^\w\u0400-\u04FF.-]+/g, '_') + '.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },

    exportToExcel: function() {
      if (this.pivotRows.length === 0) {
        this.makeToast('Нет данных для выгрузки', 'warning');
        return;
      }
      this.downloadXlsxWorkbook();
    },

    makeToast: function(text, alertClass) {
      var template = "<div id='toastAlert' class='alert alert-%class% alert-dismissable' style='width:360px; position:fixed; top:20px; right:20px; z-index:9999;'><a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a><span>%text%</span></div>";
      template = template.replace('%text%', text || '');
      template = template.replace('%class%', alertClass || 'info');
      $('#toastAlert').remove();
      $('body').append(template);
      $('#toastAlert').fadeOut(5000);
    },

    onFilterChange: function() {
      this.loadReport();
    },

    loadReport: function() {
      if (!this.periodAnchor) {
        this.periodAnchor = this.normalizeDateValue(new Date());
      }
      this.isWaiting = true;
      var expression = this.getDatasourceExpression();
      if (this.periodMode === 'unlimited') {
        expression = expression.replace(/\|\s*Period\(&dateStart,\s*&dateFinish\s*\)\s*/i, '| ');
      }
      expression = this.replaceDsPlaceholders(expression, this.buildDatasourceTokenMap());

      this.executeDatasourceRequest(
        { expression: expression },
        function(responseData) {
          if (!responseData || responseData.isOK === false) {
            this.makeToast((responseData && responseData.message) || 'Ошибка при загрузке отчета', 'danger');
            this.isWaiting = false;
            return;
          }
          this.rawRows = Array.isArray(responseData.data) ? responseData.data : [];
          this.buildPivotMatrix(this.rawRows);
          this.isWaiting = false;
        }.bind(this),
        function(jqXHR, textStatus, errorThrown) {
          this.makeToast(textStatus || errorThrown || 'Ошибка запроса', 'danger');
          this.isWaiting = false;
        }.bind(this)
      );
    },

    initializeRuntime: function() {
      var queryParameters = this.getQueryParameters();
      this.dataSourceMode = this.detectDataSourceMode();
      if (reportCore && typeof reportCore.buildStandardPeriodState === 'function') {
        var periodState = reportCore.buildStandardPeriodState(queryParameters);
        this.periodMode = periodState.periodMode;
        this.periodAnchor = periodState.periodAnchor;
        this.customDateStart = periodState.customDateStart;
        this.customDateFinish = periodState.customDateFinish;
        this.showPeriodMenu = false;
        this.periodModes = periodState.periodModes || this.periodModes;
        return;
      }
      this.periodAnchor = this.normalizeDateValue(queryParameters.date || queryParameters.dateStart || new Date());
      this.customDateStart = this.periodAnchor;
      this.customDateFinish = this.normalizeDateValue(queryParameters.dateFinish || queryParameters.dateStart || this.periodAnchor);
    }
  },

  beforeDestroy: function() {
    document.removeEventListener('click', this.handleDocumentClick);
  },

  mounted: function() {
    document.addEventListener('click', this.handleDocumentClick);
    this.initializeRuntime();
    this.loadFilterOptions();
  }
});
