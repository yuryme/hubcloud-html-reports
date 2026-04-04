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

  function getFirstDefinedValue(source, aliases) {
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
  }

  function normalizeSingleParameter(value) {
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
  }

  function normalizeParameterObject(value, multiple) {
    if (Array.isArray(value)) {
      var list = [];
      var titles = [];

      for (var i = 0; i < value.length; ++i) {
        var item = normalizeSingleParameter(value[i]);
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

    var normalized = normalizeSingleParameter(value);
    return {
      value: multiple ? (normalized.value ? [normalized.value] : []) : normalized.value,
      title: multiple ? (normalized.title ? [normalized.title] : []) : normalized.title
    };
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

  function createDateFromIso(value) {
    var normalizedDate = normalizeDateValue(value);
    return normalizedDate ? new Date(normalizedDate + 'T00:00:00') : null;
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
    var end;

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
      end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    } else if (state.periodMode === 'quarter') {
      start = getQuarterStart(anchor);
      end = getQuarterEnd(anchor);
    } else if (state.periodMode === 'year') {
      start = new Date(anchor.getFullYear(), 0, 1);
      end = new Date(anchor.getFullYear(), 11, 31);
    } else {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    }

    return {
      start: toIsoDate(start),
      finish: toIsoDate(end)
    };
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

  function formatDateLabel(value) {
    var normalizedDate = normalizeDateValue(value);
    if (!normalizedDate) {
      return '';
    }
    var parts = normalizedDate.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function normalizeOptionList(items) {
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

  function findUnresolvedDsPlaceholders(expression) {
    var source = String(expression || '');
    var matches = source.match(/&[A-Za-zА-Яа-я_][A-Za-zА-Яа-я0-9_\.\(\)-]*/g) || [];
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

  function rowMatchesMockFilter(row, filter, filterValues) {
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
  }

  function applyMockFilters(rows, filters, filterValues) {
    var sourceRows = Array.isArray(rows) ? rows : [];
    var filteredRows = [];

    for (var i = 0; i < sourceRows.length; ++i) {
      var row = sourceRows[i] || {};
      var isMatch = true;

      for (var j = 0; j < filters.length; ++j) {
        if (!rowMatchesMockFilter(row, filters[j], filterValues)) {
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

  global.HC_REPORT_CORE = {
    version: 'seed-2026-04-03.2',
    getQueryParameters: getQueryParameters,
    getFirstDefinedValue: getFirstDefinedValue,
    normalizeSingleParameter: normalizeSingleParameter,
    normalizeParameterObject: normalizeParameterObject,
    normalizeDateValue: normalizeDateValue,
    formatDateLabel: formatDateLabel,
    toPeriodBoundary: toPeriodBoundary,
    getStandardPeriodModes: getStandardPeriodModes,
    buildStandardPeriodState: buildStandardPeriodState,
    getPeriodRange: getPeriodRange,
    formatPeriodLabel: formatPeriodLabel,
    canShiftPeriod: canShiftPeriod,
    shiftPeriodState: shiftPeriodState,
    normalizeOptionList: normalizeOptionList,
    formatDslLiteral: formatDslLiteral,
    sanitizeDslNumericLiterals: sanitizeDslNumericLiterals,
    findUnresolvedDsPlaceholders: findUnresolvedDsPlaceholders,
    replaceDsPlaceholders: replaceDsPlaceholders,
    getResponseDataItems: getResponseDataItems,
    normalizeReportRows: normalizeReportRows,
    rowMatchesMockFilter: rowMatchesMockFilter,
    applyMockFilters: applyMockFilters
  };
})(window);
