(function() {
  'use strict';

  var schemaUrl = './schema/report.schema.example.json';
  var blankSchemaUrl = './schema/report.schema.blank.json';
  var currentSchema = null;
  var artifacts = {};
  var copiedArtifacts = {};
  var currentArtifactName = 'index.html';
  var currentTableId = '';
  var currentDatasourceId = 'main';
  var runtimeTestValues = {};

  var form = document.getElementById('schemaForm');
  var jsonPreview = document.getElementById('jsonPreview');
  var artifactPreview = document.getElementById('artifactPreview');
  var artifactCopyStatus = document.getElementById('artifactCopyStatus');
  var livePreviewFrame = document.getElementById('livePreviewFrame');
  var generatedPreviewFrame = document.getElementById('generatedPreviewFrame');
  var reloadButton = document.getElementById('reloadSchemaBtn');
  var newSchemaButton = document.getElementById('newSchemaBtn');
  var uploadSchemaButton = document.getElementById('uploadSchemaBtn');
  var schemaFileInput = document.getElementById('schemaFileInput');
  var downloadSchemaButton = document.getElementById('downloadSchemaBtn');
  var copyArtifactButton = document.getElementById('copyArtifactBtn');
  var downloadArtifactButton = document.getElementById('downloadArtifactBtn');
  var openPreviewButton = document.getElementById('openPreviewBtn');
  var openGeneratedPreviewButton = document.getElementById('openGeneratedPreviewBtn');
  var collapseAllSectionsButton = document.getElementById('collapseAllSectionsBtn');
  var expandAllSectionsButton = document.getElementById('expandAllSectionsBtn');
  var previewRuntimeRequestButton = document.getElementById('previewRuntimeRequestBtn');
  var importApiResponseButton = document.getElementById('importApiResponseBtn');
  var addResultFieldButton = document.getElementById('addResultFieldBtn');
  var addDatasourceButton = document.getElementById('addDatasourceBtn');
  var removeDatasourceButton = document.getElementById('removeDatasourceBtn');
  var addDatasourceParameterButton = document.getElementById('addDatasourceParameterBtn');
  var addDatasourceBranchButton = document.getElementById('addDatasourceBranchBtn');
  var addFilterButton = document.getElementById('addFilterBtn');
  var addTabButton = document.getElementById('addTabBtn');
  var addTableButton = document.getElementById('addTableBtn');
  var addColumnButton = document.getElementById('addColumnBtn');
  var addSummaryCardButton = document.getElementById('addSummaryCardBtn');
  var filtersEditor = document.getElementById('filtersEditor');
  var tabsEditor = document.getElementById('tabsEditor');
  var tablesEditor = document.getElementById('tablesEditor');
  var columnsEditor = document.getElementById('columnsEditor');
  var summaryCardsEditor = document.getElementById('summaryCardsEditor');
  var resultSchemaEditor = document.getElementById('resultSchemaEditor');
  var datasourceParametersEditor = document.getElementById('datasourceParametersEditor');
  var runtimeTestParameters = document.getElementById('runtimeTestParameters');
  var artifactTabs = document.getElementById('artifactTabs');
  var runtimeRequestStatus = document.getElementById('runtimeRequestStatus');
  var datasourceBranchesEditor = document.getElementById('datasourceBranchesEditor');
  var dataPlanView = document.getElementById('dataPlanView');

  var fields = {
    reportId: document.getElementById('reportId'),
    reportTitle: document.getElementById('reportTitle'),
    template: document.getElementById('template'),
    description: document.getElementById('description'),
    layoutType: document.getElementById('layoutType'),
    collapseToSingleColumnAt: document.getElementById('collapseToSingleColumnAt'),
    defaultPeriodMode: document.getElementById('defaultPeriodMode'),
    periodEnabled: document.getElementById('periodEnabled'),
    allowCustom: document.getElementById('allowCustom'),
    allowUnlimited: document.getElementById('allowUnlimited'),
    tabCount: document.getElementById('tabCount'),
    filterCount: document.getElementById('filterCount'),
    tableCount: document.getElementById('tableCount'),
    parameterCount: document.getElementById('parameterCount'),
    resultFieldCount: document.getElementById('resultFieldCount'),
    datasourceSelector: document.getElementById('datasourceSelector'),
    mainDatasourceId: document.getElementById('mainDatasourceId'),
    mainDatasourceTitle: document.getElementById('mainDatasourceTitle'),
    mainDatasourcePath: document.getElementById('mainDatasourcePath'),
    mainDatasourceQuery: document.getElementById('mainDatasourceQuery'),
    mainRuntimeEndpoint: document.getElementById('mainRuntimeEndpoint'),
    mainRuntimeMethod: document.getElementById('mainRuntimeMethod'),
    mainRuntimeDataPath: document.getElementById('mainRuntimeDataPath'),
    mainRuntimeBodyTemplate: document.getElementById('mainRuntimeBodyTemplate'),
    testHcBaseUrl: document.getElementById('testHcBaseUrl'),
    testHcToken: document.getElementById('testHcToken'),
    testApiResponseJson: document.getElementById('testApiResponseJson')
  };

  var summaryNodes = {
    reportId: document.getElementById('summaryReportId'),
    template: document.getElementById('summaryTemplate'),
    layout: document.getElementById('summaryLayout'),
    datasourcePath: document.getElementById('summaryDatasourcePath'),
    parameterCount: document.getElementById('summaryParameterCount')
  };

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toNumber(value, fallback) {
    var numeric = parseInt(value, 10);
    return isNaN(numeric) ? fallback : numeric;
  }

  function slugify(value, fallback) {
    var source = String(value || '').trim().toLowerCase();
    var slug = source
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug || fallback;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function safeGetMainDatasource(schema) {
    if (!schema || !schema.datasources || !schema.datasources.main) {
      return null;
    }
    return schema.datasources.main;
  }

  function getDatasourceIds(schema) {
    return Object.keys((schema || {}).datasources || {});
  }

  function getActiveDatasource(schema) {
    var datasources = (schema || {}).datasources || {};
    var ids = getDatasourceIds(schema);

    if (!datasources[currentDatasourceId]) {
      currentDatasourceId = ids[0] || 'main';
    }

    return datasources[currentDatasourceId] || {};
  }

  function getDatasourceById(schema, id) {
    var datasources = (schema || {}).datasources || {};
    return datasources[id] || getActiveDatasource(schema);
  }

  function normalizeDatasource(datasource, id) {
    datasource.id = datasource.id || id || 'main';
    datasource.title = datasource.title || datasource.id;
    datasource.kind = datasource.kind || 'dsl-query';
    datasource.querySource = datasource.querySource || {};
    datasource.querySource.mode = datasource.querySource.mode || 'file-sync';
    datasource.querySource.path = datasource.querySource.path || 'DS.' + datasource.id + '.txt';
    datasource.runtime = datasource.runtime || {};
    datasource.runtime.endpoint = datasource.runtime.endpoint || '/api/v1/WorkflowTrigger/start';
    datasource.runtime.method = datasource.runtime.method || 'POST';
    datasource.runtime.dataPath = datasource.runtime.dataPath || 'data.data';
    datasource.runtime.bodyTemplate = datasource.runtime.bodyTemplate || '';
    datasource.parameters = getArray(datasource.parameters);
    datasource.branches = getArray(datasource.branches);
    datasource.resultSchema = getArray(datasource.resultSchema);
    return datasource;
  }

  function joinUrl(baseUrl, endpoint) {
    var base = String(baseUrl || '').trim().replace(/\/+$/, '');
    var path = String(endpoint || '').trim();

    if (!base) {
      return path || '';
    }

    if (!path) {
      return base;
    }

    return base + '/' + path.replace(/^\/+/, '');
  }

  function getArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getFirstTable(schema) {
    return getArray(schema.tables)[0] || {};
  }

  function getActiveTable(schema) {
    var tables = getArray(schema.tables);
    var table = tables.find(function(item) {
      return item.id === currentTableId;
    });

    return table || tables[0] || {};
  }

  function ensureActiveTable(schema) {
    var table = getActiveTable(schema);
    currentTableId = table.id || '';
    return table;
  }

  function renderDatasourceOptions(schema) {
    var ids = getDatasourceIds(schema);
    fields.datasourceSelector.innerHTML = ids.map(function(id) {
      var datasource = schema.datasources[id] || {};
      var selected = id === currentDatasourceId ? ' selected' : '';
      var title = datasource.title ? id + ' · ' + datasource.title : id;
      return '<option value="' + escapeHtml(id) + '"' + selected + '>' + escapeHtml(title) + '</option>';
    }).join('');
    removeDatasourceButton.disabled = ids.length <= 1;
  }

  function fillForm(schema) {
    var mainDatasource = getActiveDatasource(schema);
    var querySource = mainDatasource.querySource || {};
    var runtime = mainDatasource.runtime || {};
    var layout = schema.layout || {};
    var settingsPanel = layout.settingsPanel || {};
    var period = schema.period || {};
    var parameters = getArray(mainDatasource.parameters);
    var resultSchema = getArray(mainDatasource.resultSchema);

    fields.reportId.value = schema.reportId || '';
    fields.reportTitle.value = schema.reportTitle || '';
    fields.template.value = schema.template || '';
    fields.description.value = schema.description || '';
    fields.layoutType.value = layout.type || 'two-column';
    fields.collapseToSingleColumnAt.value = settingsPanel.collapseToSingleColumnAt || 1366;
    fields.defaultPeriodMode.value = period.defaultMode || 'day';
    if (fields.periodEnabled) {
      fields.periodEnabled.checked = period.enabled !== false;
    }
    fields.allowCustom.checked = !!period.allowCustom;
    fields.allowUnlimited.checked = !!period.allowUnlimited;
    fields.tabCount.value = getArray(schema.tabs).length;
    fields.filterCount.value = getArray(schema.filters).length;
    fields.tableCount.value = getArray(schema.tables).length;
    fields.parameterCount.value = parameters.length;
    fields.resultFieldCount.value = resultSchema.length;
    renderDatasourceOptions(schema);
    fields.mainDatasourceId.value = mainDatasource.id || '';
    fields.mainDatasourceTitle.value = mainDatasource.title || '';
    fields.mainDatasourcePath.value = querySource.path || '';
    fields.mainDatasourceQuery.value = querySource.text || '';
    fields.mainRuntimeEndpoint.value = runtime.endpoint || '';
    fields.mainRuntimeMethod.value = runtime.method || 'POST';
    fields.mainRuntimeDataPath.value = runtime.dataPath || 'data';
    fields.mainRuntimeBodyTemplate.value = '';
    ensureActiveTable(schema);
    renderDatasourceParametersEditor(schema);
    renderRuntimeTestParameters(schema);
    updateRuntimeBodyPreview();
    renderResultSchemaEditor(schema);
    renderDatasourceBranchesEditor(schema);
    renderFiltersEditor(schema);
    renderTabsEditor(schema);
    renderTablesEditor(schema);
    renderDataPlan(schema);
    renderColumnsEditor(schema);
    renderSummaryCardsEditor(schema);
  }

  function updateSummary(schema) {
    var mainDatasource = getActiveDatasource(schema);
    var querySource = mainDatasource.querySource || {};
    var layout = schema.layout || {};
    var parameters = getArray(mainDatasource.parameters);

    summaryNodes.reportId.textContent = schema.reportId || '-';
    summaryNodes.template.textContent = schema.template || '-';
    summaryNodes.layout.textContent = layout.type || '-';
    summaryNodes.datasourcePath.textContent = querySource.path || '-';
    summaryNodes.parameterCount.textContent = String(parameters.length);
  }

  function updateSchemaPreview(schema) {
    if (jsonPreview) {
      jsonPreview.textContent = JSON.stringify(schema, null, 2);
    }
  }

  function getMockRows(schema, datasourceId) {
    var mock = (schema || {}).mock || {};
    var id = datasourceId || currentDatasourceId;

    if (id && mock.datasources && mock.datasources[id]) {
      return getArray(mock.datasources[id].rows);
    }

    return getArray(mock.rows);
  }

  function getTableRows(schema, table) {
    return applyTableTransform(getMockRows(schema, (table || {}).source || currentDatasourceId), (table || {}).transform);
  }

  function applyTableTransform(rows, transform) {
    var sourceRows = getArray(rows);
    var config = transform || {};
    var groupBy = getArray(config.groupBy).filter(Boolean);
    var aggregations = getArray(config.aggregations);

    if (config.kind !== 'group-by' || !groupBy.length || !aggregations.length) {
      return sourceRows;
    }

    var groups = {};
    var order = [];

    sourceRows.forEach(function(row) {
      var key = groupBy.map(function(field) {
        return row[field] == null ? '' : String(row[field]);
      }).join('\u001f');

      if (!groups[key]) {
        groups[key] = {};
        groupBy.forEach(function(field) {
          groups[key][field] = row[field];
        });
        aggregations.forEach(function(aggregation) {
          groups[key][aggregation.as || aggregation.field] = 0;
        });
        order.push(key);
      }

      aggregations.forEach(function(aggregation) {
        if ((aggregation.op || 'sum') !== 'sum') {
          return;
        }
        var value = Number(row[aggregation.field]);
        groups[key][aggregation.as || aggregation.field] += isNaN(value) ? 0 : value;
      });
    });

    return order.map(function(key) {
      return groups[key];
    });
  }

  function readPathValue(source, path) {
    var parts = String(path || '').trim().split('.').filter(Boolean);
    var current = source;

    for (var i = 0; i < parts.length; ++i) {
      if (current == null) {
        return undefined;
      }
      current = current[parts[i]];
    }

    return parts.length ? current : source;
  }

  function looksLikeIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
  }

  function looksLikeIsoDateTime(value) {
    return /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(String(value || '').trim());
  }

  function inferResultFieldType(value) {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (looksLikeIsoDateTime(value)) {
      return 'datetime';
    }
    if (looksLikeIsoDate(value)) {
      return 'date';
    }
    return 'string';
  }

  function titleFromFieldName(fieldName) {
    return String(fieldName || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || fieldName;
  }

  function inferResultSchemaFromRows(rows) {
    var seen = {};
    var result = [];

    getArray(rows).forEach(function(row) {
      Object.keys(row || {}).forEach(function(key) {
        if (seen[key]) {
          return;
        }

        seen[key] = true;
        result.push({
          field: key,
          title: titleFromFieldName(key),
          type: inferResultFieldType(row[key])
        });
      });
    });

    return result;
  }

  function buildLookupsFromRows(rows) {
    var lookups = {};

    getArray(rows).forEach(function(row) {
      Object.keys(row || {}).forEach(function(key) {
        if (!/_title$/.test(key)) {
          return;
        }

        var valueField = key.replace(/_title$/, '');
        var value = row[valueField];
        var title = row[key];

        if (value == null || value === '' || title == null || title === '') {
          return;
        }

        if (!lookups[valueField]) {
          lookups[valueField] = {
            titleField: key,
            items: {}
          };
        }

        lookups[valueField].items[String(value)] = String(title);
      });
    });

    return lookups;
  }

  function getOrderImportDiagnostics(schema) {
    var rows = getMockRows(schema, currentDatasourceId);
    var orderLookup = ((schema.lookups || {})['номер_заказа'] || {}).items || {};
    var activeTable = getActiveTable(schema);
    var nonZeroRows = rows.filter(function(row) {
      var value = row ? row['номер_заказа'] : null;
      return value != null && value !== '' && String(value) !== '0';
    });
    var titledRows = rows.filter(function(row) {
      var value = row ? row['номер_заказа'] : null;
      var title = row ? row['номер_заказа_title'] : null;
      return value != null && value !== '' && title != null && title !== '';
    });

    return {
      nonZeroOrderRows: nonZeroRows.length,
      titledOrderRows: titledRows.length,
      lookupItems: Object.keys(orderLookup).length,
      activeTableId: activeTable.id || ''
    };
  }

  function getLookupDisplayValue(schema, row, column) {
    var lookup = column.lookup || {};
    var lookupField = lookup.field || column.key;
    var value = row[lookupField];
    var schemaLookup = ((schema.lookups || {})[lookupField] || {});
    var items = schemaLookup.items || {};
    var titleField = lookup.titleField || schemaLookup.titleField || (lookupField + '_title');
    var mappedTitle = items[String(value)];

    if (mappedTitle != null && mappedTitle !== '') {
      return mappedTitle;
    }

    if (row[titleField] != null && row[titleField] !== '') {
      return row[titleField];
    }

    return value;
  }

  function formatCellValue(value, column) {
    if (value == null || value === '') {
      return '';
    }

    if ((column.type || '') === 'integer' && typeof value === 'number') {
      return value.toLocaleString('ru-RU', {
        maximumFractionDigits: 0
      });
    }

    if ((column.type || '') === 'number' && typeof value === 'number') {
      return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    return String(value);
  }

  function formatTableCellValue(schema, row, column) {
    var value = column.lookup
      ? getLookupDisplayValue(schema, row, column)
      : row[column.key];

    return formatCellValue(value, column);
  }

  function buildActionButtons(schema) {
    return getArray(schema.actions).map(function(action) {
      return '          <button type="button" class="action-btn action-btn--' +
        escapeHtml(action.style || 'secondary') + '" data-report-action="' + escapeHtml(action.key || '') + '">' + escapeHtml(action.label || action.key || 'Action') + '</button>';
    }).join('\n');
  }

  function getPeriodModes(period) {
    var modes = [
      { key: 'day', label: 'День' },
      { key: 'month', label: 'Месяц' },
      { key: 'quarter', label: 'Квартал' },
      { key: 'year', label: 'Год' }
    ];

    if (period.allowCustom) {
      modes.push({ key: 'custom', label: 'Произвольный' });
    }
    if (period.allowUnlimited) {
      modes.push({ key: 'unlimited', label: 'Без ограничения' });
    }

    return modes;
  }

  function buildPeriodToolbar(schema) {
    var period = schema.period || {};
    var defaultMode = period.defaultMode || 'day';
    var anchorDate = fields.testDateStart && fields.testDateStart.value
      ? fields.testDateStart.value
      : new Date().toISOString().slice(0, 10);

    if (period.enabled === false) {
      return '';
    }

    return [
      '      <div class="period-toolbar" data-period-toolbar data-period-mode="' + escapeHtml(defaultMode) + '" data-period-anchor="' + escapeHtml(anchorDate) + '">',
      '        <button type="button" class="period-arrow" data-period-shift="-1" aria-label="Предыдущий период">&lsaquo;</button>',
      '        <button type="button" class="period-inline-body" data-period-toggle>',
      '          <span class="period-inline-label">Период</span>',
      '          <strong data-period-label>Период</strong>',
      '        </button>',
      '        <button type="button" class="period-arrow" data-period-shift="1" aria-label="Следующий период">&rsaquo;</button>',
      '        <div class="period-menu" data-period-menu hidden>',
      '          <div class="period-mode-list">',
      getPeriodModes(period).map(function(mode) {
        return '            <button type="button" class="period-mode-btn' + (mode.key === defaultMode ? ' is-active' : '') + '" data-period-mode="' + escapeHtml(mode.key) + '">' + escapeHtml(mode.label) + '</button>';
      }).join('\n'),
      '          </div>',
      '          <div class="period-custom-grid" data-period-custom hidden>',
      '            <label class="settings-field"><span>Дата начала</span><input data-period-custom-start type="date"></label>',
      '            <label class="settings-field"><span>Дата окончания</span><input data-period-custom-finish type="date"></label>',
      '            <button type="button" class="action-btn action-btn--primary" data-period-apply>Применить</button>',
      '          </div>',
      '        </div>',
      '      </div>'
    ].join('\n');
  }

  function buildTabs(schema) {
    return getArray(schema.tabs).map(function(tab, index) {
      var classes = index === 0 ? 'report-tab is-active' : 'report-tab';
      return '            <button type="button" class="' + classes + '" data-preview-tab="' + escapeHtml(tab.key || '') + '" data-table-ref="' + escapeHtml(tab.tableRef || '') + '">' + escapeHtml(tab.title || tab.key || 'Tab') + '</button>';
    }).join('\n');
  }

  function getFilterValue(row, filter) {
    var source = filter.source || {};
    var field = source.valueField || filter.key;
    return row[field];
  }

  function getFilterTitleValue(row, filter) {
    var source = filter.source || {};
    var field = source.titleField || source.valueField || filter.key;
    return row[field];
  }

  function getFilterOptions(schema, filter) {
    var seen = {};
    var source = filter.source || {};
    var datasourceId = source.fromDatasource || currentDatasourceId;

    return getMockRows(schema, datasourceId).reduce(function(options, row) {
      var rawValue = getFilterValue(row, filter);
      var value = rawValue == null ? '' : String(rawValue);
      var rawTitle = getFilterTitleValue(row, filter);
      var title = rawTitle == null || rawTitle === '' ? value : String(rawTitle);

      if (!value || seen[value]) {
        return options;
      }

      seen[value] = true;
      options.push({
        value: value,
        title: title
      });
      return options;
    }, []);
  }

  function getFilterControlAttributes(filter) {
    var attributes = '';

    if (filter.type === 'multi-select' || filter.multiple) {
      attributes += ' multiple size="4"';
    }

    attributes += filter && filter.bind && filter.bind.placeholder
      ? ' data-client-filter="false"'
      : ' data-client-filter="true"';

    return attributes;
  }

  function getDefaultFilterValue(filter) {
    if ((filter.key || '') === 'orderId' && fields.testOrderId && fields.testOrderId.value.trim()) {
      return fields.testOrderId.value.trim();
    }

    return '';
  }

  function buildFilters(schema) {
    return getArray(schema.filters).map(function(filter) {
      var defaultValue = getDefaultFilterValue(filter);
      var options = getFilterOptions(schema, filter).map(function(option) {
        var selected = defaultValue && option.value === defaultValue ? ' selected' : '';
        return '              <option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.title) + '</option>';
      }).join('\n');

      return [
        '          <label class="settings-field">',
        '            <span>' + escapeHtml(filter.title || filter.key || 'Filter') + '</span>',
        '            <select data-preview-filter="' + escapeHtml(filter.key || '') + '" data-default-value="' + escapeHtml(defaultValue) + '"' + getFilterControlAttributes(filter) + '>',
        '              <option value="">Все</option>',
        options,
        '            </select>',
        '          </label>'
      ].join('\n');
    }).join('\n');
  }

  function calculateSummaryValue(schema, card) {
    var valueConfig = card.value || {};
    var sourceTable = getArray(schema.tables).find(function(table) {
      return table.id === valueConfig.sourceTable;
    });
    var datasourceId = valueConfig.source || (sourceTable ? sourceTable.source : currentDatasourceId);
    var rows = getMockRows(schema, datasourceId);

    if (valueConfig.kind === 'row-count') {
      return String(rows.length);
    }

    if (valueConfig.kind === 'sum') {
      var total = rows.reduce(function(sum, row) {
        var value = Number(row[valueConfig.field]);
        return isNaN(value) ? sum : sum + value;
      }, 0);

      return total.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    return '--';
  }

  function buildSummaryCards(schema) {
    return getArray(schema.summaryCards).map(function(card, index) {
      var value = calculateSummaryValue(schema, card);

      return [
        '          <article class="stat-card" data-summary-kind="' + escapeHtml((card.value || {}).kind || '') + '" data-summary-field="' + escapeHtml((card.value || {}).field || '') + '">',
        '            <p class="stat-card__title">' + escapeHtml(card.title || card.key || 'Показатель') + '</p>',
        '            <strong class="stat-card__value" data-summary-value>' + escapeHtml(value) + '</strong>',
        '            <p class="stat-card__subtitle">' + escapeHtml(card.subtitle || 'Настроить расчёт в script.js') + '</p>',
        '          </article>'
      ].join('\n');
    }).join('\n');
  }

  function buildTableHeaders(table) {
    return getArray(table.columns).map(function(column) {
      var title = escapeHtml(column.title || column.key || 'Колонка');

      if (column.sortable) {
        return '                <th data-sort-key="' + escapeHtml(column.key || '') + '" data-sort-type="' + escapeHtml(column.type || 'text') + '"><button type="button" class="sortable-header">' + title + '<span data-sort-indicator></span></button></th>';
      }

      return '                <th>' + title + '</th>';
    }).join('\n');
  }

  function buildTableCells(schema, table, row) {
    return getArray(table.columns).map(function(column) {
      return '                <td>' + escapeHtml(formatTableCellValue(schema, row, column)) + '</td>';
    }).join('\n');
  }

  function buildRowFilterPayload(schema, row) {
    return getArray(schema.filters).reduce(function(payload, filter) {
      var value = getFilterValue(row, filter);
      payload[filter.key] = value == null ? '' : String(value);
      return payload;
    }, {});
  }

  function buildTableRows(schema, table, options) {
    if (!(options && options.includeMockRows)) {
      return '            <tr><td colspan="' + Math.max(getArray(table.columns).length, 1) + '">Загрузка данных...</td></tr>';
    }

    var rows = getTableRows(schema, table);

    if (!rows.length) {
      return '            <tr><td colspan="' + Math.max(getArray(table.columns).length, 1) + '">Нет mock-строк для datasource ' + escapeHtml(table.source || currentDatasourceId || '-') + '</td></tr>';
    }

    return rows.map(function(row) {
      var rowJson = escapeHtml(JSON.stringify(row));
      var filterJson = escapeHtml(JSON.stringify(buildRowFilterPayload(schema, row)));

      return [
        '            <tr data-report-row data-row-json="' + rowJson + '" data-filter-values="' + filterJson + '">',
        buildTableCells(schema, table, row),
        '            </tr>'
      ].join('\n');
    }).join('\n');
  }

  function buildTablePanels(schema, options) {
    var firstTab = getArray(schema.tabs)[0] || {};
    var activeTableRef = firstTab.tableRef || (getFirstTable(schema).id || '');

    return getArray(schema.tables).map(function(table) {
      var tableRef = table.id || '';
      var isActive = tableRef === activeTableRef;
      var headers = buildTableHeaders(table);
      var rows = buildTableRows(schema, table, options || {});

      return [
        '      <div class="report-table-panel' + (isActive ? ' is-active' : '') + '" data-table-panel="' + escapeHtml(tableRef) + '"' + (isActive ? '' : ' hidden') + '>',
        '        <div class="report-table-scroll">',
        '          <table class="report-table">',
        '            <thead>',
        '              <tr>',
        headers || '                <th>Колонка</th>',
        '              </tr>',
        '            </thead>',
        '            <tbody>',
        rows || '              <tr><td>Нет строк</td></tr>',
        '            </tbody>',
        '          </table>',
        '        </div>',
        '      </div>'
      ].join('\n');
    }).join('\n');
  }

  function buildIndexArtifact(schema, options) {
    var title = schema.reportTitle || 'Новый отчёт';
    var filters = buildFilters(schema);
    var actions = buildActionButtons(schema);
    var periodToolbar = buildPeriodToolbar(schema);
    var tabs = buildTabs(schema);
    var cards = buildSummaryCards(schema);
    var tablePanels = buildTablePanels(schema, options || {});

    return [
      '<div class="report-shell">',
      '  <section class="report-main">',
      '    <header class="report-hero">',
      '      <h1>' + escapeHtml(title) + '</h1>',
      '      <p class="report-hero__subtitle">' + escapeHtml(schema.description || 'Описание будет выведено из report.schema.json') + '</p>',
      '    </header>',
      '',
      '    <section class="report-toolbar">',
      actions || '          <button type="button" class="action-btn action-btn--primary">Обновить</button>',
      periodToolbar,
      '    </section>',
      '',
      '    <section class="report-stats">',
      cards || [
        '          <article class="stat-card">',
        '            <p class="stat-card__title">Показатель</p>',
        '            <strong class="stat-card__value">--</strong>',
        '            <p class="stat-card__subtitle">Добавьте summaryCards в schema</p>',
        '          </article>'
      ].join('\n'),
      '    </section>',
      '',
      '    <section class="report-table-card">',
      '      <div class="report-table-card__head">',
      '        <h2 data-active-table-title>Данные отчёта</h2>',
      '        <div class="report-tabs">',
      tabs || '            <button type="button" class="report-tab is-active">Основная вкладка</button>',
      '        </div>',
      '      </div>',
      tablePanels || '      <p>Таблиц пока нет</p>',
      '    </section>',
      '  </section>',
      '',
      '  <aside class="report-settings">',
      '    <div class="report-settings__card">',
      '      <h2>Настройки</h2>',
      filters || [
        '          <label class="settings-field">',
        '            <span>Фильтр</span>',
        '            <input type="text" placeholder="value">',
        '          </label>'
      ].join('\n'),
      '    </div>',
      '  </aside>',
      '</div>'
    ].join('\n');
  }

  function buildCssArtifact(schema) {
    var breakpoint = ((schema.layout || {}).settingsPanel || {}).collapseToSingleColumnAt || 1366;

    return [
      ':root {',
      '  --report-bg: #f4f7fb;',
      '  --report-panel: rgba(255, 255, 255, 0.96);',
      '  --report-line: rgba(25, 73, 132, 0.12);',
      '  --report-text: #163c66;',
      '  --report-muted: #6f8095;',
      '  --report-accent: #2f6faa;',
      '  --report-shadow: 0 18px 38px rgba(22, 44, 74, 0.08);',
      '  --report-radius-xl: 24px;',
      '  --report-radius-lg: 18px;',
      '}',
      '',
      'body {',
      '  margin: 0;',
      '  font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;',
      '}',
      '',
      '.report-shell,',
      '.report-shell * {',
      '  box-sizing: border-box;',
      '}',
      '',
      '.report-shell {',
      '  display: grid;',
      '  grid-template-columns: minmax(0, 1fr) 320px;',
      '  gap: 18px;',
      '  padding: 20px;',
      '  color: var(--report-text);',
      '  background:',
      '    radial-gradient(circle at top left, rgba(47, 111, 170, 0.11), transparent 24%),',
      '    linear-gradient(180deg, #f8fbff 0%, var(--report-bg) 100%);',
      '}',
      '',
      '.report-main,',
      '.report-settings__card,',
      '.report-hero,',
      '.report-toolbar,',
      '.report-table-card,',
      '.stat-card {',
      '  background: var(--report-panel);',
      '  border: 1px solid var(--report-line);',
      '  border-radius: var(--report-radius-xl);',
      '  box-shadow: var(--report-shadow);',
      '}',
      '',
      '.report-main {',
      '  display: grid;',
      '  gap: 18px;',
      '  background: transparent;',
      '  border: 0;',
      '  box-shadow: none;',
      '  padding: 0;',
      '}',
      '',
      '.report-hero,',
      '.report-toolbar,',
      '.report-table-card,',
      '.report-settings__card {',
      '  padding: 24px;',
      '}',
      '',
      '.report-hero h1,',
      '.report-table-card h2,',
      '.report-settings__card h2 {',
      '  margin: 0;',
      '}',
      '',
      '.report-hero__subtitle,',
      '.stat-card__subtitle {',
      '  color: var(--report-muted);',
      '}',
      '',
      '.report-toolbar {',
      '  display: flex;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '  align-items: stretch;',
      '}',
      '',
      '.period-toolbar {',
      '  position: relative;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  min-width: 320px;',
      '}',
      '',
      '.period-arrow,',
      '.period-inline-body {',
      '  border: 0;',
      '  border-radius: 16px;',
      '  background: #edf3f9;',
      '  color: var(--report-accent);',
      '  font-weight: 800;',
      '  cursor: pointer;',
      '}',
      '',
      '.period-arrow {',
      '  width: 48px;',
      '  min-height: 48px;',
      '  font-size: 1.4rem;',
      '}',
      '',
      '.period-arrow:disabled {',
      '  opacity: 0.45;',
      '  cursor: not-allowed;',
      '}',
      '',
      '.period-inline-body {',
      '  display: grid;',
      '  gap: 4px;',
      '  min-width: 190px;',
      '  min-height: 56px;',
      '  padding: 10px 18px;',
      '  text-align: left;',
      '}',
      '',
      '.period-inline-label {',
      '  color: var(--report-muted);',
      '  font-size: 0.76rem;',
      '  letter-spacing: 0.08em;',
      '  text-transform: uppercase;',
      '}',
      '',
      '.period-menu {',
      '  position: absolute;',
      '  z-index: 10;',
      '  left: 56px;',
      '  top: calc(100% + 8px);',
      '  width: min(360px, calc(100vw - 48px));',
      '  padding: 14px;',
      '  border: 1px solid var(--report-line);',
      '  border-radius: 20px;',
      '  background: #ffffff;',
      '  box-shadow: var(--report-shadow);',
      '}',
      '',
      '.period-mode-list {',
      '  display: grid;',
      '  grid-template-columns: repeat(2, minmax(0, 1fr));',
      '  gap: 8px;',
      '}',
      '',
      '.period-mode-btn {',
      '  min-height: 40px;',
      '  border: 1px solid var(--report-line);',
      '  border-radius: 12px;',
      '  background: #f7f9fc;',
      '  color: var(--report-accent);',
      '  font-weight: 800;',
      '  cursor: pointer;',
      '}',
      '',
      '.period-mode-btn.is-active {',
      '  background: var(--report-accent);',
      '  color: #ffffff;',
      '}',
      '',
      '.period-custom-grid {',
      '  display: grid;',
      '  gap: 10px;',
      '  margin-top: 12px;',
      '}',
      '',
      '.action-btn {',
      '  min-height: 44px;',
      '  padding: 0 18px;',
      '  border: 0;',
      '  border-radius: 14px;',
      '  font: inherit;',
      '  font-weight: 700;',
      '}',
      '',
      '.action-btn--primary {',
      '  background: var(--report-accent);',
      '  color: #fff;',
      '}',
      '',
      '.action-btn--success {',
      '  background: #2b8a4d;',
      '  color: #fff;',
      '}',
      '',
      '.report-stats {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '  gap: 18px;',
      '}',
      '',
      '.stat-card {',
      '  padding: 20px 22px;',
      '}',
      '',
      '.stat-card__title {',
      '  margin: 0 0 10px;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.06em;',
      '  font-size: 0.82rem;',
      '  color: var(--report-muted);',
      '}',
      '',
      '.stat-card__value {',
      '  display: block;',
      '  margin-bottom: 8px;',
      '  font-size: 2rem;',
      '}',
      '',
      '.report-table-card__head {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  gap: 16px;',
      '  align-items: center;',
      '  margin-bottom: 16px;',
      '}',
      '',
      '.report-tabs {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '}',
      '',
      '.report-tab {',
      '  min-height: 42px;',
      '  padding: 0 16px;',
      '  border: 0;',
      '  border-radius: 999px;',
      '  background: rgba(47, 111, 170, 0.08);',
      '  color: var(--report-text);',
      '  font: inherit;',
      '  font-weight: 700;',
      '}',
      '',
      '.report-tab.is-active {',
      '  background: var(--report-accent);',
      '  color: #fff;',
      '}',
      '',
      '.report-table-scroll {',
      '  overflow: auto;',
      '  max-height: 410px;',
      '  border-radius: 18px;',
      '  border: 1px solid var(--report-line);',
      '}',
      '',
      '.report-table-panel[hidden] {',
      '  display: none;',
      '}',
      '',
      '.report-table {',
      '  width: 100%;',
      '  border-collapse: collapse;',
      '  min-width: 860px;',
      '}',
      '',
      '.report-table th,',
      '.report-table td {',
      '  padding: 16px 18px;',
      '  text-align: left;',
      '  border-bottom: 1px solid var(--report-line);',
      '  vertical-align: top;',
      '}',
      '',
      '.report-table th {',
      '  position: sticky;',
      '  top: 0;',
      '  background: #eef4fb;',
      '}',
      '',
      '.sortable-header {',
      '  border: 0;',
      '  padding: 0;',
      '  background: transparent;',
      '  color: inherit;',
      '  cursor: pointer;',
      '  font: inherit;',
      '  font-weight: 700;',
      '  text-align: left;',
      '}',
      '',
      '.report-settings {',
      '  display: grid;',
      '  align-content: start;',
      '  min-width: 0;',
      '}',
      '',
      '.report-settings__card {',
      '  display: grid;',
      '  gap: 14px;',
      '}',
      '',
      '.settings-field {',
      '  display: grid;',
      '  gap: 8px;',
      '}',
      '',
      '.settings-field span {',
      '  font-size: 0.82rem;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.05em;',
      '  color: var(--report-muted);',
      '  font-weight: 700;',
      '}',
      '',
      '.settings-field input {',
      '  min-height: 44px;',
      '  padding: 0 12px;',
      '  border: 1px solid var(--report-line);',
      '  border-radius: 14px;',
      '}',
      '',
      '.settings-field select {',
      '  min-height: 44px;',
      '  padding: 0 12px;',
      '  border: 1px solid var(--report-line);',
      '  border-radius: 14px;',
      '}',
      '',
      '@media (max-width: ' + breakpoint + 'px) {',
      '  .report-shell {',
      '    grid-template-columns: minmax(0, 1fr);',
      '  }',
      '',
      '  .report-stats {',
      '    grid-template-columns: minmax(0, 1fr);',
      '  }',
      '',
      '  .report-table-card__head {',
      '    flex-direction: column;',
      '    align-items: start;',
      '  }',
      '}'
    ].join('\n');
  }

  function buildScriptArtifact(schema, options) {
    var scriptOptions = options || {};
    function functionNameFromId(prefix, id) {
      return prefix + String(id || 'datasource')
        .replace(/[^a-zA-Z0-9_$]+/g, '_')
        .replace(/^[^a-zA-Z_$]/, '_');
    }

    function getDatasourcePlaceholderBindings(datasource) {
      var bindings = [];
      var seen = {};

      getArray(datasource.parameters).forEach(function(parameter) {
        if (parameter.placeholder && parameter.name && !seen[parameter.placeholder]) {
          seen[parameter.placeholder] = true;
          bindings.push({
            placeholder: parameter.placeholder,
            parameter: parameter.name,
            required: !!parameter.required
          });
        }
      });

      getArray(schema.filters).forEach(function(filter) {
        var bind = filter.bind || {};
        if (bind.placeholder && filter.key && !seen[bind.placeholder]) {
          seen[bind.placeholder] = true;
          bindings.push({
            placeholder: bind.placeholder,
            parameter: filter.key,
            required: false
          });
        }
      });

      return bindings;
    }

    function renderQueryExpression(query, bindings) {
      return 'applyDeclaredPlaceholders(' + JSON.stringify(String(query || '')) + ', parameters, ' + JSON.stringify(bindings || []) + ')';
    }

    function renderCondition(condition) {
      var field = condition.field || '';
      var operator = condition.operator || '=';
      var expected = JSON.stringify(condition.value);
      var actual = 'parameters.' + field;

      if (operator === '>') {
        return 'Number(' + actual + ') > Number(' + expected + ')';
      }
      if (operator === '>=') {
        return 'Number(' + actual + ') >= Number(' + expected + ')';
      }
      if (operator === '<') {
        return 'Number(' + actual + ') < Number(' + expected + ')';
      }
      if (operator === '<=') {
        return 'Number(' + actual + ') <= Number(' + expected + ')';
      }
      if (operator === '!=') {
        return 'String(' + actual + ') !== String(' + expected + ')';
      }

      return 'String(' + actual + ') === String(' + expected + ')';
    }

    var datasourceFunctions = getDatasourceIds(schema).map(function(id) {
      var datasource = schema.datasources[id] || {};
      var querySource = datasource.querySource || {};
      var placeholderBindings = getDatasourcePlaceholderBindings(datasource);
      var branches = getArray(datasource.branches);
      var fallback = branches.find(function(branch) {
        return branch.when && branch.when.else;
      }) || branches.find(function(branch) {
        return !(branch.when && branch.when.field);
      });
      var conditionalBranches = branches.filter(function(branch) {
        return branch.when && branch.when.field && !branch.when.else;
      });
      var lines = [
        '  function ' + functionNameFromId('resolve_', id) + '(parameters) {',
        '    parameters = parameters || {};'
      ];

      conditionalBranches.forEach(function(branch) {
        lines.push('    if (' + renderCondition(branch.when || {}) + ') {');
        lines.push('      return ' + renderQueryExpression(branch.query || '', placeholderBindings) + ';');
        lines.push('    }');
        lines.push('');
      });

      lines.push('    return ' + renderQueryExpression((fallback && fallback.query) || querySource.text || '', placeholderBindings) + ';');
      lines.push('  }');
      return lines.join('\n');
    }).join('\n\n');

    var datasourceResolverEntries = getDatasourceIds(schema).map(function(id) {
      return '    ' + JSON.stringify(id) + ': ' + functionNameFromId('resolve_', id);
    }).join(',\n');

    var tableDatasourceMap = {};
    var tableTitleMap = {};
    var tableTitleTemplateMap = {};
    var tableColumnsMap = {};
    var tableTransformMap = {};
    var mockRowsByDatasource = {};
    var runtimeParameterConfigs = [];
    var runtimeParameterSeen = {};
    var filterConfigs = getArray(schema.filters).map(function(filter) {
      var source = filter.source || {};
      return {
        key: filter.key || '',
        multiple: filter.type === 'multi-select' || !!filter.multiple,
        datasourceId: source.fromDatasource || 'main',
        valueField: source.valueField || filter.key || '',
        titleField: source.titleField || source.valueField || filter.key || '',
        reloadOnChange: !!(filter.bind && filter.bind.placeholder)
      };
    });

    getDatasourceIds(schema).forEach(function(id) {
      getArray((schema.datasources[id] || {}).parameters).forEach(function(parameter) {
        if (parameter.name && !runtimeParameterSeen[parameter.name]) {
          runtimeParameterSeen[parameter.name] = true;
          runtimeParameterConfigs.push({
            name: parameter.name,
            source: parameter.source || 'manual',
            type: parameter.type || 'string'
          });
        }
      });
    });

    getArray(schema.tables).forEach(function(table) {
      var tableId = table.id || 'table';
      tableDatasourceMap[tableId] = table.source || 'main';
      tableTitleMap[tableId] = table.title || '';
      tableTitleTemplateMap[tableId] = table.titleTemplate || '';
      tableTransformMap[tableId] = table.transform || null;
      tableColumnsMap[tableId] = getArray(table.columns).map(function(column) {
          return {
            key: column.key || '',
            title: column.title || column.key || '',
            type: column.type || 'text',
            sortable: !!column.sortable,
            align: column.align || '',
            wrap: !!column.wrap,
            lookup: column.lookup || null
          };
        });
    });

    if (scriptOptions.includeMockRows) {
      getDatasourceIds(schema).forEach(function(id) {
        mockRowsByDatasource[id] = getMockRows(schema, id);
      });
    }

    return [
      '(function() {',
      "  'use strict';",
      '',
      '  var reportMeta = ' + JSON.stringify({
        reportId: schema.reportId || '',
        reportTitle: schema.reportTitle || '',
        template: schema.template || ''
      }, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      datasourceFunctions,
      '',
      '  var datasourceResolvers = {',
      datasourceResolverEntries,
      '  };',
      '',
      '  var tableDatasourceMap = ' + JSON.stringify(tableDatasourceMap, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var tableTitleMap = ' + JSON.stringify(tableTitleMap, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var tableTitleTemplateMap = ' + JSON.stringify(tableTitleTemplateMap, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var tableColumnsMap = ' + JSON.stringify(tableColumnsMap, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var tableTransformMap = ' + JSON.stringify(tableTransformMap, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var mockRowsByDatasource = ' + JSON.stringify(mockRowsByDatasource, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var filterConfigs = ' + JSON.stringify(filterConfigs, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var runtimeParameterConfigs = ' + JSON.stringify(runtimeParameterConfigs, null, 2).split('\n').map(function(line, index) {
        return index === 0 ? line : '  ' + line;
      }).join('\n') + ';',
      '',
      '  var currentSort = { key: "", direction: "", type: "text" };',
      '',
      '  function escapeRegExp(value) {',
      '    return String(value).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");',
      '  }',
      '',
      '  function formatPlaceholderValue(value) {',
      '    if (Array.isArray(value)) {',
      '      return value.filter(function(item) { return item != null && item !== ""; }).join(",");',
      '    }',
      '    return value == null ? "" : String(value);',
      '  }',
      '',
      '  function isEmptyPlaceholderValue(value) {',
      '    if (Array.isArray(value)) {',
      '      return !value.some(function(item) { return item != null && item !== ""; });',
      '    }',
      '    return value == null || value === "";',
      '  }',
      '',
      '  function removeOptionalPlaceholderSegment(query, placeholder) {',
      '    return String(query || "").split("|").filter(function(segment) {',
      '      return segment.indexOf(placeholder) === -1;',
      '    }).join("|").replace(/\\s+;/g, ";");',
      '  }',
      '',
      '  function applyDeclaredPlaceholders(query, parameters, bindings) {',
      '    var result = String(query || "").replace(/\\{\\{\\s*([\\w.-]+)\\s*\\}\\}/g, function(match, name) {',
      '      return formatPlaceholderValue((parameters || {})[name]);',
      '    });',
      '',
      '    (bindings || []).forEach(function(binding) {',
      '      if (!binding.placeholder || !binding.parameter) { return; }',
      '      var value = (parameters || {})[binding.parameter];',
      '      if (!binding.required && isEmptyPlaceholderValue(value)) {',
      '        result = removeOptionalPlaceholderSegment(result, binding.placeholder);',
      '        return;',
      '      }',
      '      result = result.replace(new RegExp(escapeRegExp(binding.placeholder), "g"), formatPlaceholderValue(value));',
      '    });',
      '',
      '    return result;',
      '  }',
      '',
      '  function resolveDatasourceQuery(datasourceId, parameters) {',
      '    var resolver = datasourceResolvers[datasourceId];',
      '    return resolver ? resolver(parameters || {}) : "";',
      '  }',
      '',
      '  function getRequiredDatasourceIds() {',
      '    var seen = {};',
      '    return Object.keys(tableDatasourceMap).reduce(function(ids, tableId) {',
      '      var datasourceId = tableDatasourceMap[tableId] || "main";',
      '      if (!seen[datasourceId]) {',
      '        seen[datasourceId] = true;',
      '        ids.push(datasourceId);',
      '      }',
      '      return ids;',
      '    }, []);',
      '  }',
      '',
      '  function createDatasourcePlan(parameters) {',
      '    return getRequiredDatasourceIds().map(function(datasourceId) {',
      '      return {',
      '        datasourceId: datasourceId,',
      '        query: resolveDatasourceQuery(datasourceId, parameters || {})',
      '      };',
      '    });',
      '  }',
      '',
      '  function normalizeDatasourceResponse(response) {',
      '    return Array.isArray(response && response.data) ? response.data : [];',
      '  }',
      '',
      '  function isMockMode() {',
      '    var query = new URLSearchParams(window.location.search || "");',
      '    return window.REPORT_BUILDER_MOCK_MODE === true || query.get("mode") === "mock" || query.get("mock") === "1";',
      '  }',
      '',
      '  function loadMockDatasource(datasourceId) {',
      '    return Promise.resolve((mockRowsByDatasource[datasourceId] || []).map(function(row) {',
      '      return Object.assign({}, row || {});',
      '    }));',
      '  }',
      '',
      '  function executeDatasourceQuery(query) {',
      '    var expression = String(query || "").trim();',
      '',
      '    if (!expression) {',
      '      return Promise.reject(new Error("Datasource query is empty."));',
      '    }',
      '',
      '    return new Promise(function(resolve, reject) {',
      '      $.ajax({',
      "        url: '/api/v1/datasource/execute/',",
      "        type: 'POST',",
      "        contentType: 'application/json; charset=utf-8',",
      "        dataType: 'json',",
      '        data: JSON.stringify({',
      '          expression: expression,',
      '          applyDimensionRights: true',
      '        })',
      '      })',
      '      .done(function(response) {',
      '        resolve(normalizeDatasourceResponse(response));',
      '      })',
      '      .fail(function(jqXHR, textStatus, errorThrown) {',
      '        reject(new Error(textStatus || errorThrown || "Datasource request failed"));',
      '      });',
      '    });',
      '  }',
      '',
      '  function loadDatasource(datasourceId, parameters) {',
      '    if (isMockMode()) {',
      '      return loadMockDatasource(datasourceId);',
      '    }',
      '',
      '    return executeDatasourceQuery(resolveDatasourceQuery(datasourceId, parameters || {}));',
      '  }',
      '',
      '  function loadAllDatasources(parameters) {',
      '    var rowsByDatasource = {};',
      '    return Promise.all(getRequiredDatasourceIds().map(function(datasourceId) {',
      '      return loadDatasource(datasourceId, parameters || {}).then(function(rows) {',
      '        rowsByDatasource[datasourceId] = rows || [];',
      '      });',
      '    })).then(function() {',
      '      return rowsByDatasource;',
      '    });',
      '  }',
      '',
      '  function getRowsForTable(tableId, rowsByDatasource) {',
      '    return applyTableTransform((rowsByDatasource || {})[tableDatasourceMap[tableId] || "main"] || [], tableTransformMap[tableId]);',
      '  }',
      '',
      '  function applyTableTransform(rows, transform) {',
      '    var sourceRows = Array.isArray(rows) ? rows : [];',
      '    var config = transform || {};',
      '    var groupBy = Array.isArray(config.groupBy) ? config.groupBy.filter(Boolean) : [];',
      '    var aggregations = Array.isArray(config.aggregations) ? config.aggregations : [];',
      '',
      '    if (config.kind !== "group-by" || !groupBy.length || !aggregations.length) {',
      '      return sourceRows;',
      '    }',
      '',
      '    var groups = {};',
      '    var order = [];',
      '',
      '    sourceRows.forEach(function(row) {',
      '      var key = groupBy.map(function(field) {',
      '        return row[field] == null ? "" : String(row[field]);',
      '      }).join("\\u001f");',
      '',
      '      if (!groups[key]) {',
      '        groups[key] = {};',
      '        groupBy.forEach(function(field) {',
      '          groups[key][field] = row[field];',
      '        });',
      '        aggregations.forEach(function(aggregation) {',
      '          groups[key][aggregation.as || aggregation.field] = 0;',
      '        });',
      '        order.push(key);',
      '      }',
      '',
      '      aggregations.forEach(function(aggregation) {',
      '        if ((aggregation.op || "sum") !== "sum") {',
      '          return;',
      '        }',
      '        var value = Number(row[aggregation.field]);',
      '        groups[key][aggregation.as || aggregation.field] += isNaN(value) ? 0 : value;',
      '      });',
      '    });',
      '',
      '    return order.map(function(key) {',
      '      return groups[key];',
      '    });',
      '  }',
      '',
      '  function escapeHtml(value) {',
      '    return String(value == null ? "" : value)',
      '      .replace(/&/g, "&amp;")',
      '      .replace(/</g, "&lt;")',
      '      .replace(/>/g, "&gt;")',
      '      .replace(/"/g, "&quot;")',
      "      .replace(/'/g, '&#39;');",
      '  }',
      '',
      '  function padDatePart(value) {',
      '    return String(value).padStart(2, "0");',
      '  }',
      '',
      '  function toIsoDate(date) {',
      '    return date.getFullYear() + "-" + padDatePart(date.getMonth() + 1) + "-" + padDatePart(date.getDate());',
      '  }',
      '',
      '  function parseIsoDate(value) {',
      '    var parts = String(value || "").split("-").map(Number);',
      '    if (parts.length !== 3 || parts.some(isNaN)) {',
      '      return new Date();',
      '    }',
      '    return new Date(parts[0], parts[1] - 1, parts[2]);',
      '  }',
      '',
      '  function formatDateRu(date) {',
      '    return date.toLocaleDateString("ru-RU");',
      '  }',
      '',
      '  function getQuarterLabel(date) {',
      '    var quarter = Math.floor(date.getMonth() / 3) + 1;',
      '    return quarter + " квартал " + date.getFullYear();',
      '  }',
      '',
      '  function getPeriodLabel(mode, anchor, customStart, customFinish) {',
      '    if (mode === "month") {',
      '      return anchor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });',
      '    }',
      '',
      '    if (mode === "quarter") {',
      '      return getQuarterLabel(anchor);',
      '    }',
      '',
      '    if (mode === "year") {',
      '      return String(anchor.getFullYear());',
      '    }',
      '',
      '    if (mode === "custom") {',
      '      if (customStart && customFinish) {',
      '        return formatDateRu(parseIsoDate(customStart)) + " - " + formatDateRu(parseIsoDate(customFinish));',
      '      }',
      '      return "Произвольный";',
      '    }',
      '',
      '    if (mode === "unlimited") {',
      '      return "Без ограничения";',
      '    }',
      '',
      '    return formatDateRu(anchor);',
      '  }',
      '',
      '  function getCurrentPeriodLabel() {',
      '    var toolbar = document.querySelector("[data-period-toolbar]");',
      '    if (!toolbar) {',
      '      return "";',
      '    }',
      '    return getPeriodLabel(',
      '      toolbar.getAttribute("data-period-mode") || "day",',
      '      parseIsoDate(toolbar.getAttribute("data-period-anchor")),',
      '      toolbar.getAttribute("data-period-custom-start") || "",',
      '      toolbar.getAttribute("data-period-custom-finish") || ""',
      '    );',
      '  }',
      '',
      '  function renderTemplateText(template, values) {',
      '    return String(template || "").replace(/\\{([\\w.-]+)\\}/g, function(match, key) {',
      '      return values && values[key] != null ? String(values[key]) : "";',
      '    });',
      '  }',
      '',
      '  function updateActiveTableTitle() {',
      '    var tableId = getActiveTableId();',
      '    var titleNode = document.querySelector("[data-active-table-title]");',
      '    var template = tableTitleTemplateMap[tableId] || tableTitleMap[tableId] || "Данные отчёта";',
      '',
      '    if (!titleNode) {',
      '      return;',
      '    }',
      '',
      '    titleNode.textContent = renderTemplateText(template, {',
      '      periodLabel: getCurrentPeriodLabel(),',
      '      tableTitle: tableTitleMap[tableId] || ""',
      '    }) || tableTitleMap[tableId] || "Данные отчёта";',
      '  }',
      '',
      '  function updatePeriodToolbar(toolbar) {',
      '    var mode = toolbar.getAttribute("data-period-mode") || "day";',
      '    var anchor = parseIsoDate(toolbar.getAttribute("data-period-anchor"));',
      '    var customStart = toolbar.getAttribute("data-period-custom-start") || "";',
      '    var customFinish = toolbar.getAttribute("data-period-custom-finish") || "";',
      '    var label = toolbar.querySelector("[data-period-label]");',
      '    var customPanel = toolbar.querySelector("[data-period-custom]");',
      '',
      '    if (label) {',
      '      label.textContent = getPeriodLabel(mode, anchor, customStart, customFinish);',
      '    }',
      '',
      '    updateActiveTableTitle();',
      '',
      '    Array.prototype.forEach.call(toolbar.querySelectorAll("[data-period-mode]"), function(button) {',
      '      if (button === toolbar) {',
      '        return;',
      '      }',
      '      button.classList.toggle("is-active", button.getAttribute("data-period-mode") === mode);',
      '    });',
      '',
      '    if (customPanel) {',
      '      customPanel.hidden = mode !== "custom";',
      '    }',
      '',
      '    Array.prototype.forEach.call(toolbar.querySelectorAll("[data-period-shift]"), function(button) {',
      '      button.disabled = mode === "custom" || mode === "unlimited";',
      '    });',
      '  }',
      '',
      '  function getPeriodRange() {',
      '    var toolbar = document.querySelector("[data-period-toolbar]");',
      '    var today = toIsoDate(new Date());',
      '',
      '    if (!toolbar) {',
      '      return { dateStart: today, dateFinish: today };',
      '    }',
      '',
      '    var mode = toolbar.getAttribute("data-period-mode") || "day";',
      '    var anchor = parseIsoDate(toolbar.getAttribute("data-period-anchor") || today);',
      '',
      '    if (mode === "custom") {',
      '      return {',
      '        dateStart: toolbar.getAttribute("data-period-custom-start") || today,',
      '        dateFinish: toolbar.getAttribute("data-period-custom-finish") || today',
      '      };',
      '    }',
      '',
      '    if (mode === "month") {',
      '      return {',
      '        dateStart: toIsoDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1)),',
      '        dateFinish: toIsoDate(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0))',
      '      };',
      '    }',
      '',
      '    if (mode === "quarter") {',
      '      var firstMonth = Math.floor(anchor.getMonth() / 3) * 3;',
      '      return {',
      '        dateStart: toIsoDate(new Date(anchor.getFullYear(), firstMonth, 1)),',
      '        dateFinish: toIsoDate(new Date(anchor.getFullYear(), firstMonth + 3, 0))',
      '      };',
      '    }',
      '',
      '    if (mode === "year") {',
      '      return {',
      '        dateStart: toIsoDate(new Date(anchor.getFullYear(), 0, 1)),',
      '        dateFinish: toIsoDate(new Date(anchor.getFullYear(), 11, 31))',
      '      };',
      '    }',
      '',
      '    return { dateStart: toIsoDate(anchor), dateFinish: toIsoDate(anchor) };',
      '  }',
      '',
      '  function getFilterControlValue(control) {',
      '    if (!control) {',
      '      return "";',
      '    }',
      '    if (control.multiple) {',
      '      return Array.prototype.slice.call(control.selectedOptions).map(function(option) {',
      '        return option.value;',
      '      });',
      '    }',
      '    return control.value || "";',
      '  }',
      '',
      '  function coerceRuntimeParameterValue(value, type) {',
      '    if (type === "integer") {',
      '      var integerValue = Number(value);',
      '      return value !== "" && !isNaN(integerValue) ? Math.trunc(integerValue) : 0;',
      '    }',
      '    if (type === "number") {',
      '      var numberValue = Number(value);',
      '      return value !== "" && !isNaN(numberValue) ? numberValue : 0;',
      '    }',
      '    if (type === "boolean") {',
      '      return value === true || value === "true" || value === "1";',
      '    }',
      '    return value == null ? "" : String(value);',
      '  }',
      '',
      '  function getRuntimeParameterSourceValue(config, parameters) {',
      '    var source = config.source || "manual";',
      '    if (source === "period.start") { return parameters.dateStart; }',
      '    if (source === "period.finish") { return parameters.dateFinish; }',
      '    if (source.indexOf("filters.") === 0) { return parameters[source.slice(8)]; }',
      '    return parameters[config.name];',
      '  }',
      '',
      '  function collectReportParameters() {',
      '    var period = getPeriodRange();',
      '    var parameters = {',
      '      dateStart: period.dateStart,',
      '      dateFinish: period.dateFinish',
      '    };',
      '',
      '    filterConfigs.forEach(function(filter) {',
      '      var control = document.querySelector("[data-preview-filter=\\"" + filter.key + "\\"]");',
      '      parameters[filter.key] = getFilterControlValue(control);',
      '    });',
      '',
      '    runtimeParameterConfigs.forEach(function(config) {',
      '      if (!config.name) { return; }',
      '      parameters[config.name] = coerceRuntimeParameterValue(getRuntimeParameterSourceValue(config, parameters), config.type || "string");',
      '    });',
      '',
      '    parameters.orderId = Number(parameters.orderId) > 0 ? Number(parameters.orderId) : 0;',
      '    return parameters;',
      '  }',
      '',
      '  function formatCellValue(value, column) {',
      '    if (value == null || value === "") {',
      '      return "";',
      '    }',
      '    if (column.type === "integer") {',
      '      var integer = Number(value);',
      '      return isNaN(integer) ? String(value) : Math.trunc(integer).toLocaleString("ru-RU", { maximumFractionDigits: 0 });',
      '    }',
      '    if (column.type === "number") {',
      '      var numeric = Number(value);',
      '      return isNaN(numeric) ? String(value) : numeric.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });',
      '    }',
      '    if (column.type === "date" || column.type === "datetime") {',
      '      var time = Date.parse(value);',
      '      return isNaN(time) ? String(value) : new Date(time).toLocaleDateString("ru-RU");',
      '    }',
      '    return String(value);',
      '  }',
      '',
      '  function getCellDisplayValue(row, column) {',
      '    var lookup = column.lookup || {};',
      '    if (lookup.titleField && row[lookup.titleField] != null && row[lookup.titleField] !== "") {',
      '      return row[lookup.titleField];',
      '    }',
      '    return row[column.key];',
      '  }',
      '',
      '  function buildRowFilterValues(row) {',
      '    return filterConfigs.reduce(function(values, filter) {',
      '      var value = row[filter.valueField];',
      '      values[filter.key] = value == null ? "" : String(value);',
      '      return values;',
      '    }, {});',
      '  }',
      '',
      '  function renderTable(tableId, rows) {',
      '    var panel = document.querySelector("[data-table-panel=\\"" + tableId + "\\"]");',
      '    var tbody = panel ? panel.querySelector("tbody") : null;',
      '    var columns = tableColumnsMap[tableId] || [];',
      '',
      '    if (!tbody) {',
      '      return;',
      '    }',
      '',
      '    if (!rows.length) {',
      '      tbody.innerHTML = "<tr><td colspan=\\"" + Math.max(columns.length, 1) + "\\">No rows returned for datasource " + escapeHtml(tableDatasourceMap[tableId] || "main") + ".</td></tr>";',
      '      return;',
      '    }',
      '',
      '    tbody.innerHTML = rows.map(function(row) {',
      '      var cells = columns.map(function(column) {',
      '        return "<td>" + escapeHtml(formatCellValue(getCellDisplayValue(row, column), column)) + "</td>";',
      '      }).join("");',
      '      return "<tr data-report-row data-row-json=\\"" + escapeHtml(JSON.stringify(row)) + "\\" data-filter-values=\\"" + escapeHtml(JSON.stringify(buildRowFilterValues(row))) + "\\">" + cells + "</tr>";',
      '    }).join("");',
      '  }',
      '',
      '  function renderAllTables(rowsByDatasource) {',
      '    Object.keys(tableColumnsMap).forEach(function(tableId) {',
      '      renderTable(tableId, getRowsForTable(tableId, rowsByDatasource));',
      '    });',
      '  }',
      '',
      '  function updateFilterOptions(rowsByDatasource) {',
      '    filterConfigs.forEach(function(filter) {',
      '      var control = document.querySelector("[data-preview-filter=\\"" + filter.key + "\\"]");',
      '      var rows = (rowsByDatasource || {})[filter.datasourceId] || [];',
      '      var currentValue = getFilterControlValue(control);',
      '      var seen = {};',
      '      var options = rows.reduce(function(items, row) {',
      '        var value = row[filter.valueField];',
      '        var title = row[filter.titleField];',
      '        value = value == null ? "" : String(value);',
      '        title = title == null || title === "" ? value : String(title);',
      '        if (!value || seen[value]) {',
      '          return items;',
      '        }',
      '        seen[value] = true;',
      '        items.push({ value: value, title: title });',
      '        return items;',
      '      }, []);',
      '',
      '      if (!control) {',
      '        return;',
      '      }',
      '',
      '      control.innerHTML = "<option value=\\"\\">Все</option>" + options.map(function(option) {',
      '        return "<option value=\\"" + escapeHtml(option.value) + "\\">" + escapeHtml(option.title) + "</option>";',
      '      }).join("");',
      '',
      '      if (Array.isArray(currentValue)) {',
      '        Array.prototype.forEach.call(control.options, function(option) {',
      '          option.selected = currentValue.indexOf(option.value) !== -1;',
      '        });',
      '      } else {',
      '        control.value = currentValue;',
      '      }',
      '    });',
      '  }',
      '',
      '  function parseJsonAttribute(node, name) {',
      '    try { return JSON.parse(node.getAttribute(name) || "{}"); } catch (error) { return {}; }',
      '  }',
      '',
      '  function getActivePanel() {',
      '    return document.querySelector("[data-table-panel].is-active") || document.querySelector("[data-table-panel]");',
      '  }',
      '',
      '  function getVisibleRows() {',
      '    var panel = getActivePanel();',
      '    return Array.prototype.slice.call(panel ? panel.querySelectorAll("[data-report-row]") : []).filter(function(row) {',
      '      return row.style.display !== "none";',
      '    }).map(function(row) {',
      '      return parseJsonAttribute(row, "data-row-json");',
      '    });',
      '  }',
      '',
      '  function getActiveTableId() {',
      '    var panel = getActivePanel();',
      '    return panel ? panel.getAttribute("data-table-panel") || "" : "";',
      '  }',
      '',
      '  function normalizeSortValue(value, type) {',
      '    if (value == null) {',
      '      return "";',
      '    }',
      '',
      '    if (type === "number") {',
      '      var numeric = Number(value);',
      '      return isNaN(numeric) ? 0 : numeric;',
      '    }',
      '',
      '    if (type === "date" || type === "datetime") {',
      '      var time = Date.parse(value);',
      '      return isNaN(time) ? 0 : time;',
      '    }',
      '',
      '    return String(value).toLocaleLowerCase();',
      '  }',
      '',
      '  function updateSortIndicators() {',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-sort-key]"), function(cell) {',
      '      var indicator = cell.querySelector("[data-sort-indicator]");',
      '      var isActive = cell.getAttribute("data-sort-key") === currentSort.key;',
      '',
      '      if (indicator) {',
      '        indicator.textContent = isActive ? (currentSort.direction === "asc" ? " ↑" : " ↓") : "";',
      '      }',
      '    });',
      '  }',
      '',
      '  function applySort() {',
      '    var panel = getActivePanel();',
      '    var tbody = panel ? panel.querySelector("tbody") : null;',
      '',
      '    if (!tbody || !currentSort.key || !currentSort.direction) {',
      '      updateSortIndicators();',
      '      return;',
      '    }',
      '',
      '    Array.prototype.slice.call(tbody.querySelectorAll("[data-report-row]")).sort(function(a, b) {',
      '      var rowA = parseJsonAttribute(a, "data-row-json");',
      '      var rowB = parseJsonAttribute(b, "data-row-json");',
      '      var valueA = normalizeSortValue(rowA[currentSort.key], currentSort.type);',
      '      var valueB = normalizeSortValue(rowB[currentSort.key], currentSort.type);',
      '',
      '      if (valueA < valueB) {',
      '        return currentSort.direction === "asc" ? -1 : 1;',
      '      }',
      '      if (valueA > valueB) {',
      '        return currentSort.direction === "asc" ? 1 : -1;',
      '      }',
      '      return 0;',
      '    }).forEach(function(row) {',
      '      tbody.appendChild(row);',
      '    });',
      '',
      '    updateSortIndicators();',
      '  }',
      '',
      '  function updateSummary() {',
      '    var rows = getVisibleRows();',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-summary-kind]"), function(card) {',
      '      var kind = card.getAttribute("data-summary-kind");',
      '      var field = card.getAttribute("data-summary-field");',
      '      var valueNode = card.querySelector("[data-summary-value]");',
      '      var value = "--";',
      '',
      '      if (kind === "row-count") {',
      '        value = String(rows.length);',
      '      } else if (kind === "sum") {',
      '        value = rows.reduce(function(sum, row) {',
      '          var numeric = Number(row[field]);',
      '          return isNaN(numeric) ? sum : sum + numeric;',
      '        }, 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });',
      '      }',
      '',
      '      if (valueNode) {',
      '        valueNode.textContent = value;',
      '      }',
      '    });',
      '  }',
      '',
      '  function applyFilters() {',
      '    var activePanel = getActivePanel();',
      '    var activeRows = activePanel ? activePanel.querySelectorAll("[data-report-row]") : [];',
      '    var selected = filterConfigs.filter(function(filter) {',
      '      return !filter.reloadOnChange;',
      '    }).map(function(filter) {',
      '      var control = document.querySelector("[data-preview-filter=\\"" + filter.key + "\\"]");',
      '      var value = getFilterControlValue(control);',
      '      return {',
      '        key: filter.key,',
      '        values: Array.isArray(value) ? value.filter(Boolean) : (value ? [String(value)] : [])',
      '      };',
      '    });',
      '',
      '    Array.prototype.forEach.call(activeRows, function(row) {',
      '      var values = parseJsonAttribute(row, "data-filter-values");',
      '      var visible = selected.every(function(filter) {',
      '        return !filter.values.length || filter.values.indexOf(values[filter.key]) !== -1;',
      '      });',
      '      row.style.display = visible ? "" : "none";',
      '    });',
      '',
      '    applySort();',
      '    updateSummary();',
      '  }',
      '',
      '  function showTableMessage(message) {',
      '    Object.keys(tableColumnsMap).forEach(function(tableId) {',
      '      var panel = document.querySelector("[data-table-panel=\\"" + tableId + "\\"]");',
      '      var tbody = panel ? panel.querySelector("tbody") : null;',
      '      var columns = tableColumnsMap[tableId] || [];',
      '      if (tbody) {',
      '        tbody.innerHTML = "<tr><td colspan=\\"" + Math.max(columns.length, 1) + "\\">" + escapeHtml(message) + "</td></tr>";',
      '      }',
      '    });',
      '  }',
      '',
      '  function escapeCsvCell(value) {',
      '    var text = String(value == null ? "" : value);',
      '    if (/[;"\\r\\n]/.test(text)) {',
      '      return "\\"" + text.replace(/"/g, "\\"\\"") + "\\"";',
      '    }',
      '    return text;',
      '  }',
      '',
      '  function downloadTextFile(filename, content, type) {',
      '    var blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });',
      '    var url = URL.createObjectURL(blob);',
      '    var link = document.createElement("a");',
      '    link.href = url;',
      '    link.download = filename;',
      '    document.body.appendChild(link);',
      '    link.click();',
      '    document.body.removeChild(link);',
      '    URL.revokeObjectURL(url);',
      '  }',
      '',
      '  function exportActiveTableToCsv() {',
      '    var tableId = getActiveTableId();',
      '    var columns = tableColumnsMap[tableId] || [];',
      '    var rows = getVisibleRows();',
      '    var lines = [];',
      '',
      '    if (!tableId || !columns.length) {',
      '      return;',
      '    }',
      '',
      '    lines.push(columns.map(function(column) {',
      '      return escapeCsvCell(column.title || column.key || "");',
      '    }).join(";"));',
      '',
      '    rows.forEach(function(row) {',
      '      lines.push(columns.map(function(column) {',
      '        return escapeCsvCell(formatCellValue(getCellDisplayValue(row, column), column));',
      '      }).join(";"));',
      '    });',
      '',
      '    downloadTextFile((tableTitleMap[tableId] || tableId || "report") + ".csv", "\\ufeff" + lines.join("\\r\\n"), "text/csv;charset=utf-8");',
      '  }',
      '',
      '  function refreshReport() {',
      '    var parameters = collectReportParameters();',
      '    showTableMessage("Loading data...");',
      '    return loadAllDatasources(parameters).then(function(rowsByDatasource) {',
      '      updateFilterOptions(rowsByDatasource);',
      '      renderAllTables(rowsByDatasource);',
      '      applyFilters();',
      '      console.log("Datasource plan:", createDatasourcePlan(parameters));',
      '    }).catch(function(error) {',
      '      console.error(error);',
      '      showTableMessage(error && error.message ? error.message : "Datasource load failed.");',
      '      updateSummary();',
      '    });',
      '  }',
      '',
      '  function activateTablePanel(tableRef) {',
      '    var targetPanel = tableRef ? document.querySelector("[data-table-panel=\\"" + tableRef + "\\"]") : null;',
      '    var fallbackPanel = document.querySelector("[data-table-panel]");',
      '    var activePanel = targetPanel || fallbackPanel;',
      '',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-table-panel]"), function(panel) {',
      '      var isActive = panel === activePanel;',
      '      panel.classList.toggle("is-active", isActive);',
      '      panel.hidden = !isActive;',
      '    });',
      '',
      '    updateActiveTableTitle();',
      '    applyFilters();',
      '  }',
      '',
      '  function shiftPeriodAnchor(toolbar, direction) {',
      '    var mode = toolbar.getAttribute("data-period-mode") || "day";',
      '    var anchor = parseIsoDate(toolbar.getAttribute("data-period-anchor"));',
      '    if (mode === "month") {',
      '      anchor.setMonth(anchor.getMonth() + direction);',
      '    } else if (mode === "quarter") {',
      '      anchor.setMonth(anchor.getMonth() + direction * 3);',
      '    } else if (mode === "year") {',
      '      anchor.setFullYear(anchor.getFullYear() + direction);',
      '    } else {',
      '      anchor.setDate(anchor.getDate() + direction);',
      '    }',
      '    toolbar.setAttribute("data-period-anchor", toIsoDate(anchor));',
      '  }',
      '',
      '  function bindReportEvents() {',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-preview-tab]"), function(button) {',
      '      button.addEventListener("click", function() {',
      '        Array.prototype.forEach.call(document.querySelectorAll("[data-preview-tab]"), function(tabButton) {',
      '          tabButton.classList.toggle("is-active", tabButton === button);',
      '        });',
      '        activateTablePanel(button.getAttribute("data-table-ref") || "");',
      '        updateSortIndicators();',
      '      });',
      '    });',
      '',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-preview-filter]"), function(control) {',
      '      control.addEventListener("change", function() {',
      '        var key = control.getAttribute("data-preview-filter") || "";',
      '        var config = filterConfigs.find(function(filter) {',
      '          return filter.key === key;',
      '        });',
      '',
      '        if (config && config.reloadOnChange) {',
      '          refreshReport();',
      '          return;',
      '        }',
      '',
      '        applyFilters();',
      '      });',
      '    });',
      '',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-sort-key]"), function(cell) {',
      '      var button = cell.querySelector("button") || cell;',
      '      button.addEventListener("click", function() {',
      '        var key = cell.getAttribute("data-sort-key") || "";',
      '        var type = cell.getAttribute("data-sort-type") || "text";',
      '        currentSort = {',
      '          key: key,',
      '          type: type,',
      '          direction: currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc"',
      '        };',
      '        applyFilters();',
      '      });',
      '    });',
      '',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-report-action=\\"refresh\\"]"), function(button) {',
      '      button.addEventListener("click", function(event) {',
      '        event.preventDefault();',
      '        refreshReport();',
      '      });',
      '    });',
      '',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-report-action=\\"excel\\"]"), function(button) {',
      '      button.addEventListener("click", function(event) {',
      '        event.preventDefault();',
      '        exportActiveTableToCsv();',
      '      });',
      '    });',
      '',
      '    Array.prototype.forEach.call(document.querySelectorAll("[data-period-toolbar]"), function(toolbar) {',
      '      var toggle = toolbar.querySelector("[data-period-toggle]");',
      '      var menu = toolbar.querySelector("[data-period-menu]");',
      '      var customStart = toolbar.querySelector("[data-period-custom-start]");',
      '      var customFinish = toolbar.querySelector("[data-period-custom-finish]");',
      '',
      '      if (customStart && !customStart.value) {',
      '        customStart.value = toolbar.getAttribute("data-period-anchor") || toIsoDate(new Date());',
      '      }',
      '      if (customFinish && !customFinish.value) {',
      '        customFinish.value = toolbar.getAttribute("data-period-anchor") || toIsoDate(new Date());',
      '      }',
      '',
      '      if (toggle && menu) {',
      '        toggle.addEventListener("click", function() {',
      '          menu.hidden = !menu.hidden;',
      '        });',
      '      }',
      '',
      '      Array.prototype.forEach.call(toolbar.querySelectorAll("[data-period-shift]"), function(button) {',
      '        button.addEventListener("click", function() {',
      '          shiftPeriodAnchor(toolbar, Number(button.getAttribute("data-period-shift")) || 0);',
      '          updatePeriodToolbar(toolbar);',
      '          refreshReport();',
      '        });',
      '      });',
      '      Array.prototype.forEach.call(toolbar.querySelectorAll("[data-period-mode]"), function(button) {',
      '        if (button === toolbar) { return; }',
      '        button.addEventListener("click", function() {',
      '          toolbar.setAttribute("data-period-mode", button.getAttribute("data-period-mode") || "day");',
      '          updatePeriodToolbar(toolbar);',
      '          if (menu && toolbar.getAttribute("data-period-mode") !== "custom") {',
      '            menu.hidden = true;',
      '          }',
      '          refreshReport();',
      '        });',
      '      });',
      '      var applyButton = toolbar.querySelector("[data-period-apply]");',
      '      if (applyButton) {',
      '        applyButton.addEventListener("click", function() {',
      '          var start = toolbar.querySelector("[data-period-custom-start]");',
      '          var finish = toolbar.querySelector("[data-period-custom-finish]");',
      '          toolbar.setAttribute("data-period-custom-start", start ? start.value : "");',
      '          toolbar.setAttribute("data-period-custom-finish", finish ? finish.value : "");',
      '          updatePeriodToolbar(toolbar);',
      '          if (menu) {',
      '            menu.hidden = true;',
      '          }',
      '          refreshReport();',
      '        });',
      '      }',
      '',
      '      updatePeriodToolbar(toolbar);',
      '    });',
      '  }',
      '',
      '  function bootstrapReport() {',
      "    console.log('Report Builder draft package loaded:', reportMeta);",
      '    bindReportEvents();',
      '    var activeTab = document.querySelector("[data-preview-tab].is-active") || document.querySelector("[data-preview-tab]");',
      '    activateTablePanel(activeTab ? activeTab.getAttribute("data-table-ref") || "" : "");',
      '    refreshReport();',
      '  }',
      '',
      "  if (document.readyState === 'loading') {",
      "    document.addEventListener('DOMContentLoaded', bootstrapReport);",
      '  } else {',
      '    bootstrapReport();',
      '  }',
      '})();'
    ].join('\n');
  }

  function buildDsArtifact(schema) {
    return getDatasourceIds(schema).map(function(id) {
      var datasource = schema.datasources[id] || {};
      var querySource = datasource.querySource || {};
      var branches = getArray(datasource.branches);
      var lines = [
        '# datasource: ' + id + (datasource.title ? ' - ' + datasource.title : '')
      ];

      if (branches.length) {
        branches.forEach(function(branch) {
          lines.push('');
          lines.push('## branch: ' + (branch.id || 'branch'));
          lines.push(branch.query || '');
        });
      } else {
        lines.push('');
        lines.push(querySource.text || '');
      }

      return lines.join('\n');
    }).join('\n\n');
  }

  function buildPreviewRuntimeScript() {
    return [
      '<script>',
      '(function() {',
      "  'use strict';",
      '',
      '  var currentSort = { key: "", direction: "" };',
      '',
      '  function parseJsonAttribute(node, name) {',
      "    try { return JSON.parse(node.getAttribute(name) || '{}'); } catch (e) { return {}; }",
      '  }',
      '',
      '  function formatNumber(value) {',
      "    return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });",
      '  }',
      '',
      '  function getVisibleRowData() {',
      '    var panel = getActivePanel();',
      "    return Array.prototype.slice.call(panel ? panel.querySelectorAll('[data-report-row]') : []).filter(function(row) {",
      "      return row.style.display !== 'none';",
      '    }).map(function(row) {',
      "      return parseJsonAttribute(row, 'data-row-json');",
      '    });',
      '  }',
      '',
      '  function getActivePanel() {',
      "    return document.querySelector('[data-table-panel].is-active') || document.querySelector('[data-table-panel]');",
      '  }',
      '',
      '  function padDatePart(value) {',
      "    return String(value).padStart(2, '0');",
      '  }',
      '',
      '  function toIsoDate(date) {',
      "    return date.getFullYear() + '-' + padDatePart(date.getMonth() + 1) + '-' + padDatePart(date.getDate());",
      '  }',
      '',
      '  function parseIsoDate(value) {',
      '    var parts = String(value || "").split("-").map(Number);',
      '    if (parts.length !== 3 || parts.some(isNaN)) {',
      '      return new Date();',
      '    }',
      '',
      '    return new Date(parts[0], parts[1] - 1, parts[2]);',
      '  }',
      '',
      '  function formatDateRu(date) {',
      "    return date.toLocaleDateString('ru-RU');",
      '  }',
      '',
      '  function getQuarterLabel(date) {',
      '    var quarter = Math.floor(date.getMonth() / 3) + 1;',
      "    return quarter + ' ' + '\\u043a\\u0432\\u0430\\u0440\\u0442\\u0430\\u043b' + ' ' + date.getFullYear();",
      '  }',
      '',
      '  function getPeriodLabel(mode, anchor, customStart, customFinish) {',
      "    if (mode === 'month') {",
      "      return anchor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });",
      '    }',
      '',
      "    if (mode === 'quarter') {",
      '      return getQuarterLabel(anchor);',
      '    }',
      '',
      "    if (mode === 'year') {",
      '      return String(anchor.getFullYear());',
      '    }',
      '',
      "    if (mode === 'custom') {",
      '      if (customStart && customFinish) {',
      "        return formatDateRu(parseIsoDate(customStart)) + ' - ' + formatDateRu(parseIsoDate(customFinish));",
      '      }',
      "      return '\\u041f\\u0440\\u043e\\u0438\\u0437\\u0432\\u043e\\u043b\\u044c\\u043d\\u044b\\u0439';",
      '    }',
      '',
      "    if (mode === 'unlimited') {",
      "      return '\\u0411\\u0435\\u0437 \\u043e\\u0433\\u0440\\u0430\\u043d\\u0438\\u0447\\u0435\\u043d\\u0438\\u044f';",
      '    }',
      '',
      '    return formatDateRu(anchor);',
      '  }',
      '',
      '  function shiftPeriodAnchor(anchor, mode, direction) {',
      '    var next = new Date(anchor.getTime());',
      '',
      "    if (mode === 'month') {",
      '      next.setMonth(next.getMonth() + direction);',
      "    } else if (mode === 'quarter') {",
      '      next.setMonth(next.getMonth() + direction * 3);',
      "    } else if (mode === 'year') {",
      '      next.setFullYear(next.getFullYear() + direction);',
      '    } else {',
      '      next.setDate(next.getDate() + direction);',
      '    }',
      '',
      '    return next;',
      '  }',
      '',
      '  function updatePeriodToolbar(toolbar) {',
      "    var mode = toolbar.getAttribute('data-period-mode') || 'day';",
      "    var anchor = parseIsoDate(toolbar.getAttribute('data-period-anchor'));",
      "    var customStart = toolbar.getAttribute('data-period-custom-start') || '';",
      "    var customFinish = toolbar.getAttribute('data-period-custom-finish') || '';",
      "    var label = toolbar.querySelector('[data-period-label]');",
      "    var customPanel = toolbar.querySelector('[data-period-custom]');",
      "    var arrows = toolbar.querySelectorAll('[data-period-shift]');",
      '',
      '    if (label) {',
      '      label.textContent = getPeriodLabel(mode, anchor, customStart, customFinish);',
      '    }',
      '',
      "    Array.prototype.forEach.call(toolbar.querySelectorAll('[data-period-mode]'), function(button) {",
      "      if (button === toolbar) { return; }",
      "      button.classList.toggle('is-active', button.getAttribute('data-period-mode') === mode);",
      '    });',
      '',
      '    if (customPanel) {',
      "      customPanel.hidden = mode !== 'custom';",
      '    }',
      '',
      '    Array.prototype.forEach.call(arrows, function(button) {',
      "      button.disabled = mode === 'custom' || mode === 'unlimited';",
      '    });',
      '  }',
      '',
      '  function initPeriodToolbar(toolbar) {',
      "    var toggle = toolbar.querySelector('[data-period-toggle]');",
      "    var menu = toolbar.querySelector('[data-period-menu]');",
      "    var customStart = toolbar.querySelector('[data-period-custom-start]');",
      "    var customFinish = toolbar.querySelector('[data-period-custom-finish]');",
      '',
      '    if (customStart && !customStart.value) {',
      "      customStart.value = toolbar.getAttribute('data-period-anchor') || toIsoDate(new Date());",
      '    }',
      '    if (customFinish && !customFinish.value) {',
      "      customFinish.value = toolbar.getAttribute('data-period-anchor') || toIsoDate(new Date());",
      '    }',
      '',
      '    if (toggle && menu) {',
      "      toggle.addEventListener('click', function() {",
      '        menu.hidden = !menu.hidden;',
      '      });',
      '    }',
      '',
      "    Array.prototype.forEach.call(toolbar.querySelectorAll('[data-period-mode]'), function(button) {",
      "      if (button === toolbar) { return; }",
      "      button.addEventListener('click', function() {",
      "        toolbar.setAttribute('data-period-mode', button.getAttribute('data-period-mode') || 'day');",
      '        updatePeriodToolbar(toolbar);',
      "        if (menu && toolbar.getAttribute('data-period-mode') !== 'custom') {",
      '          menu.hidden = true;',
      '        }',
      '      });',
      '    });',
      '',
      "    Array.prototype.forEach.call(toolbar.querySelectorAll('[data-period-shift]'), function(button) {",
      "      button.addEventListener('click', function() {",
      "        var mode = toolbar.getAttribute('data-period-mode') || 'day';",
      "        if (mode === 'custom' || mode === 'unlimited') { return; }",
      "        var direction = Number(button.getAttribute('data-period-shift')) || 0;",
      "        var anchor = parseIsoDate(toolbar.getAttribute('data-period-anchor'));",
      "        toolbar.setAttribute('data-period-anchor', toIsoDate(shiftPeriodAnchor(anchor, mode, direction)));",
      '        updatePeriodToolbar(toolbar);',
      '      });',
      '    });',
      '',
      "    var applyButton = toolbar.querySelector('[data-period-apply]');",
      '    if (applyButton) {',
      "      applyButton.addEventListener('click', function() {",
      "        toolbar.setAttribute('data-period-custom-start', customStart ? customStart.value : '');",
      "        toolbar.setAttribute('data-period-custom-finish', customFinish ? customFinish.value : '');",
      '        updatePeriodToolbar(toolbar);',
      '        if (menu) { menu.hidden = true; }',
      '      });',
      '    }',
      '',
      '    updatePeriodToolbar(toolbar);',
      '  }',
      '',
      '  function activateTablePanel(tableRef) {',
      "    var targetPanel = tableRef ? document.querySelector('[data-table-panel=\"' + tableRef + '\"]') : null;",
      "    var fallbackPanel = document.querySelector('[data-table-panel]');",
      '    var activePanel = targetPanel || fallbackPanel;',
      '',
      "    Array.prototype.forEach.call(document.querySelectorAll('[data-table-panel]'), function(panel) {",
      '      var isActive = panel === activePanel;',
      "      panel.classList.toggle('is-active', isActive);",
      '      panel.hidden = !isActive;',
      '    });',
      '',
      '    return activePanel;',
      '  }',
      '',
      '  function updateSummary() {',
      '    var rows = getVisibleRowData();',
      "    Array.prototype.forEach.call(document.querySelectorAll('[data-summary-kind]'), function(card) {",
      "      var kind = card.getAttribute('data-summary-kind');",
      "      var field = card.getAttribute('data-summary-field');",
      "      var valueNode = card.querySelector('[data-summary-value]');",
      '      var value = "--";',
      '',
      "      if (kind === 'row-count') {",
      '        value = String(rows.length);',
      "      } else if (kind === 'sum') {",
      '        value = formatNumber(rows.reduce(function(sum, row) {',
      '          var numeric = Number(row[field]);',
      '          return isNaN(numeric) ? sum : sum + numeric;',
      '        }, 0));',
      '      }',
      '',
      '      if (valueNode) {',
      '        valueNode.textContent = value;',
      '      }',
      '    });',
      '  }',
      '',
      '  function normalizeSortValue(value, type) {',
      '    if (value == null) {',
      "      return '';",
      '    }',
      '',
      "    if (type === 'number') {",
      '      var numeric = Number(value);',
      '      return isNaN(numeric) ? 0 : numeric;',
      '    }',
      '',
      "    if (type === 'date' || type === 'datetime') {",
      '      var time = Date.parse(value);',
      '      return isNaN(time) ? 0 : time;',
      '    }',
      '',
      '    return String(value).toLocaleLowerCase();',
      '  }',
      '',
      '  function updateSortIndicators() {',
      '    var panel = getActivePanel();',
      "    Array.prototype.forEach.call(document.querySelectorAll('[data-sort-key]'), function(cell) {",
      "      var indicator = cell.querySelector('[data-sort-indicator]');",
      '      if (!indicator) {',
      '        return;',
      '      }',
      '',
      '      if (panel && !panel.contains(cell)) {',
      "        indicator.textContent = '';",
      '        return;',
      '      }',
      '',
      "      if (cell.getAttribute('data-sort-key') !== currentSort.key) {",
      "        indicator.textContent = '';",
      '        return;',
      '      }',
      '',
      "      indicator.textContent = currentSort.direction === 'asc' ? ' ↑' : ' ↓';",
      '    });',
      '  }',
      '',
      '  function applySort() {',
      '    if (!currentSort.key) {',
      '      updateSortIndicators();',
      '      return;',
      '    }',
      '',
      '    var panel = getActivePanel();',
      "    var tableBody = panel ? panel.querySelector('.report-table tbody') : null;",
      '    if (!tableBody) {',
      '      return;',
      '    }',
      '',
      "    var sortCell = panel ? panel.querySelector('[data-sort-key=\"' + currentSort.key + '\"]') : null;",
      "    var type = sortCell ? sortCell.getAttribute('data-sort-type') : 'text';",
      "    var rows = Array.prototype.slice.call(panel.querySelectorAll('[data-report-row]'));",
      '',
      '    rows.sort(function(left, right) {',
      "      var leftData = parseJsonAttribute(left, 'data-row-json');",
      "      var rightData = parseJsonAttribute(right, 'data-row-json');",
      '      var leftValue = normalizeSortValue(leftData[currentSort.key], type);',
      '      var rightValue = normalizeSortValue(rightData[currentSort.key], type);',
      '',
      "      if (leftValue < rightValue) { return currentSort.direction === 'asc' ? -1 : 1; }",
      "      if (leftValue > rightValue) { return currentSort.direction === 'asc' ? 1 : -1; }",
      '      return 0;',
      '    });',
      '',
      '    rows.forEach(function(row) {',
      '      tableBody.appendChild(row);',
      '    });',
      '',
      '    updateSortIndicators();',
      '  }',
      '',
      '  function applyFilters() {',
      "    var filters = Array.prototype.slice.call(document.querySelectorAll('[data-preview-filter]')).filter(function(control) {",
      "      return control.getAttribute('data-client-filter') !== 'false';",
      '    }).map(function(control) {',
      "      var selected = Array.prototype.slice.call(control.selectedOptions || []).map(function(option) { return option.value; }).filter(Boolean);",
      "      return { key: control.getAttribute('data-preview-filter'), values: selected };",
      '    });',
      '',
      "    Array.prototype.forEach.call(document.querySelectorAll('[data-report-row]'), function(row) {",
      "      var values = parseJsonAttribute(row, 'data-filter-values');",
      '      var isVisible = filters.every(function(filter) {',
      '        return !filter.values.length || filter.values.indexOf(values[filter.key]) !== -1;',
      '      });',
      '',
      "      row.style.display = isVisible ? '' : 'none';",
      '    });',
      '',
      '    applySort();',
      '    updateSummary();',
      '  }',
      '',
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-sort-key] .sortable-header'), function(button) {",
      "    button.addEventListener('click', function() {",
      "      var cell = button.closest('[data-sort-key]');",
      "      var key = cell ? cell.getAttribute('data-sort-key') : '';",
      '',
      '      if (!key) {',
      '        return;',
      '      }',
      '',
      '      if (currentSort.key === key) {',
      "        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';",
      '      } else {',
      '        currentSort.key = key;',
      "        currentSort.direction = 'asc';",
      '      }',
      '',
      '      applySort();',
      '      updateSummary();',
      '    });',
      '  });',
      '',
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-preview-filter]'), function(control) {",
      "    var defaultValue = control.getAttribute('data-default-value') || '';",
      "    if (defaultValue) {",
      "      control.value = defaultValue;",
      '    }',
      "    control.addEventListener('change', applyFilters);",
      '  });',
      '',
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-period-toolbar]'), initPeriodToolbar);",
      '',
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-preview-tab]'), function(button) {",
      "    button.addEventListener('click', function() {",
      "      var tableRef = button.getAttribute('data-table-ref') || '';",
      "      Array.prototype.forEach.call(document.querySelectorAll('[data-preview-tab]'), function(tabButton) {",
      "        tabButton.classList.toggle('is-active', tabButton === button);",
      '      });',
      '      activateTablePanel(tableRef);',
      "      currentSort = { key: '', direction: '' };",
      '      applyFilters();',
      '    });',
      '  });',
      '',
      "  var initialTab = document.querySelector('[data-preview-tab].is-active') || document.querySelector('[data-preview-tab]');",
      '  if (initialTab) {',
      "    activateTablePanel(initialTab.getAttribute('data-table-ref') || '');",
      '  } else {',
      "    activateTablePanel('');",
      '  }',
      '',
      '  updateSortIndicators();',
      '  applyFilters();',
      '})();',
      '</script>'
    ].join('\n');
  }

  function getFilterKeyFromField(fieldName) {
    return String(fieldName || '')
      .replace(/_title$/, '')
      .replace(/[^A-Za-zА-Яа-я0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'filter';
  }

  function inferFilterTypeFromField(field) {
    if (field && (field.type === 'number' || field.type === 'date' || field.type === 'datetime')) {
      return 'select';
    }

    return 'select';
  }

  function getFieldMeta(schema, fieldName) {
    var options = getResultFieldOptions(schema);
    var match = options.find(function(option) {
      return option.value === fieldName;
    });

    return match || {
      value: fieldName,
      title: fieldName,
      type: 'string'
    };
  }

  function createFilterFromField(fieldMeta) {
    var valueField = fieldMeta.value || 'field';
    var key = getFilterKeyFromField(valueField);
    var type = inferFilterTypeFromField(fieldMeta);

    return {
      key: key,
      title: fieldMeta.title || key,
      type: type,
      multiple: type === 'multi-select',
      uiPlacement: 'settings-panel',
      source: {
        kind: 'derived',
        fromDatasource: currentDatasourceId || 'main',
        valueField: valueField,
        titleField: valueField
      },
      bind: {
        mode: 'client'
      }
    };
  }

  function ensureOrderFilter(schema) {
    ensureSchemaShape();

    var options = getResultFieldOptions(schema);
    var hasOrderId = options.some(function(option) {
      return option.value === 'номер_заказа';
    });
    var hasOrderTitle = options.some(function(option) {
      return option.value === 'номер_заказа_title';
    });

    if (!hasOrderId) {
      return false;
    }

    var existing = currentSchema.filters.find(function(filter) {
      var source = filter.source || {};
      return filter.key === 'orderId' || source.valueField === 'номер_заказа';
    });
    var orderFilter = existing || {
      key: 'orderId',
      title: 'Номер заказа',
      type: 'select',
      multiple: false,
      uiPlacement: 'settings-panel',
      source: {},
      bind: {
        mode: 'runtime-only'
      }
    };

    orderFilter.key = 'orderId';
    orderFilter.title = 'Номер заказа';
    orderFilter.type = 'select';
    orderFilter.multiple = false;
    orderFilter.uiPlacement = 'settings-panel';
    orderFilter.source = orderFilter.source || {};
    orderFilter.source.kind = orderFilter.source.kind || 'derived';
    orderFilter.source.fromDatasource = orderFilter.source.fromDatasource || currentDatasourceId || 'main';
    orderFilter.source.valueField = 'номер_заказа';
    orderFilter.source.titleField = hasOrderTitle ? 'номер_заказа_title' : 'номер_заказа';
    orderFilter.bind = orderFilter.bind || { mode: 'runtime-only' };
    orderFilter.bind.mode = orderFilter.bind.mode || 'runtime-only';
    orderFilter.bind.placeholder = orderFilter.bind.placeholder || '&orderId';

    if (!existing) {
      currentSchema.filters.push(orderFilter);
    }

    return true;
  }

  function ensureSimpleFilter(schema, config) {
    ensureSchemaShape();

    var options = getResultFieldOptions(schema);
    var hasField = options.some(function(option) {
      return option.value === config.valueField;
    });

    if (!hasField) {
      return false;
    }

    var existing = currentSchema.filters.find(function(filter) {
      var source = filter.source || {};
      return filter.key === config.key || source.valueField === config.valueField;
    });
    var nextFilter = existing || {
      key: config.key,
      title: config.title,
      type: config.type || 'select',
      multiple: !!config.multiple,
      uiPlacement: 'settings-panel',
      source: {},
      bind: {
        mode: 'runtime-only'
      }
    };

    nextFilter.key = config.key;
    nextFilter.title = config.title;
    nextFilter.type = config.type || 'select';
    nextFilter.multiple = !!config.multiple;
    nextFilter.uiPlacement = 'settings-panel';
    nextFilter.source = nextFilter.source || {};
    nextFilter.source.kind = nextFilter.source.kind || 'derived';
    nextFilter.source.fromDatasource = nextFilter.source.fromDatasource || currentDatasourceId || 'main';
    nextFilter.source.valueField = config.valueField;
    nextFilter.source.titleField = config.titleField || config.valueField;
    nextFilter.bind = nextFilter.bind || { mode: 'client' };
    nextFilter.bind.mode = nextFilter.bind.mode || 'client';

    if (!existing) {
      currentSchema.filters.push(nextFilter);
    }

    return true;
  }

  function ensureImportedDataFilters(schema) {
    var added = [];

    if (ensureOrderFilter(schema)) {
      added.push('Номер заказа');
    }
    if (ensureSimpleFilter(schema, {
      key: 'budgetitem',
      title: 'Статья',
      valueField: 'budgetitem_title'
    })) {
      added.push('Статья');
    }
    if (ensureSimpleFilter(schema, {
      key: 'template',
      title: 'Тип операции',
      valueField: 'template_title'
    })) {
      added.push('Тип операции');
    }

    return added;
  }

  function ensureImportedDataColumns(schema) {
    ensureSchemaShape();

    var table = getActiveTable(schema);
    var options = getResultFieldOptions(schema);
    var fieldMap = options.reduce(function(map, option) {
      map[option.value] = option;
      return map;
    }, {});
    var preferredFields = [
      'period',
      'registrator_title',
      'budgetitem_title',
      'номер_заказа',
      'комментарий',
      'коммент_директор',
      'amount'
    ];
    var columns = preferredFields.filter(function(fieldName) {
      return !!fieldMap[fieldName];
    }).map(function(fieldName) {
      var column = createColumnFromField(fieldMap[fieldName]);

      if (fieldName === 'period') {
        column.title = 'Дата';
        column.type = 'date';
      }
      if (fieldName === 'amount') {
        column.title = 'Сумма';
        column.type = 'number';
      }
      if (fieldName === 'номер_заказа') {
        column.title = 'Номер заказа';
        column.lookup = {
          field: 'номер_заказа',
          titleField: 'номер_заказа_title'
        };
      }

      column.sortable = fieldName === 'period' || fieldName === 'amount';
      return column;
    });

    if (!columns.length) {
      return 0;
    }

    table.columns = columns;
    return columns.length;
  }

  function createColumnFromField(fieldMeta) {
    var type = fieldMeta.type || 'text';

    return {
      key: fieldMeta.value || 'field',
      title: fieldMeta.title || fieldMeta.value || 'Колонка',
      type: type === 'datetime' ? 'date' : type
    };
  }

  function createFilterFromDefaults() {
    var options = getResultFieldOptions(currentSchema || {});
    var usedFields = getArray((currentSchema || {}).filters).reduce(function(map, filter) {
      var source = filter.source || {};
      if (source.valueField) {
        map[source.valueField] = true;
      }
      return map;
    }, {});
    var preferred = options.find(function(option) {
      return !usedFields[option.value] && option.type !== 'number' && option.type !== 'datetime' && option.type !== 'date';
    }) || options.find(function(option) {
      return !usedFields[option.value];
    }) || options[0] || {
      value: 'filter',
      title: 'Фильтр',
      type: 'string'
    };

    return createFilterFromField(preferred);
  }

  function getResultFieldOptions(schema) {
    var table = getActiveTable(schema);
    return getFieldOptionsForTable(schema, table);
  }

  function getFieldOptionsForTable(schema, table) {
    var mainDatasource = getDatasourceById(schema, table.source || currentDatasourceId || 'main');
    var resultSchema = getArray(mainDatasource.resultSchema);
    var tableColumns = getArray(table.columns);
    var fieldsMap = {};

    resultSchema.forEach(function(field) {
      if (field.field) {
        fieldsMap[field.field] = {
          value: field.field,
          title: field.title || field.field,
          type: field.type || 'string'
        };
      }
    });

    tableColumns.forEach(function(column) {
      if (column.key) {
        fieldsMap[column.key] = {
          value: column.key,
          title: column.title || column.key,
          type: column.type || fieldsMap[column.key] && fieldsMap[column.key].type || 'string'
        };
      }
    });

    return Object.keys(fieldsMap).map(function(key) {
      return fieldsMap[key];
    });
  }

  function renderFieldOptions(schema, selectedValue) {
    return getResultFieldOptions(schema).map(function(option) {
      var selected = option.value === selectedValue ? ' selected' : '';
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.title) + '</option>';
    }).join('');
  }

  function renderTableFieldOptions(schema, table, selectedValue, onlyNumber) {
    return getFieldOptionsForTable(schema, table).filter(function(option) {
      return !onlyNumber || option.type === 'number' || option.type === 'integer';
    }).map(function(option) {
      var selected = option.value === selectedValue ? ' selected' : '';
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.title) + '</option>';
    }).join('');
  }

  function renderResultFieldTypeOptions(selectedType) {
    var types = ['string', 'integer', 'number', 'date', 'datetime', 'boolean'];
    var value = selectedType || 'string';

    return types.map(function(type) {
      return '<option value="' + type + '"' + (type === value ? ' selected' : '') + '>' + type + '</option>';
    }).join('');
  }

  function renderResultSchemaEditor(schema) {
    var mainDatasource = getActiveDatasource(schema);
    var resultSchema = getArray(mainDatasource.resultSchema);

    if (!resultSchema.length) {
      resultSchemaEditor.innerHTML = '<p class="empty-note">Полей источника пока нет.</p>';
      return;
    }

    resultSchemaEditor.innerHTML = resultSchema.map(function(field, index) {
      return [
        '<div class="result-field-editor-row" data-result-field-index="' + index + '">',
        '  <label class="field">',
        '    <span>Field</span>',
        '    <input data-result-field-prop="field" type="text" value="' + escapeHtml(field.field || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input data-result-field-prop="title" type="text" value="' + escapeHtml(field.title || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Тип</span>',
        '    <select data-result-field-prop="type">',
        renderResultFieldTypeOptions(field.type),
        '    </select>',
        '  </label>',
        '  <div class="move-controls">',
        '    <button class="move-btn" type="button" data-result-field-move="' + index + '" data-direction="-1"' + (index === 0 ? ' disabled' : '') + ' title="Переместить выше">↑</button>',
        '    <button class="move-btn" type="button" data-result-field-move="' + index + '" data-direction="1"' + (index === resultSchema.length - 1 ? ' disabled' : '') + ' title="Переместить ниже">↓</button>',
        '  </div>',
        '  <button class="icon-btn" type="button" data-result-field-remove="' + index + '" title="Удалить поле">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function getBranchWhen(branch) {
    return branch.when || {};
  }

  function renderDatasourceBranchesEditor(schema) {
    var mainDatasource = getActiveDatasource(schema);
    var branches = getArray(mainDatasource.branches);

    if (!branches.length) {
      datasourceBranchesEditor.innerHTML = '<p class="empty-note">Веток datasource пока нет. Будет использоваться основной Datasource query.</p>';
      return;
    }

    datasourceBranchesEditor.innerHTML = branches.map(function(branch, index) {
      var condition = getBranchWhen(branch);
      var isElse = !!condition.else;

      return [
        '<div class="datasource-branch-editor-row" data-datasource-branch-index="' + index + '">',
        '  <label class="field">',
        '    <span>ID</span>',
        '    <input type="text" value="' + escapeHtml(branch.id || '') + '" data-datasource-branch-prop="id">',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input type="text" value="' + escapeHtml(branch.title || '') + '" data-datasource-branch-prop="title">',
        '  </label>',
        '  <label class="field">',
        '    <span>Поле</span>',
        '    <input type="text" value="' + escapeHtml(condition.field || '') + '" data-datasource-branch-prop="field"' + (isElse ? ' disabled' : '') + '>',
        '  </label>',
        '  <label class="field">',
        '    <span>Оператор</span>',
        '    <select data-datasource-branch-prop="operator"' + (isElse ? ' disabled' : '') + '>',
        ['=', '!=', '>', '>=', '<', '<='].map(function(operator) {
          var selected = (condition.operator || '=') === operator ? ' selected' : '';
          return '      <option value="' + escapeHtml(operator) + '"' + selected + '>' + escapeHtml(operator) + '</option>';
        }).join(''),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Значение</span>',
        '    <input type="text" value="' + escapeHtml(condition.value == null ? '' : condition.value) + '" data-datasource-branch-prop="value"' + (isElse ? ' disabled' : '') + '>',
        '  </label>',
        '  <label class="field checkbox-field compact-checkbox">',
        '    <input type="checkbox" data-datasource-branch-prop="else"' + (isElse ? ' checked' : '') + '>',
        '    <span>else</span>',
        '  </label>',
        '  <label class="field datasource-branch-query">',
        '    <span>Query</span>',
        '    <textarea rows="5" data-datasource-branch-prop="query">' + escapeHtml(branch.query || '') + '</textarea>',
        '  </label>',
        '  <button type="button" class="icon-btn" data-datasource-branch-remove="' + index + '" title="Удалить ветку">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function renderDatasourceParameterTypeOptions(selectedType) {
    var value = selectedType || 'string';
    return ['string', 'integer', 'number', 'datetime', 'boolean'].map(function(type) {
      return '<option value="' + type + '"' + (type === value ? ' selected' : '') + '>' + type + '</option>';
    }).join('');
  }

  function renderDatasourceParameterSourceOptions(selectedSource) {
    var value = selectedSource || 'manual';
    var options = [
      { value: 'manual', title: 'manual' },
      { value: 'period.start', title: 'period.start' },
      { value: 'period.finish', title: 'period.finish' }
    ];

    getArray((currentSchema || {}).filters).forEach(function(filter) {
      if (filter.key) {
        options.push({
          value: 'filters.' + filter.key,
          title: 'filters.' + filter.key
        });
      }
    });

    return options.map(function(option) {
      return '<option value="' + escapeHtml(option.value) + '"' + (option.value === value ? ' selected' : '') + '>' + escapeHtml(option.title) + '</option>';
    }).join('');
  }

  function renderDatasourceParametersEditor(schema) {
    var datasource = getActiveDatasource(schema);
    var parameters = getArray(datasource.parameters);

    if (!parameters.length) {
      datasourceParametersEditor.innerHTML = '<p class="empty-note">Параметров datasource пока нет.</p>';
      return;
    }

    datasourceParametersEditor.innerHTML = parameters.map(function(parameter, index) {
      return [
        '<div class="datasource-parameter-editor-row" data-datasource-parameter-index="' + index + '">',
        '  <label class="field">',
        '    <span>Name</span>',
        '    <input data-datasource-parameter-prop="name" type="text" value="' + escapeHtml(parameter.name || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Placeholder</span>',
        '    <input data-datasource-parameter-prop="placeholder" type="text" value="' + escapeHtml(parameter.placeholder || '') + '" placeholder="&parameter">',
        '  </label>',
        '  <label class="field">',
        '    <span>Type</span>',
        '    <select data-datasource-parameter-prop="type">',
        renderDatasourceParameterTypeOptions(parameter.type),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Source</span>',
        '    <select data-datasource-parameter-prop="source">',
        renderDatasourceParameterSourceOptions(parameter.source),
        '    </select>',
        '  </label>',
        '  <label class="field checkbox-field compact-checkbox">',
        '    <input data-datasource-parameter-prop="required" type="checkbox"' + (parameter.required ? ' checked' : '') + '>',
        '    <span>Required</span>',
        '  </label>',
        '  <button class="icon-btn" type="button" data-datasource-parameter-remove="' + index + '" title="Удалить параметр">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function renderFiltersEditor(schema) {
    var filters = getArray(schema.filters);

    if (!filters.length) {
      filtersEditor.innerHTML = '<p class="empty-note">Фильтров пока нет.</p>';
      return;
    }

    filtersEditor.innerHTML = filters.map(function(filter, index) {
      var source = filter.source || {};
      var bind = filter.bind || {};
      var fieldValue = source.valueField || filter.key || '';
      var titleFieldValue = source.titleField || fieldValue;
      var isMulti = filter.type === 'multi-select' || filter.multiple;
      var bindMode = bind.placeholder ? 'datasource' : 'client';

      return [
        '<div class="filter-editor-row" data-filter-index="' + index + '">',
        '  <label class="field">',
        '    <span>Key</span>',
        '    <input data-filter-prop="key" type="text" value="' + escapeHtml(filter.key || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input data-filter-prop="title" type="text" value="' + escapeHtml(filter.title || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Вид</span>',
        '    <select data-filter-prop="type">',
        '      <option value="select"' + (!isMulti ? ' selected' : '') + '>select</option>',
        '      <option value="multi-select"' + (isMulti ? ' selected' : '') + '>multi-select</option>',
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Поле данных</span>',
        '    <select data-filter-prop="valueField">',
        renderFieldOptions(schema, fieldValue),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Title field</span>',
        '    <select data-filter-prop="titleField">',
        renderFieldOptions(schema, titleFieldValue),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Filter mode</span>',
        '    <select data-filter-prop="bindMode">',
        '      <option value="client"' + (bindMode === 'client' ? ' selected' : '') + '>client</option>',
        '      <option value="datasource"' + (bindMode === 'datasource' ? ' selected' : '') + '>datasource parameter</option>',
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Placeholder</span>',
        '    <input data-filter-prop="placeholder" type="text" value="' + escapeHtml(bind.placeholder || '') + '" placeholder="&parameter">',
        '  </label>',
        '  <button class="icon-btn" type="button" data-filter-remove="' + index + '" title="Удалить фильтр">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function renderTableRefOptions(schema, selectedValue) {
    return getArray(schema.tables).map(function(table) {
      var value = table.id || 'table';
      var selected = value === selectedValue ? ' selected' : '';
      var title = table.title ? value + ' · ' + table.title : value;
      return '<option value="' + escapeHtml(value) + '"' + selected + '>' + escapeHtml(title) + '</option>';
    }).join('');
  }

  function renderDatasourceRefOptions(schema, selectedValue) {
    return getDatasourceIds(schema).map(function(id) {
      var datasource = schema.datasources[id] || {};
      var selected = id === selectedValue ? ' selected' : '';
      var title = datasource.title ? id + ' · ' + datasource.title : id;
      return '<option value="' + escapeHtml(id) + '"' + selected + '>' + escapeHtml(title) + '</option>';
    }).join('');
  }

  function renderTablesEditor(schema) {
    var tables = getArray(schema.tables);

    if (!tables.length) {
      tablesEditor.innerHTML = '<p class="empty-note">Таблиц пока нет.</p>';
      return;
    }

    tablesEditor.innerHTML = tables.map(function(table, index) {
      var isActive = table.id === currentTableId;
      var transform = table.transform || {};
      var aggregation = getArray(transform.aggregations)[0] || {};
      var transformKind = transform.kind || 'none';
      var groupByField = getArray(transform.groupBy)[0] || '';
      var groupByTitle = transform.groupTitle || (getResultFieldByName(schema, table, groupByField).title || titleFromFieldName(groupByField));
      var aggregationField = aggregation.field || '';
      var aggregationAs = aggregation.as || aggregation.field || '';
      var aggregationTitle = aggregation.title || (getResultFieldByName(schema, table, aggregationField).title || titleFromFieldName(aggregationAs));

      return [
        '<div class="table-editor-row' + (isActive ? ' is-active' : '') + '" data-table-index="' + index + '">',
        '  <label class="field">',
        '    <span>Table ID</span>',
        '    <input data-table-prop="id" type="text" value="' + escapeHtml(table.id || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input data-table-prop="title" type="text" value="' + escapeHtml(table.title || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Datasource</span>',
        '    <select data-table-prop="source">',
        renderDatasourceRefOptions(schema, table.source || currentDatasourceId || 'main'),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Transform</span>',
        '    <select data-table-prop="transformKind">',
        '      <option value="none"' + (transformKind !== 'group-by' ? ' selected' : '') + '>none</option>',
        '      <option value="group-by"' + (transformKind === 'group-by' ? ' selected' : '') + '>group-by</option>',
        '    </select>',
        '  </label>',
        transformKind === 'group-by' ? [
          '  <label class="field">',
          '    <span>Group by field</span>',
          '    <select data-table-prop="transformGroupBy">',
          renderTableFieldOptions(schema, table, groupByField, false),
          '    </select>',
          '  </label>',
          '  <label class="field">',
          '    <span>Group title</span>',
          '    <input data-table-prop="transformGroupTitle" type="text" value="' + escapeHtml(groupByTitle || '') + '">',
          '  </label>',
          '  <label class="field">',
          '    <span>Aggregation field</span>',
          '    <select data-table-prop="transformAggregationField">',
          renderTableFieldOptions(schema, table, aggregationField, true),
          '    </select>',
          '  </label>',
          '  <label class="field">',
          '    <span>Operation</span>',
          '    <select data-table-prop="transformAggregationOp">',
          '      <option value="sum"' + ((aggregation.op || 'sum') === 'sum' ? ' selected' : '') + '>sum</option>',
          '    </select>',
          '  </label>',
          '  <label class="field">',
          '    <span>Output field</span>',
          '    <input data-table-prop="transformAggregationAs" type="text" value="' + escapeHtml(aggregationAs) + '">',
          '  </label>',
          '  <label class="field">',
          '    <span>Output title</span>',
          '    <input data-table-prop="transformAggregationTitle" type="text" value="' + escapeHtml(aggregationTitle || '') + '">',
          '  </label>'
        ].join('\n') : '',
        '  <button class="row-action-btn" type="button" data-table-select="' + index + '">' + (isActive ? 'Редактируется' : 'Редактировать') + '</button>',
        '  <button class="icon-btn" type="button" data-table-remove="' + index + '" title="Удалить таблицу">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function getResultFieldByName(schema, table, fieldName) {
    return getFieldOptionsForTable(schema, table).find(function(option) {
      return option.value === fieldName;
    }) || {};
  }

  function syncGroupByTableColumns(schema, table) {
    var transform = table && table.transform;
    if (!transform || transform.kind !== 'group-by') {
      return;
    }

    var groupByField = getArray(transform.groupBy).filter(Boolean)[0] || '';
    var aggregation = getArray(transform.aggregations)[0] || {};
    var aggregationField = aggregation.as || aggregation.field || '';
    var columns = [];

    if (groupByField) {
      var groupField = getResultFieldByName(schema, table, groupByField);
      columns.push({
        key: groupByField,
        title: transform.groupTitle || groupField.title || titleFromFieldName(groupByField),
        type: groupField.type || 'string'
      });
    }

    if (aggregationField) {
      var sourceField = getResultFieldByName(schema, table, aggregation.field);
      columns.push({
        key: aggregationField,
        title: aggregation.title || (aggregationField === aggregation.field
          ? (sourceField.title || titleFromFieldName(aggregationField))
          : titleFromFieldName(aggregationField)),
        type: sourceField.type === 'integer' ? 'integer' : 'number'
      });
    }

    table.columns = columns;
  }

  function renderDataPlan(schema) {
    var tables = getArray(schema.tables);

    if (!tables.length) {
      dataPlanView.innerHTML = '<p class="empty-note">Таблиц пока нет.</p>';
      return;
    }

    dataPlanView.innerHTML = tables.map(function(table) {
      var datasourceId = table.source || currentDatasourceId || 'main';
      var datasource = (schema.datasources || {})[datasourceId] || {};
      var branches = getArray(datasource.branches);
      var rows = getMockRows(schema, datasourceId);
      var branchLabel = branches.length
        ? branches.map(function(branch) { return branch.id || branch.title || 'branch'; }).join(', ')
        : 'default query';

      return [
        '<div class="data-plan-row">',
        '  <div><strong>' + escapeHtml(table.id || 'table') + '</strong><span>' + escapeHtml(table.title || 'Без названия') + '</span></div>',
        '  <div><strong>' + escapeHtml(datasourceId) + '</strong><span>' + escapeHtml(datasource.title || 'Источник без названия') + '</span></div>',
        '  <div><strong>' + branches.length + '</strong><span>' + escapeHtml(branchLabel) + '</span></div>',
        '  <div><strong>' + rows.length + '</strong><span>mock rows</span></div>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function renderTabsEditor(schema) {
    var tabs = getArray(schema.tabs);

    if (!tabs.length) {
      tabsEditor.innerHTML = '<p class="empty-note">Вкладок пока нет.</p>';
      return;
    }

    tabsEditor.innerHTML = tabs.map(function(tab, index) {
      return [
        '<div class="tab-editor-row" data-tab-index="' + index + '">',
        '  <label class="field">',
        '    <span>Key</span>',
        '    <input data-tab-prop="key" type="text" value="' + escapeHtml(tab.key || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input data-tab-prop="title" type="text" value="' + escapeHtml(tab.title || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Table ref</span>',
        '    <select data-tab-prop="tableRef">',
        renderTableRefOptions(schema, tab.tableRef || ''),
        '    </select>',
        '  </label>',
        '  <div class="move-controls" aria-label="Move tab">',
        '    <button class="move-btn" type="button" data-tab-move="' + index + '" data-direction="-1" ' + (index === 0 ? 'disabled' : '') + '>&uarr;</button>',
        '    <button class="move-btn" type="button" data-tab-move="' + index + '" data-direction="1" ' + (index === tabs.length - 1 ? 'disabled' : '') + '>&darr;</button>',
        '  </div>',
        '  <button class="icon-btn" type="button" data-tab-remove="' + index + '" title="Удалить вкладку">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function renderColumnsEditor(schema) {
    var table = getActiveTable(schema);
    var columns = getArray(table.columns);
    var transform = table.transform || {};

    updateColumnAddState(schema);

    if (transform.kind === 'group-by') {
      columnsEditor.innerHTML = [
        '<p class="empty-note">Колонки этой таблицы формируются автоматически из transform group-by. Изменяйте Group by field, Aggregation field и Output field в блоке Tables.</p>',
        columns.length ? '<div class="column-derived-list">' + columns.map(function(column) {
          return '<span class="derived-chip">' + escapeHtml(column.title || column.key || 'column') + ' <code>' + escapeHtml(column.key || '') + '</code></span>';
        }).join('') + '</div>' : ''
      ].join('');
      return;
    }

    if (!columns.length) {
      columnsEditor.innerHTML = '<p class="empty-note">Колонок пока нет.</p>';
      return;
    }

    columnsEditor.innerHTML = columns.map(function(column, index) {
      var fieldValue = column.key || '';

      return [
        '<div class="column-editor-row" data-column-index="' + index + '">',
        '  <label class="field">',
        '    <span>Поле данных</span>',
        '    <select data-column-prop="key">',
        renderFieldOptions(schema, fieldValue),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input data-column-prop="title" type="text" value="' + escapeHtml(column.title || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Тип</span>',
        '    <select data-column-prop="type">',
        '      <option value="text"' + ((column.type || 'text') === 'text' ? ' selected' : '') + '>text</option>',
        '      <option value="date"' + (column.type === 'date' ? ' selected' : '') + '>date</option>',
        '      <option value="integer"' + (column.type === 'integer' ? ' selected' : '') + '>integer</option>',
        '      <option value="number"' + (column.type === 'number' ? ' selected' : '') + '>number</option>',
        '      <option value="editable-text"' + (column.type === 'editable-text' ? ' selected' : '') + '>editable-text</option>',
        '    </select>',
        '  </label>',
        '  <label class="field checkbox-field compact-checkbox">',
        '    <input data-column-prop="sortable" type="checkbox"' + (column.sortable ? ' checked' : '') + '>',
        '    <span>Sortable</span>',
        '  </label>',
        '  <div class="move-controls">',
        '    <button class="move-btn" type="button" data-column-move="' + index + '" data-direction="-1"' + (index === 0 ? ' disabled' : '') + ' title="Переместить выше">↑</button>',
        '    <button class="move-btn" type="button" data-column-move="' + index + '" data-direction="1"' + (index === columns.length - 1 ? ' disabled' : '') + ' title="Переместить ниже">↓</button>',
        '  </div>',
        '  <button class="icon-btn" type="button" data-column-remove="' + index + '" title="Удалить колонку">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function renderSummaryFieldOptions(schema, selectedValue) {
    return getResultFieldOptions(schema).filter(function(option) {
      return option.type === 'number';
    }).map(function(option) {
      var selected = option.value === selectedValue ? ' selected' : '';
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.title) + '</option>';
    }).join('');
  }

  function renderSummaryCardsEditor(schema) {
    var cards = getArray(schema.summaryCards);

    if (!cards.length) {
      summaryCardsEditor.innerHTML = '<p class="empty-note">Итоговых карточек пока нет.</p>';
      return;
    }

    summaryCardsEditor.innerHTML = cards.map(function(card, index) {
      var value = card.value || {};
      var kind = value.kind || 'row-count';
      var field = value.field || '';

      return [
        '<div class="summary-card-editor-row" data-summary-card-index="' + index + '">',
        '  <label class="field">',
        '    <span>Key</span>',
        '    <input data-summary-card-prop="key" type="text" value="' + escapeHtml(card.key || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Название</span>',
        '    <input data-summary-card-prop="title" type="text" value="' + escapeHtml(card.title || '') + '">',
        '  </label>',
        '  <label class="field">',
        '    <span>Расчёт</span>',
        '    <select data-summary-card-prop="kind">',
        '      <option value="row-count"' + (kind === 'row-count' ? ' selected' : '') + '>row-count</option>',
        '      <option value="sum"' + (kind === 'sum' ? ' selected' : '') + '>sum</option>',
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Поле</span>',
        '    <select data-summary-card-prop="field">',
        renderSummaryFieldOptions(schema, field),
        '    </select>',
        '  </label>',
        '  <label class="field">',
        '    <span>Подпись</span>',
        '    <input data-summary-card-prop="subtitle" type="text" value="' + escapeHtml(card.subtitle || '') + '">',
        '  </label>',
        '  <div class="move-controls">',
        '    <button class="move-btn" type="button" data-summary-card-move="' + index + '" data-direction="-1"' + (index === 0 ? ' disabled' : '') + ' title="Переместить выше">↑</button>',
        '    <button class="move-btn" type="button" data-summary-card-move="' + index + '" data-direction="1"' + (index === cards.length - 1 ? ' disabled' : '') + ' title="Переместить ниже">↓</button>',
        '  </div>',
        '  <button class="icon-btn" type="button" data-summary-card-remove="' + index + '" title="Удалить карточку">×</button>',
        '</div>'
      ].join('\n');
    }).join('\n');
  }

  function getAvailableColumnFields(schema) {
    var table = getActiveTable(schema);
    var existing = getArray(table.columns).reduce(function(map, column) {
      if (column.key) {
        map[column.key] = true;
      }
      return map;
    }, {});

    return getResultFieldOptions(schema).filter(function(option) {
      return !existing[option.value];
    });
  }

  function updateColumnAddState(schema) {
    var available = getAvailableColumnFields(schema);
    var hasAvailable = available.length > 0;

    addColumnButton.disabled = !hasAvailable;
    addColumnButton.title = hasAvailable
      ? 'Добавить следующую колонку из resultSchema'
      : 'Все поля resultSchema уже добавлены в таблицу';
  }

  function buildPreviewDocument(schema) {
    var docTitle = escapeHtml(schema.reportTitle || 'Образец отчёта');
    var html = buildIndexArtifact(schema, { includeMockRows: true });
    var css = buildCssArtifact(schema);
    var runtime = buildPreviewRuntimeScript();

    return [
      '<!doctype html>',
      '<html lang="ru">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>' + docTitle + '</title>',
      '  <style>' + css + '</style>',
      '</head>',
      '<body>',
      html,
      runtime,
      '</body>',
      '</html>'
    ].join('\n');
  }

  function buildGeneratedPreviewDocument(schema) {
    var docTitle = escapeHtml(schema.reportTitle || 'Generated preview');
    var html = buildIndexArtifact(schema, { includeMockRows: true });
    var css = buildCssArtifact(schema);
    var runtime = buildScriptArtifact(schema, { includeMockRows: true });

    return [
      '<!doctype html>',
      '<html lang="ru">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>' + docTitle + ' · generated</title>',
      '  <style>' + css + '</style>',
      '</head>',
      '<body>',
      html,
      '<script>window.REPORT_BUILDER_MOCK_MODE = true;</script>',
      '<script>',
      runtime,
      '</script>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  function buildArtifacts(schema) {
    return {
      'index.html': buildIndexArtifact(schema),
      'hc-report.css': buildCssArtifact(schema),
      'script.js': buildScriptArtifact(schema),
      'report.schema.json': JSON.stringify(schema, null, 2)
    };
  }

  function updateArtifactPreview() {
    artifactPreview.textContent = artifacts[currentArtifactName] || '';
    artifactCopyStatus.textContent = '';
  }

  function isArtifactChanged(name) {
    return copiedArtifacts[name] !== artifacts[name];
  }

  function markAllArtifactsAsCopied() {
    copiedArtifacts = Object.keys(artifacts).reduce(function(snapshot, name) {
      snapshot[name] = artifacts[name];
      return snapshot;
    }, {});
  }

  function updateLivePreview(schema) {
    livePreviewFrame.srcdoc = buildPreviewDocument(schema);
  }

  function updateGeneratedPreview(schema) {
    if (generatedPreviewFrame) {
      generatedPreviewFrame.srcdoc = buildGeneratedPreviewDocument(schema);
    }
  }

  function renderArtifactTabs() {
    var buttons = artifactTabs.querySelectorAll('[data-artifact]');
    Array.prototype.forEach.call(buttons, function(button) {
      var artifactName = button.getAttribute('data-artifact');
      button.classList.toggle('is-active', artifactName === currentArtifactName);
      button.classList.toggle('has-changes', isArtifactChanged(artifactName));
    });
  }

  function updateArtifacts(schema) {
    artifacts = buildArtifacts(schema);
    if (!Object.keys(copiedArtifacts).length) {
      markAllArtifactsAsCopied();
    }
    if (!artifacts[currentArtifactName]) {
      currentArtifactName = 'index.html';
    }
    renderArtifactTabs();
    updateArtifactPreview();
    updateLivePreview(schema);
    updateGeneratedPreview(schema);
    renderDataPlan(schema);
  }

  function renderSchema(schema) {
    fillForm(schema);
    initCollapsibleSections();
    updateSummary(schema);
    updateSchemaPreview(schema);
    updateArtifacts(schema);
  }

  function getCollapsibleSections() {
    return Array.prototype.slice.call(document.querySelectorAll('.builder-subsection, .connection-tester'));
  }

  function updateSectionToggle(section) {
    var button = section.querySelector(':scope > .subsection-head [data-section-toggle]');
    if (!button) {
      return;
    }
    var isCollapsed = section.classList.contains('is-collapsed');
    button.textContent = isCollapsed ? '+' : '-';
    button.title = isCollapsed ? 'Показать блок' : 'Скрыть блок';
    button.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }

  function setSectionCollapsed(section, isCollapsed) {
    section.classList.toggle('is-collapsed', !!isCollapsed);
    updateSectionToggle(section);
  }

  function setAllSectionsCollapsed(isCollapsed) {
    getCollapsibleSections().forEach(function(section) {
      setSectionCollapsed(section, isCollapsed);
    });
  }

  function initCollapsibleSections() {
    getCollapsibleSections().forEach(function(section) {
      var head = section.querySelector(':scope > .subsection-head');
      if (!head || head.querySelector('[data-section-toggle]')) {
        updateSectionToggle(section);
        return;
      }

      var actions = head.querySelector(':scope > .subsection-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'subsection-actions';
        Array.prototype.slice.call(head.children).forEach(function(child) {
          if (child.tagName === 'BUTTON') {
            actions.appendChild(child);
          }
        });
        head.appendChild(actions);
      }

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'section-toggle-btn';
      toggle.setAttribute('data-section-toggle', 'true');
      toggle.addEventListener('click', function() {
        setSectionCollapsed(section, !section.classList.contains('is-collapsed'));
      });
      actions.insertBefore(toggle, actions.firstChild);
      updateSectionToggle(section);
    });
  }

  function setCurrentSchema(schema) {
    currentSchema = cloneJson(schema);
    ensureSchemaShape();
    currentDatasourceId = getDatasourceIds(currentSchema)[0] || 'main';
    ensureActiveTable(currentSchema);
    copiedArtifacts = {};
    renderSchema(currentSchema);
    markAllArtifactsAsCopied();
    renderArtifactTabs();
  }

  function ensureSchemaShape() {
    if (!currentSchema.layout) {
      currentSchema.layout = {};
    }
    if (!currentSchema.layout.settingsPanel) {
      currentSchema.layout.settingsPanel = {};
    }
    if (!currentSchema.period) {
      currentSchema.period = {};
    }
    if (!currentSchema.lookups) {
      currentSchema.lookups = {};
    }
    if (!currentSchema.datasources) {
      currentSchema.datasources = {};
    }
    if (!getDatasourceIds(currentSchema).length) {
      currentSchema.datasources.main = {};
    }
    getDatasourceIds(currentSchema).forEach(function(id) {
      normalizeDatasource(currentSchema.datasources[id], id);
    });
    if (!Array.isArray(currentSchema.filters)) {
      currentSchema.filters = [];
    }
    if (!Array.isArray(currentSchema.tabs)) {
      currentSchema.tabs = [];
    }
    if (!Array.isArray(currentSchema.summaryCards)) {
      currentSchema.summaryCards = [];
    }
    if (!Array.isArray(currentSchema.tables)) {
      currentSchema.tables = [];
    }
    if (!currentSchema.tables[0]) {
      currentSchema.tables[0] = {
        id: 'mainTable',
        title: 'Основная таблица',
        kind: 'data-table',
        source: currentDatasourceId || 'main',
        columns: []
      };
    }
    if (!Array.isArray(currentSchema.tables[0].columns)) {
      currentSchema.tables[0].columns = [];
    }
    currentSchema.tables.forEach(function(table) {
      if (!Array.isArray(table.columns)) {
        table.columns = [];
      }
      var transform = table.transform || {};
      if (transform.kind === 'group-by') {
        syncGroupByTableColumns(currentSchema, table);
      }
    });
    ensureActiveTable(currentSchema);
  }

  function applyFormToSchema() {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    currentSchema.reportId = fields.reportId.value.trim();
    currentSchema.reportTitle = fields.reportTitle.value.trim();
    currentSchema.template = fields.template.value.trim();
    currentSchema.description = fields.description.value.trim();
    currentSchema.layout.type = fields.layoutType.value;
    currentSchema.layout.settingsPanel.collapseToSingleColumnAt = toNumber(fields.collapseToSingleColumnAt.value, 1366);
    currentSchema.period.defaultMode = fields.defaultPeriodMode.value;
    currentSchema.period.enabled = fields.periodEnabled ? !!fields.periodEnabled.checked : currentSchema.period.enabled !== false;
    currentSchema.period.allowCustom = !!fields.allowCustom.checked;
    currentSchema.period.allowUnlimited = !!fields.allowUnlimited.checked;
    var datasource = getActiveDatasource(currentSchema);
    var oldDatasourceId = currentDatasourceId;
    var nextDatasourceId = slugify(fields.mainDatasourceId.value.trim(), oldDatasourceId || 'datasource');

    datasource.id = nextDatasourceId;
    datasource.title = fields.mainDatasourceTitle.value.trim();
    datasource.querySource.path = fields.mainDatasourcePath.value.trim();
    datasource.querySource.text = fields.mainDatasourceQuery.value;
    datasource.runtime.endpoint = fields.mainRuntimeEndpoint.value.trim();
    datasource.runtime.method = fields.mainRuntimeMethod.value;
    datasource.runtime.dataPath = fields.mainRuntimeDataPath.value.trim();
    datasource.runtime.bodyTemplate = buildRuntimeBodyTemplate(datasource);

    if (nextDatasourceId !== oldDatasourceId) {
      delete currentSchema.datasources[oldDatasourceId];
      currentSchema.datasources[nextDatasourceId] = datasource;
      currentDatasourceId = nextDatasourceId;
      getArray(currentSchema.tables).forEach(function(table) {
        if (table.source === oldDatasourceId) {
          table.source = nextDatasourceId;
        }
      });
      getArray(currentSchema.filters).forEach(function(filter) {
        if (filter.source && filter.source.fromDatasource === oldDatasourceId) {
          filter.source.fromDatasource = nextDatasourceId;
        }
      });
    }

    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
    fields.filterCount.value = getArray(currentSchema.filters).length;
    fields.tabCount.value = getArray(currentSchema.tabs).length;
    fields.tableCount.value = getArray(currentSchema.tables).length;
    fields.resultFieldCount.value = getArray(getActiveDatasource(currentSchema).resultSchema).length;
  }

  function createDatasourceBranch(index) {
    return {
      id: 'branch' + (index + 1),
      title: 'Ветка ' + (index + 1),
      when: {
        else: true
      },
      query: fields.mainDatasourceQuery.value || ''
    };
  }

  function createDatasourceParameter(index) {
    return {
      name: 'parameter' + (index + 1),
      placeholder: '&parameter' + (index + 1),
      source: 'manual',
      type: 'string',
      required: false
    };
  }

  function updateDatasourceParameterFromEditor(target) {
    var row = target.closest('[data-datasource-parameter-index]');
    var index = row ? toNumber(row.getAttribute('data-datasource-parameter-index'), -1) : -1;
    var prop = target.getAttribute('data-datasource-parameter-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var datasource = getActiveDatasource(currentSchema);
    var parameter = getArray(datasource.parameters)[index];
    if (!parameter) {
      return;
    }

    if (prop === 'required') {
      parameter.required = !!target.checked;
    } else {
      parameter[prop] = target.value.trim();
    }

    if (prop === 'name') {
      renderRuntimeTestParameters(currentSchema);
    }

    updateRuntimeBodyPreview();
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addDatasourceParameter(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    var datasource = getActiveDatasource(currentSchema);
    datasource.parameters = getArray(datasource.parameters);
    datasource.parameters.push(createDatasourceParameter(datasource.parameters.length));
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeDatasourceParameter(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    var datasource = getActiveDatasource(currentSchema);
    datasource.parameters = getArray(datasource.parameters);
    var removed = datasource.parameters.splice(index, 1)[0] || {};
    if (removed.name) {
      delete runtimeTestValues[removed.name];
    }
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function createDatasourceFromDefaults(index) {
    var id = 'datasource_' + (index + 1);
    return normalizeDatasource({
      id: id,
      title: 'Источник ' + (index + 1),
      kind: 'dsl-query',
      querySource: {
        mode: 'file-sync',
        path: 'DS.' + id + '.txt',
        text: ''
      },
      parameters: cloneJson(getArray(getActiveDatasource(currentSchema || {}).parameters)),
      branches: [],
      resultSchema: []
    }, id);
  }

  function addDatasource() {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var index = getDatasourceIds(currentSchema).length;
    var datasource = createDatasourceFromDefaults(index);
    currentSchema.datasources[datasource.id] = datasource;
    currentDatasourceId = datasource.id;
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeDatasource() {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var ids = getDatasourceIds(currentSchema);
    if (ids.length <= 1) {
      return;
    }

    var removedId = currentDatasourceId;
    delete currentSchema.datasources[removedId];
    currentDatasourceId = getDatasourceIds(currentSchema)[0] || 'main';
    getArray(currentSchema.tables).forEach(function(table) {
      if (table.source === removedId) {
        table.source = currentDatasourceId;
      }
    });
    getArray(currentSchema.filters).forEach(function(filter) {
      if (filter.source && filter.source.fromDatasource === removedId) {
        filter.source.fromDatasource = currentDatasourceId;
      }
    });

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function parseBranchExpectedValue(value) {
    var text = String(value == null ? '' : value).trim();
    var numeric = Number(text);

    if (text !== '' && !isNaN(numeric)) {
      return numeric;
    }

    return text;
  }

  function refreshDatasourceBranches() {
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
    renderDatasourceBranchesEditor(currentSchema);
  }

  function updateDatasourceBranchFromEditor(target) {
    var row = target.closest('[data-datasource-branch-index]');
    var index = row ? toNumber(row.getAttribute('data-datasource-branch-index'), -1) : -1;
    var prop = target.getAttribute('data-datasource-branch-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var branch = getActiveDatasource(currentSchema).branches[index];
    if (!branch) {
      return;
    }

    branch.when = branch.when || {};

    if (prop === 'id') {
      branch.id = target.value.trim();
    } else if (prop === 'title') {
      branch.title = target.value.trim();
    } else if (prop === 'query') {
      branch.query = target.value;
    } else if (prop === 'else') {
      if (target.checked) {
        branch.when = { else: true };
      } else {
        branch.when = {
          field: 'orderId',
          operator: '>',
          value: 0
        };
      }
      refreshDatasourceBranches();
      return;
    } else if (prop === 'field') {
      branch.when.field = target.value.trim();
      branch.when.else = false;
    } else if (prop === 'operator') {
      branch.when.operator = target.value;
      branch.when.else = false;
    } else if (prop === 'value') {
      branch.when.value = parseBranchExpectedValue(target.value);
      branch.when.else = false;
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addDatasourceBranch() {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    getActiveDatasource(currentSchema).branches.push(createDatasourceBranch(getActiveDatasource(currentSchema).branches.length));
    refreshDatasourceBranches();
  }

  function removeDatasourceBranch(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    getActiveDatasource(currentSchema).branches.splice(index, 1);
    refreshDatasourceBranches();
  }

  function createResultFieldFromDefaults(index) {
    var nextNumber = index + 1;

    return {
      field: 'field_' + nextNumber,
      title: 'Поле ' + nextNumber,
      type: 'string'
    };
  }

  function refreshDataFieldDependentEditors() {
    renderFiltersEditor(currentSchema);
    renderColumnsEditor(currentSchema);
    renderSummaryCardsEditor(currentSchema);
  }

  function updateResultFieldFromEditor(target, shouldRefreshDependentEditors) {
    if (!currentSchema) {
      return;
    }

    var row = target.closest('[data-result-field-index]');
    var index = row ? toNumber(row.getAttribute('data-result-field-index'), -1) : -1;
    var property = target.getAttribute('data-result-field-prop');

    ensureSchemaShape();

    var field = getActiveDatasource(currentSchema).resultSchema[index];
    if (!field) {
      return;
    }

    field[property] = target.value.trim();

    if (property === 'field' && !field.title) {
      field.title = field.field;
    }

    fields.resultFieldCount.value = getArray(getActiveDatasource(currentSchema).resultSchema).length;

    if (shouldRefreshDependentEditors) {
      refreshDataFieldDependentEditors();
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addResultField() {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    getActiveDatasource(currentSchema).resultSchema.push(createResultFieldFromDefaults(getActiveDatasource(currentSchema).resultSchema.length));
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeResultField(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    getActiveDatasource(currentSchema).resultSchema.splice(index, 1);
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function moveResultField(index, direction) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var resultSchema = getArray(getActiveDatasource(currentSchema).resultSchema);
    var targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || index >= resultSchema.length || targetIndex >= resultSchema.length) {
      return;
    }

    var field = resultSchema[index];
    resultSchema[index] = resultSchema[targetIndex];
    resultSchema[targetIndex] = field;

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function updateFilterFromEditor(target) {
    var row = target.closest('[data-filter-index]');
    var index = row ? toNumber(row.getAttribute('data-filter-index'), -1) : -1;
    var prop = target.getAttribute('data-filter-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var filter = currentSchema.filters[index];
    if (!filter) {
      return;
    }

    if (prop === 'key') {
      filter.key = target.value.trim();
    } else if (prop === 'title') {
      filter.title = target.value.trim();
    } else if (prop === 'type') {
      filter.type = target.value;
      filter.multiple = target.value === 'multi-select';
    } else if (prop === 'valueField') {
      var fieldMeta = getFieldMeta(currentSchema, target.value);
      filter.source = filter.source || {};
      filter.source.kind = filter.source.kind || 'derived';
      filter.source.fromDatasource = filter.source.fromDatasource || currentDatasourceId || 'main';
      filter.source.valueField = target.value;
      filter.source.titleField = filter.source.titleField || target.value;
      filter.key = filter.key || getFilterKeyFromField(target.value);
      filter.title = filter.title || fieldMeta.title || filter.key;
      renderFiltersEditor(currentSchema);
    } else if (prop === 'titleField') {
      filter.source = filter.source || {};
      filter.source.kind = filter.source.kind || 'derived';
      filter.source.fromDatasource = filter.source.fromDatasource || currentDatasourceId || 'main';
      filter.source.titleField = target.value;
    } else if (prop === 'bindMode') {
      filter.bind = filter.bind || {};
      if (target.value === 'datasource') {
        filter.bind.mode = 'runtime-only';
        filter.bind.placeholder = filter.bind.placeholder || ('&' + (filter.key || filter.source && filter.source.valueField || 'filter'));
      } else {
        filter.bind.mode = 'client';
        delete filter.bind.placeholder;
      }
      renderFiltersEditor(currentSchema);
    } else if (prop === 'placeholder') {
      filter.bind = filter.bind || {};
      filter.bind.placeholder = target.value.trim();
      filter.bind.mode = filter.bind.placeholder ? 'runtime-only' : 'client';
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addFilter() {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    currentSchema.filters.push(createFilterFromDefaults());
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function createTabFromDefaults(index) {
    var table = getActiveTable(currentSchema || {});
    var nextNumber = index + 1;

    return {
      key: 'tab_' + nextNumber,
      title: 'Вкладка ' + nextNumber,
      tableRef: table.id || 'table',
      datasourceRef: currentDatasourceId || 'main'
    };
  }

  function updateTabFromEditor(target) {
    var row = target.closest('[data-tab-index]');
    var index = row ? toNumber(row.getAttribute('data-tab-index'), -1) : -1;
    var prop = target.getAttribute('data-tab-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var tab = currentSchema.tabs[index];
    if (!tab) {
      return;
    }

    if (prop === 'key') {
      tab.key = target.value.trim();
    } else if (prop === 'title') {
      tab.title = target.value.trim();
    } else if (prop === 'tableRef') {
      tab.tableRef = target.value;
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addTab(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    currentSchema.tabs.push(createTabFromDefaults(currentSchema.tabs.length));
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeTab(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    currentSchema.tabs.splice(index, 1);
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function moveTab(index, direction) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var tabs = getArray(currentSchema.tabs);
    var targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || index >= tabs.length || targetIndex >= tabs.length) {
      return;
    }

    var tab = tabs[index];
    tabs[index] = tabs[targetIndex];
    tabs[targetIndex] = tab;

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function createTableFromDefaults(index) {
    var nextNumber = index + 1;
    var baseColumns = getArray(getActiveTable(currentSchema || {}).columns).slice(0, 3);

    return {
      id: 'table_' + nextNumber,
      title: 'Таблица ' + nextNumber,
      kind: 'data-table',
      source: currentDatasourceId || 'main',
      scroll: {
        vertical: true,
        horizontal: true,
        stickyHeader: true
      },
      columns: baseColumns.length ? cloneJson(baseColumns) : []
    };
  }

  function updateTabRefs(oldId, newId) {
    getArray(currentSchema.tabs).forEach(function(tab) {
      if (tab.tableRef === oldId) {
        tab.tableRef = newId;
      }
    });
  }

  function updateTableFromEditor(target) {
    var row = target.closest('[data-table-index]');
    var index = row ? toNumber(row.getAttribute('data-table-index'), -1) : -1;
    var prop = target.getAttribute('data-table-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var table = currentSchema.tables[index];
    if (!table) {
      return;
    }

    if (prop === 'id') {
      var oldId = table.id || '';
      var newId = target.value.trim();
      table.id = newId;
      if (currentTableId === oldId) {
        currentTableId = newId;
      }
      updateTabRefs(oldId, newId);
      renderTabsEditor(currentSchema);
      renderTablesEditor(currentSchema);
    } else if (prop === 'title') {
      table.title = target.value.trim();
    } else if (prop === 'source') {
      table.source = target.value;
      renderTablesEditor(currentSchema);
      renderColumnsEditor(currentSchema);
    } else if (prop === 'transformKind') {
      if (target.value === 'group-by') {
        var options = getFieldOptionsForTable(currentSchema, table);
        var firstText = options.find(function(option) { return option.type !== 'number' && option.type !== 'integer'; }) || options[0] || {};
        var firstNumber = options.find(function(option) { return option.type === 'number' || option.type === 'integer'; }) || options[0] || {};
        table.transform = {
          kind: 'group-by',
          groupBy: [firstText.value || ''],
          groupTitle: firstText.title || titleFromFieldName(firstText.value || ''),
          aggregations: [
            {
              field: firstNumber.value || '',
              op: 'sum',
              as: firstNumber.value || '',
              title: firstNumber.title || titleFromFieldName(firstNumber.value || '')
            }
          ]
        };
        syncGroupByTableColumns(currentSchema, table);
      } else {
        delete table.transform;
      }
      renderTablesEditor(currentSchema);
      renderColumnsEditor(currentSchema);
    } else if (prop === 'transformGroupBy') {
      table.transform = table.transform || { kind: 'group-by', groupBy: [], aggregations: [] };
      table.transform.kind = 'group-by';
      table.transform.groupBy = [target.value];
      table.transform.groupTitle = getResultFieldByName(currentSchema, table, target.value).title || titleFromFieldName(target.value);
      syncGroupByTableColumns(currentSchema, table);
      renderColumnsEditor(currentSchema);
    } else if (prop === 'transformGroupTitle') {
      table.transform = table.transform || { kind: 'group-by', groupBy: [], aggregations: [] };
      table.transform.kind = 'group-by';
      table.transform.groupTitle = target.value.trim();
      syncGroupByTableColumns(currentSchema, table);
      renderColumnsEditor(currentSchema);
    } else if (prop === 'transformAggregationField') {
      table.transform = table.transform || { kind: 'group-by', groupBy: [], aggregations: [] };
      table.transform.kind = 'group-by';
      table.transform.aggregations = table.transform.aggregations || [{}];
      table.transform.aggregations[0] = table.transform.aggregations[0] || {};
      table.transform.aggregations[0].field = target.value;
      table.transform.aggregations[0].as = table.transform.aggregations[0].as || target.value;
      table.transform.aggregations[0].title = table.transform.aggregations[0].title || getResultFieldByName(currentSchema, table, target.value).title || titleFromFieldName(target.value);
      syncGroupByTableColumns(currentSchema, table);
      renderColumnsEditor(currentSchema);
    } else if (prop === 'transformAggregationOp') {
      table.transform = table.transform || { kind: 'group-by', groupBy: [], aggregations: [] };
      table.transform.kind = 'group-by';
      table.transform.aggregations = table.transform.aggregations || [{}];
      table.transform.aggregations[0] = table.transform.aggregations[0] || {};
      table.transform.aggregations[0].op = target.value || 'sum';
    } else if (prop === 'transformAggregationAs') {
      table.transform = table.transform || { kind: 'group-by', groupBy: [], aggregations: [] };
      table.transform.kind = 'group-by';
      table.transform.aggregations = table.transform.aggregations || [{}];
      table.transform.aggregations[0] = table.transform.aggregations[0] || {};
      table.transform.aggregations[0].as = target.value.trim();
      syncGroupByTableColumns(currentSchema, table);
      renderColumnsEditor(currentSchema);
    } else if (prop === 'transformAggregationTitle') {
      table.transform = table.transform || { kind: 'group-by', groupBy: [], aggregations: [] };
      table.transform.kind = 'group-by';
      table.transform.aggregations = table.transform.aggregations || [{}];
      table.transform.aggregations[0] = table.transform.aggregations[0] || {};
      table.transform.aggregations[0].title = target.value.trim();
      syncGroupByTableColumns(currentSchema, table);
      renderColumnsEditor(currentSchema);
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addTable(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var table = createTableFromDefaults(currentSchema.tables.length);
    currentSchema.tables.push(table);
    currentTableId = table.id;
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeTable(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    if (currentSchema.tables.length <= 1) {
      return;
    }

    var removed = currentSchema.tables.splice(index, 1)[0] || {};
    var fallback = currentSchema.tables[0] || {};

    getArray(currentSchema.tabs).forEach(function(tab) {
      if (tab.tableRef === removed.id) {
        tab.tableRef = fallback.id || '';
      }
    });

    if (currentTableId === removed.id) {
      currentTableId = fallback.id || '';
    }

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function selectTable(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var table = currentSchema.tables[index];
    if (!table) {
      return;
    }

    currentTableId = table.id || '';
    fillForm(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function updateColumnFromEditor(target) {
    var row = target.closest('[data-column-index]');
    var index = row ? toNumber(row.getAttribute('data-column-index'), -1) : -1;
    var prop = target.getAttribute('data-column-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var table = getActiveTable(currentSchema);
    if ((table.transform || {}).kind === 'group-by') {
      renderColumnsEditor(currentSchema);
      return;
    }
    var column = getArray(table.columns)[index];
    if (!column) {
      return;
    }

    if (prop === 'key') {
      var fieldMeta = getFieldMeta(currentSchema, target.value);
      var updated = createColumnFromField(fieldMeta);
      column.key = updated.key;
      column.title = updated.title;
      column.type = updated.type;
      renderColumnsEditor(currentSchema);
    } else if (prop === 'title') {
      column.title = target.value.trim();
    } else if (prop === 'type') {
      column.type = target.value;
    } else if (prop === 'sortable') {
      column.sortable = !!target.checked;
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addColumn(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    if ((getActiveTable(currentSchema).transform || {}).kind === 'group-by') {
      return;
    }

    var availableFields = getAvailableColumnFields(currentSchema);
    if (!availableFields.length) {
      updateColumnAddState(currentSchema);
      return;
    }
    var preferred = availableFields[0];

    getActiveTable(currentSchema).columns.push(createColumnFromField(preferred));
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);

    var lastRow = columnsEditor.querySelector('[data-column-index]:last-child');
    if (lastRow) {
      lastRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function removeColumn(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    if ((getActiveTable(currentSchema).transform || {}).kind === 'group-by') {
      return;
    }
    getActiveTable(currentSchema).columns.splice(index, 1);
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function moveColumn(index, direction) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    if ((getActiveTable(currentSchema).transform || {}).kind === 'group-by') {
      return;
    }

    var columns = getArray(getActiveTable(currentSchema).columns);
    var targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || index >= columns.length || targetIndex >= columns.length) {
      return;
    }

    var column = columns[index];
    columns[index] = columns[targetIndex];
    columns[targetIndex] = column;

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function getFirstNumericField(schema) {
    return (getResultFieldOptions(schema).find(function(option) {
      return option.type === 'number';
    }) || {}).value || '';
  }

  function createSummaryCardFromDefaults(index) {
    var numericField = getFirstNumericField(currentSchema || {});

    if (index === 0) {
      return {
        key: 'rowCount',
        title: 'Строки',
        value: {
          kind: 'row-count',
          sourceTable: 'expensesTable'
        },
        subtitle: 'Записей на активной вкладке'
      };
    }

    return {
      key: 'sum_' + (numericField || 'value'),
      title: 'Сумма',
      value: {
        kind: 'sum',
        source: 'main',
        field: numericField
      },
      subtitle: 'Сумма по выбранному полю'
    };
  }

  function updateSummaryCardFromEditor(target) {
    var row = target.closest('[data-summary-card-index]');
    var index = row ? toNumber(row.getAttribute('data-summary-card-index'), -1) : -1;
    var prop = target.getAttribute('data-summary-card-prop');

    if (!currentSchema || index < 0 || !prop) {
      return;
    }

    ensureSchemaShape();

    var card = currentSchema.summaryCards[index];
    if (!card) {
      return;
    }
    if (!card.value) {
      card.value = {};
    }

    if (prop === 'key') {
      card.key = target.value.trim();
    } else if (prop === 'title') {
      card.title = target.value.trim();
    } else if (prop === 'subtitle') {
      card.subtitle = target.value.trim();
    } else if (prop === 'kind') {
      card.value.kind = target.value;
      if (target.value === 'sum' && !card.value.field) {
        card.value.source = card.value.source || currentDatasourceId || 'main';
        card.value.field = getFirstNumericField(currentSchema);
      }
      if (target.value === 'row-count') {
        delete card.value.field;
        card.value.sourceTable = card.value.sourceTable || (getActiveTable(currentSchema).id || 'table');
      }
      renderSummaryCardsEditor(currentSchema);
    } else if (prop === 'field') {
      card.value.field = target.value;
      card.value.source = card.value.source || currentDatasourceId || 'main';
    }

    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function addSummaryCard(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    currentSchema.summaryCards.push(createSummaryCardFromDefaults(currentSchema.summaryCards.length));
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeSummaryCard(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    currentSchema.summaryCards.splice(index, 1);
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function moveSummaryCard(index, direction) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();

    var cards = getArray(currentSchema.summaryCards);
    var targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || index >= cards.length || targetIndex >= cards.length) {
      return;
    }

    var card = cards[index];
    cards[index] = cards[targetIndex];
    cards[targetIndex] = card;

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function removeFilter(index) {
    if (!currentSchema) {
      return;
    }

    ensureSchemaShape();
    currentSchema.filters.splice(index, 1);
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);
  }

  function downloadTextFile(filename, content) {
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadSchema() {
    if (!currentSchema) {
      return;
    }

    var filename = slugify(currentSchema.reportId, 'report-schema') + '.schema.json';
    downloadTextFile(filename, JSON.stringify(currentSchema, null, 2));
  }

  function downloadCurrentArtifact() {
    if (!artifacts[currentArtifactName]) {
      return;
    }

    downloadTextFile(currentArtifactName, artifacts[currentArtifactName]);
  }

  function copyTextFallback(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function copyCurrentArtifact() {
    var artifactText = artifacts[currentArtifactName];

    if (!artifactText) {
      artifactCopyStatus.textContent = 'Нечего копировать.';
      return;
    }

    var copyPromise = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(artifactText).catch(function() {
        return copyTextFallback(artifactText);
      })
      : copyTextFallback(artifactText);

    copyPromise
      .then(function() {
        copiedArtifacts[currentArtifactName] = artifactText;
        renderArtifactTabs();
        artifactCopyStatus.textContent = 'Скопировано: ' + currentArtifactName;
      })
      .catch(function(error) {
        artifactCopyStatus.textContent = 'Не удалось скопировать: ' + String(error);
      });
  }

  function openPreviewInNewTab() {
    if (!currentSchema) {
      return;
    }

    var previewHtml = buildPreviewDocument(currentSchema);
    var blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var previewWindow = window.open(url, '_blank', 'noopener');

    if (!previewWindow) {
      downloadTextFile(slugify(currentSchema.reportId, 'report-preview') + '.preview.html', previewHtml);
      URL.revokeObjectURL(url);
      return;
    }

    window.setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 30000);
  }

  function openGeneratedPreviewInNewTab() {
    if (!currentSchema) {
      return;
    }

    applyFormToSchema();

    var previewHtml = buildGeneratedPreviewDocument(currentSchema);
    var blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var previewWindow = window.open(url, '_blank', 'noopener');

    if (!previewWindow) {
      downloadTextFile(slugify(currentSchema.reportId, 'generated-preview') + '.generated-preview.html', previewHtml);
      URL.revokeObjectURL(url);
      return;
    }

    window.setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 30000);
  }

  function buildRuntimeRequestPreview() {
    if (!currentSchema) {
      runtimeRequestStatus.textContent = 'Схема ещё не загружена.';
      return;
    }

    applyFormToSchema();

    var mainDatasource = getActiveDatasource(currentSchema);
    var runtime = mainDatasource.runtime || {};
    var querySource = mainDatasource.querySource || {};
    var baseUrl = fields.testHcBaseUrl.value.trim();
    var runtimeParameters = getRuntimeParameterValues();
    var selectedBranch = resolveDatasourceBranch(mainDatasource, runtimeParameters);
    var expressionTemplate = selectedBranch ? selectedBranch.query : querySource.text || '';
    var expression = renderTemplateExpression(expressionTemplate, runtimeParameters, mainDatasource);
    var body = JSON.stringify(buildRuntimeBodyPayload(runtimeParameters), null, 2);
    var requestPreview = {
      url: joinUrl(baseUrl, runtime.endpoint || ''),
      method: runtime.method || 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      branch: selectedBranch ? selectedBranch.id || selectedBranch.title || 'branch' : 'default query',
      query: expression,
      dataPath: runtime.dataPath || 'data',
      body: maskRuntimeBody(body)
    };

    fields.mainRuntimeBodyTemplate.value = maskRuntimeBody(body);

    runtimeRequestStatus.textContent = [
      'Тестовый запрос собран. На этом шаге он ещё не отправляется.',
      '',
      JSON.stringify(requestPreview, null, 2)
    ].join('\n');
  }

  function renderRuntimeLiteral(value) {
    var text = String(value == null ? '' : value).trim();

    if (!text) {
      return '""';
    }

    if (/^(true|false|null)$/i.test(text) || /^-?\d+(?:\.\d+)?$/.test(text)) {
      return text.toLowerCase();
    }

    return JSON.stringify(text);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(String(value));
    }
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function buildRuntimeBodyPayload(parameters) {
    var payload = {
      token: parameters.token || '',
      parameters: {}
    };

    Object.keys(parameters || {}).forEach(function(key) {
      if (key !== 'token') {
        payload.parameters[key] = parameters[key];
      }
    });

    return payload;
  }

  function buildRuntimeBodyTemplate(datasource) {
    var parameterNames = getArray((datasource || {}).parameters).map(function(parameter) {
      return parameter.name;
    }).filter(Boolean);
    var payload = {
      token: '{{token}}',
      parameters: {}
    };

    parameterNames.forEach(function(name) {
      payload.parameters[name] = '{{' + name + '}}';
    });

    return JSON.stringify(payload, null, 2);
  }

  function updateRuntimeBodyPreview() {
    if (!currentSchema || !fields.mainRuntimeBodyTemplate) {
      return;
    }

    fields.mainRuntimeBodyTemplate.value = maskRuntimeBody(JSON.stringify(buildRuntimeBodyPayload(getRuntimeParameterValues()), null, 2));
  }

  function getRuntimePlaceholderBindings(datasource) {
    var bindings = [];
    var seen = {};

    getArray((datasource || {}).parameters).forEach(function(parameter) {
      if (parameter.placeholder && parameter.name && !seen[parameter.placeholder]) {
        seen[parameter.placeholder] = true;
        bindings.push({
          placeholder: parameter.placeholder,
          parameter: parameter.name,
          required: !!parameter.required
        });
      }
    });

    getArray((currentSchema || {}).filters).forEach(function(filter) {
      var bind = filter.bind || {};
      if (bind.placeholder && filter.key && !seen[bind.placeholder]) {
        seen[bind.placeholder] = true;
        bindings.push({
          placeholder: bind.placeholder,
          parameter: filter.key,
          required: false
        });
      }
    });

    return bindings;
  }

  function getDefaultRuntimeTestValue(parameter) {
    if (runtimeTestValues[parameter.name] != null) {
      return runtimeTestValues[parameter.name];
    }

    if (parameter.source === 'period.start') {
      return '2026-04-25';
    }
    if (parameter.source === 'period.finish') {
      return '2026-04-27';
    }
    if (parameter.type === 'number') {
      return '0';
    }
    if (parameter.type === 'boolean') {
      return 'false';
    }

    return '';
  }

  function getRuntimeInputType(parameter) {
    if (parameter.type === 'number' || parameter.type === 'integer') {
      return 'number';
    }
    if (parameter.type === 'datetime' || parameter.source === 'period.start' || parameter.source === 'period.finish') {
      return 'date';
    }
    return 'text';
  }

  function renderRuntimeTestParameters(schema) {
    var datasource = getActiveDatasource(schema);
    var parameters = getArray(datasource.parameters);

    if (!parameters.length) {
      runtimeTestParameters.innerHTML = '<p class="empty-note">Добавьте datasource parameters, чтобы собрать body тестового запроса.</p>';
      updateRuntimeBodyPreview();
      return;
    }

    runtimeTestParameters.innerHTML = parameters.map(function(parameter) {
      var name = parameter.name || '';
      var value = getDefaultRuntimeTestValue(parameter);
      runtimeTestValues[name] = value;

      return [
        '<label class="field">',
        '  <span>' + escapeHtml(name || 'parameter') + '</span>',
        '  <input data-runtime-param-name="' + escapeHtml(name) + '" type="' + escapeHtml(getRuntimeInputType(parameter)) + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(parameter.placeholder || name) + '">',
        '</label>'
      ].join('\n');
    }).join('\n');
  }

  function coerceRuntimeParameterValue(value, type) {
    var raw = String(value == null ? '' : value).trim();

    if (type === 'integer') {
      var integerValue = Number(raw);
      return raw && !isNaN(integerValue) ? Math.trunc(integerValue) : 0;
    }
    if (type === 'number') {
      var numberValue = Number(raw);
      return raw && !isNaN(numberValue) ? numberValue : 0;
    }
    if (type === 'boolean') {
      return raw === true || raw === 'true' || raw === '1';
    }

    return raw;
  }

  function getRuntimeParameterValues() {
    var datasource = getActiveDatasource(currentSchema || {});
    var values = {
      token: fields.testHcToken.value.trim()
    };

    getArray(datasource.parameters).forEach(function(parameter) {
      if (!parameter.name) {
        return;
      }
      var input = runtimeTestParameters.querySelector('[data-runtime-param-name="' + cssEscape(parameter.name) + '"]');
      var rawValue = input ? input.value : getDefaultRuntimeTestValue(parameter);
      runtimeTestValues[parameter.name] = rawValue;
      values[parameter.name] = coerceRuntimeParameterValue(rawValue, parameter.type || 'string');
    });

    return values;
  }

  function validateRuntimeParameters(parameters) {
    var datasource = getActiveDatasource(currentSchema || {});
    var invalid = getArray(datasource.parameters).find(function(parameter) {
      var value = parameters[parameter.name];
      return parameter.required && (value == null || value === '');
    });

    if (invalid) {
      return 'Заполните обязательный параметр: ' + invalid.name + '.';
    }

    return '';
  }

  function compareBranchValue(actual, operator, expected) {
    var left = Number(actual);
    var right = Number(expected);
    var hasNumericValues = !isNaN(left) && !isNaN(right);

    if (hasNumericValues) {
      if (operator === '>') {
        return left > right;
      }
      if (operator === '>=') {
        return left >= right;
      }
      if (operator === '<') {
        return left < right;
      }
      if (operator === '<=') {
        return left <= right;
      }
    }

    if (operator === '!=') {
      return String(actual) !== String(expected);
    }

    return String(actual) === String(expected);
  }

  function branchMatches(branch, parameters) {
    var condition = branch.when || {};

    if (condition.else) {
      return false;
    }

    return compareBranchValue(parameters[condition.field], condition.operator || '=', condition.value);
  }

  function resolveDatasourceBranch(datasource, parameters) {
    var branches = getArray(datasource.branches);
    var fallback = null;

    for (var i = 0; i < branches.length; ++i) {
      var branch = branches[i];
      if ((branch.when && branch.when.else) || !(branch.when && branch.when.field)) {
        fallback = branch;
      } else if (branchMatches(branch, parameters || {})) {
        return branch;
      }
    }

    return fallback;
  }

  function renderTemplateExpression(template, parameters, datasource) {
    var result = String(template || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, function(match, key) {
      var value = parameters && parameters[key];
      return value == null ? '' : String(value);
    });

    getRuntimePlaceholderBindings(datasource).forEach(function(binding) {
      var value = parameters ? parameters[binding.parameter] : null;
      if (!binding.required && (value == null || value === '' || (Array.isArray(value) && !value.length))) {
        result = result.split('|').filter(function(segment) {
          return segment.indexOf(binding.placeholder) === -1;
        }).join('|').replace(/\s+;/g, ';');
        return;
      }
      result = result.replace(new RegExp(escapeRegExp(binding.placeholder), 'g'), value == null ? '' : String(value));
    });

    return result;
  }

  function normalizeRuntimeBody(body, parameters) {
    var payload = JSON.parse(body || '{}');

    payload.token = parameters.token || '';
    payload.parameters = payload.parameters || {};
    payload.parameters.dateStart = parameters.dateStart || '';
    payload.parameters.dateFinish = parameters.dateFinish || '';
    payload.parameters.orderId = parameters.useOrderFilter ? parameters.orderIdNumber : 0;

    return JSON.stringify(payload);
  }

  function maskRuntimeBody(body) {
    try {
      var payload = JSON.parse(body || '{}');
      if (payload.token) {
        payload.token = '***';
      }
      return JSON.stringify(payload, null, 2);
    } catch (error) {
      return body;
    }
  }

  function renderRuntimeBody(template, expression, parameters) {
    var values = Object.assign({ expression: expression || '' }, parameters || {});
    var body = String(template || '');

    Object.keys(values).forEach(function(key) {
      var quotedPattern = new RegExp('"\\{\\{' + key + '\\}\\}"', 'g');
      var rawPattern = new RegExp('\\{\\{' + key + '\\}\\}', 'g');

      body = body
        .replace(quotedPattern, JSON.stringify(values[key] || ''))
        .replace(rawPattern, renderRuntimeLiteral(values[key]));
    });

    return body;
  }

  function fetchRuntimeData() {
    if (!currentSchema) {
      runtimeRequestStatus.textContent = 'Схема ещё не загружена.';
      return;
    }

    applyFormToSchema();

    var mainDatasource = getActiveDatasource(currentSchema);
    var runtime = mainDatasource.runtime || {};
    var querySource = mainDatasource.querySource || {};
    var url = joinUrl(fields.testHcBaseUrl.value.trim(), runtime.endpoint || '');
    var method = runtime.method || 'POST';
    var runtimeParameters = getRuntimeParameterValues();
    var selectedBranch = resolveDatasourceBranch(mainDatasource, runtimeParameters);
    var expressionTemplate = selectedBranch ? selectedBranch.query : querySource.text || '';
    var expression = renderTemplateExpression(expressionTemplate, runtimeParameters, mainDatasource);
    var validationError = validateRuntimeParameters(runtimeParameters);
    var body = JSON.stringify(buildRuntimeBodyPayload(runtimeParameters));
    var options = {
      method: method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    };

    if (!url) {
      runtimeRequestStatus.textContent = 'Укажите HC Base URL или endpoint runtime-вызова.';
      return;
    }

    if (validationError) {
      runtimeRequestStatus.textContent = validationError;
      return;
    }

    fields.mainRuntimeBodyTemplate.value = maskRuntimeBody(body);

    if (method !== 'GET') {
      options.body = body;
    }

    runtimeRequestStatus.textContent = [
      'Отправляю запрос к HC API...',
      'Ветка datasource: ' + (selectedBranch ? (selectedBranch.id || selectedBranch.title || 'branch') : 'default query'),
      'Параметры: ' + JSON.stringify(JSON.parse(body).parameters),
      '',
      'Query:',
      expression || '-',
      '',
      'Body:',
      maskRuntimeBody(body)
    ].join('\n');

    fetch(url, options)
      .then(function(response) {
        return response.text().then(function(text) {
          if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + text);
          }
          return text;
        });
      })
      .then(function(text) {
        var payload;
        try {
          payload = JSON.parse(text);
        } catch (error) {
          fields.testApiResponseJson.value = text;
          runtimeRequestStatus.textContent = 'Ответ получен, но это не JSON: ' + error.message;
          return;
        }

        fields.testApiResponseJson.value = JSON.stringify(payload, null, 2);
        var rows = readPathValue(payload, runtime.dataPath || 'data');
        var rowsStatus = Array.isArray(rows)
          ? 'По пути "' + (runtime.dataPath || 'data') + '" найдено строк: ' + rows.length + '.'
          : 'По пути "' + (runtime.dataPath || 'data') + '" массив строк не найден.';
        runtimeRequestStatus.textContent = [
          'Ответ API получен и помещён в поле "Ответ API JSON".',
          'Ветка datasource: ' + (selectedBranch ? (selectedBranch.id || selectedBranch.title || 'branch') : 'default query'),
          'Параметры: ' + JSON.stringify(JSON.parse(body).parameters),
          'Query: ' + (expression || '-'),
          rowsStatus,
          'Чтобы обновить mock и resultSchema, нажмите "Сохранить ответ как mock".'
        ].join('\n');
      })
      .catch(function(error) {
        runtimeRequestStatus.textContent = [
          'Не удалось получить данные из HC API.',
          error.message,
          '',
          'Если браузер блокирует запрос CORS, используйте ручную вставку ответа API JSON.'
        ].join('\n');
      });
  }

  function importApiResponseAsMock() {
    if (!currentSchema) {
      runtimeRequestStatus.textContent = 'Схема ещё не загружена.';
      return;
    }

    applyFormToSchema();

    var payload;
    try {
      payload = JSON.parse(fields.testApiResponseJson.value || '');
    } catch (error) {
      runtimeRequestStatus.textContent = 'Не удалось разобрать Ответ API JSON: ' + error.message;
      return;
    }

    var mainDatasource = getActiveDatasource(currentSchema);
    var runtime = mainDatasource.runtime || {};
    var rows = readPathValue(payload, runtime.dataPath || 'data');

    if (!Array.isArray(rows)) {
      runtimeRequestStatus.textContent = 'По пути "' + (runtime.dataPath || 'data') + '" не найден массив строк.';
      return;
    }

    ensureSchemaShape();
    currentSchema.mock = currentSchema.mock || {};
    currentSchema.mock.datasources = currentSchema.mock.datasources || {};
    currentSchema.mock.datasources[currentDatasourceId] = currentSchema.mock.datasources[currentDatasourceId] || {};
    currentSchema.mock.datasources[currentDatasourceId].rows = rows.map(function(row) {
      return Object.assign({}, row || {});
    });
    currentSchema.lookups = buildLookupsFromRows(getMockRows(currentSchema, currentDatasourceId));
    getActiveDatasource(currentSchema).resultSchema = inferResultSchemaFromRows(getMockRows(currentSchema, currentDatasourceId));
    var importedFilters = ensureImportedDataFilters(currentSchema);
    var importedColumnCount = ensureImportedDataColumns(currentSchema);
    var orderDiagnostics = getOrderImportDiagnostics(currentSchema);

    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateSchemaPreview(currentSchema);
    updateArtifacts(currentSchema);

    runtimeRequestStatus.textContent = [
      'Ответ API сохранён как schema.mock.datasources.' + currentDatasourceId + '.rows.',
      'Строк: ' + getMockRows(currentSchema, currentDatasourceId).length,
      'Полей resultSchema: ' + getActiveDatasource(currentSchema).resultSchema.length,
      'Диагностика заказа: строк с номер_заказа != 0: ' + orderDiagnostics.nonZeroOrderRows + '; строк с title: ' + orderDiagnostics.titledOrderRows + '; lookup-пар: ' + orderDiagnostics.lookupItems + '; обновлялась таблица: ' + (orderDiagnostics.activeTableId || '-'),
      importedColumnCount ? 'Колонок основной таблицы: ' + importedColumnCount + '.' : 'Подходящие поля для автоколонок не найдены.',
      importedFilters.length
        ? 'Фильтры добавлены/обновлены: ' + importedFilters.join(', ') + '.'
        : 'Подходящие поля для автофильтров не найдены.'
    ].join('\n');
  }

  function showLoadError(error) {
    if (jsonPreview) {
      jsonPreview.textContent = 'Не удалось загрузить пример схемы.\n\n' + String(error);
    }
    artifactPreview.textContent = 'Генерация недоступна, пока схема не загружена.';
    livePreviewFrame.srcdoc = '<!doctype html><html lang="ru"><body><p>Не удалось построить образец отчёта.</p></body></html>';
    if (generatedPreviewFrame) {
      generatedPreviewFrame.srcdoc = '<!doctype html><html lang="ru"><body><p>Не удалось построить generated preview.</p></body></html>';
    }
  }

  function prepareSchemaLoad(message) {
    if (jsonPreview) {
      jsonPreview.textContent = 'Загрузка схемы...';
    }
    artifactPreview.textContent = 'Генерация пакета...';
    artifactCopyStatus.textContent = message || '';
    livePreviewFrame.srcdoc = '<!doctype html><html lang="ru"><body><p>Подготовка образца отчёта...</p></body></html>';
    if (generatedPreviewFrame) {
      generatedPreviewFrame.srcdoc = '<!doctype html><html lang="ru"><body><p>Подготовка generated preview...</p></body></html>';
    }
  }

  function loadSchemaFromUrl(url, message) {
    prepareSchemaLoad(message);

    fetch(url + '?v=' + Date.now())
      .then(function(response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function(payload) {
        setCurrentSchema(payload);
      })
      .catch(showLoadError);
  }

  function loadSchema() {
    loadSchemaFromUrl(schemaUrl, 'Загружен пример схемы.');
  }

  function loadBlankSchema() {
    loadSchemaFromUrl(blankSchemaUrl, 'Загружен чистый шаблон.');
  }

  function openSchemaFilePicker() {
    schemaFileInput.value = '';
    schemaFileInput.click();
  }

  function loadSchemaFile(event) {
    var file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    prepareSchemaLoad('Чтение файла: ' + file.name);

    var reader = new FileReader();
    reader.onload = function() {
      try {
        setCurrentSchema(JSON.parse(String(reader.result || '{}')));
        artifactCopyStatus.textContent = 'Загружена схема: ' + file.name;
      } catch (error) {
        showLoadError(error);
      }
    };
    reader.onerror = function() {
      showLoadError(reader.error || new Error('Не удалось прочитать файл.'));
    };
    reader.readAsText(file, 'utf-8');
  }

  form.addEventListener('input', applyFormToSchema);
  form.addEventListener('change', applyFormToSchema);
  if (reloadButton) {
    reloadButton.addEventListener('click', loadSchema);
  }
  newSchemaButton.addEventListener('click', loadBlankSchema);
  uploadSchemaButton.addEventListener('click', openSchemaFilePicker);
  schemaFileInput.addEventListener('change', loadSchemaFile);
  downloadSchemaButton.addEventListener('click', downloadSchema);
  copyArtifactButton.addEventListener('click', copyCurrentArtifact);
  downloadArtifactButton.addEventListener('click', downloadCurrentArtifact);
  openPreviewButton.addEventListener('click', openPreviewInNewTab);
  if (openGeneratedPreviewButton) {
    openGeneratedPreviewButton.addEventListener('click', openGeneratedPreviewInNewTab);
  }
  if (collapseAllSectionsButton) {
    collapseAllSectionsButton.addEventListener('click', function() {
      setAllSectionsCollapsed(true);
    });
  }
  if (expandAllSectionsButton) {
    expandAllSectionsButton.addEventListener('click', function() {
      setAllSectionsCollapsed(false);
    });
  }
  previewRuntimeRequestButton.addEventListener('click', fetchRuntimeData);
  importApiResponseButton.addEventListener('click', importApiResponseAsMock);
  addResultFieldButton.addEventListener('click', addResultField);
  addDatasourceButton.addEventListener('click', addDatasource);
  removeDatasourceButton.addEventListener('click', removeDatasource);
  addDatasourceParameterButton.addEventListener('click', addDatasourceParameter);
  addDatasourceBranchButton.addEventListener('click', addDatasourceBranch);
  addFilterButton.addEventListener('click', addFilter);
  addTabButton.addEventListener('click', addTab);
  addTableButton.addEventListener('click', addTable);
  addColumnButton.addEventListener('click', addColumn);
  addSummaryCardButton.addEventListener('click', addSummaryCard);
  resultSchemaEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-result-field-prop]')) {
      updateResultFieldFromEditor(event.target, false);
    }
  });
  resultSchemaEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-result-field-prop]')) {
      updateResultFieldFromEditor(event.target, true);
    }
  });
  resultSchemaEditor.addEventListener('click', function(event) {
    var moveButton = event.target.closest('[data-result-field-move]');
    if (moveButton) {
      moveResultField(
        toNumber(moveButton.getAttribute('data-result-field-move'), -1),
        toNumber(moveButton.getAttribute('data-direction'), 0)
      );
      return;
    }

    var removeButton = event.target.closest('[data-result-field-remove]');
    if (!removeButton) {
      return;
    }

    removeResultField(toNumber(removeButton.getAttribute('data-result-field-remove'), -1));
  });
  fields.datasourceSelector.addEventListener('change', function(event) {
    currentDatasourceId = event.target.value || 'main';
    fillForm(currentSchema);
    updateSummary(currentSchema);
    updateArtifacts(currentSchema);
  });
  datasourceBranchesEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-datasource-branch-prop]')) {
      updateDatasourceBranchFromEditor(event.target);
    }
  });
  datasourceBranchesEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-datasource-branch-prop]')) {
      updateDatasourceBranchFromEditor(event.target);
    }
  });
  datasourceBranchesEditor.addEventListener('click', function(event) {
    var removeButton = event.target.closest('[data-datasource-branch-remove]');
    if (!removeButton) {
      return;
    }

    removeDatasourceBranch(toNumber(removeButton.getAttribute('data-datasource-branch-remove'), -1));
  });
  datasourceParametersEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-datasource-parameter-prop]')) {
      updateDatasourceParameterFromEditor(event.target);
    }
  });
  datasourceParametersEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-datasource-parameter-prop]')) {
      updateDatasourceParameterFromEditor(event.target);
    }
  });
  datasourceParametersEditor.addEventListener('click', function(event) {
    var removeButton = event.target.closest('[data-datasource-parameter-remove]');
    if (!removeButton) {
      return;
    }

    removeDatasourceParameter(toNumber(removeButton.getAttribute('data-datasource-parameter-remove'), -1));
  });
  runtimeTestParameters.addEventListener('input', function(event) {
    var name = event.target.getAttribute('data-runtime-param-name');
    if (name) {
      runtimeTestValues[name] = event.target.value;
      updateRuntimeBodyPreview();
    }
  });
  runtimeTestParameters.addEventListener('change', function(event) {
    var name = event.target.getAttribute('data-runtime-param-name');
    if (name) {
      runtimeTestValues[name] = event.target.value;
      updateRuntimeBodyPreview();
    }
  });
  filtersEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-filter-prop]')) {
      updateFilterFromEditor(event.target);
    }
  });
  filtersEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-filter-prop]')) {
      updateFilterFromEditor(event.target);
    }
  });
  filtersEditor.addEventListener('click', function(event) {
    var removeButton = event.target.closest('[data-filter-remove]');
    if (!removeButton) {
      return;
    }

    removeFilter(toNumber(removeButton.getAttribute('data-filter-remove'), -1));
  });
  tabsEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-tab-prop]')) {
      updateTabFromEditor(event.target);
    }
  });
  tabsEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-tab-prop]')) {
      updateTabFromEditor(event.target);
    }
  });
  tabsEditor.addEventListener('click', function(event) {
    var moveButton = event.target.closest('[data-tab-move]');
    if (moveButton) {
      moveTab(
        toNumber(moveButton.getAttribute('data-tab-move'), -1),
        toNumber(moveButton.getAttribute('data-direction'), 0)
      );
      return;
    }

    var removeButton = event.target.closest('[data-tab-remove]');
    if (!removeButton) {
      return;
    }

    removeTab(toNumber(removeButton.getAttribute('data-tab-remove'), -1));
  });
  tablesEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-table-prop]')) {
      updateTableFromEditor(event.target);
    }
  });
  tablesEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-table-prop]')) {
      updateTableFromEditor(event.target);
    }
  });
  tablesEditor.addEventListener('click', function(event) {
    var selectButton = event.target.closest('[data-table-select]');
    var removeButton = event.target.closest('[data-table-remove]');

    if (selectButton) {
      selectTable(toNumber(selectButton.getAttribute('data-table-select'), -1));
      return;
    }

    if (removeButton) {
      removeTable(toNumber(removeButton.getAttribute('data-table-remove'), -1));
    }
  });
  columnsEditor.addEventListener('input', function(event) {
    if (event.target.matches('input[data-column-prop]')) {
      updateColumnFromEditor(event.target);
    }
  });
  columnsEditor.addEventListener('change', function(event) {
    if (event.target.matches('select[data-column-prop], input[type="checkbox"][data-column-prop]')) {
      updateColumnFromEditor(event.target);
    }
  });
  columnsEditor.addEventListener('click', function(event) {
    var moveButton = event.target.closest('[data-column-move]');
    var removeButton = event.target.closest('[data-column-remove]');

    if (moveButton) {
      moveColumn(
        toNumber(moveButton.getAttribute('data-column-move'), -1),
        toNumber(moveButton.getAttribute('data-direction'), 0)
      );
      return;
    }

    if (!removeButton) {
      return;
    }

    removeColumn(toNumber(removeButton.getAttribute('data-column-remove'), -1));
  });
  summaryCardsEditor.addEventListener('input', function(event) {
    if (event.target.matches('[data-summary-card-prop]')) {
      updateSummaryCardFromEditor(event.target);
    }
  });
  summaryCardsEditor.addEventListener('change', function(event) {
    if (event.target.matches('[data-summary-card-prop]')) {
      updateSummaryCardFromEditor(event.target);
    }
  });
  summaryCardsEditor.addEventListener('click', function(event) {
    var moveButton = event.target.closest('[data-summary-card-move]');
    var removeButton = event.target.closest('[data-summary-card-remove]');

    if (moveButton) {
      moveSummaryCard(
        toNumber(moveButton.getAttribute('data-summary-card-move'), -1),
        toNumber(moveButton.getAttribute('data-direction'), 0)
      );
      return;
    }

    if (!removeButton) {
      return;
    }

    removeSummaryCard(toNumber(removeButton.getAttribute('data-summary-card-remove'), -1));
  });
  artifactTabs.addEventListener('click', function(event) {
    var target = event.target.closest('[data-artifact]');
    if (!target) {
      return;
    }

    currentArtifactName = target.getAttribute('data-artifact');
    renderArtifactTabs();
    updateArtifactPreview();
  });

  loadSchema();
})();
