(function() {
  var reportCore = window.HC_REPORT_CORE || null;
  var embeddedFallbackConfig = {
    reportTitle: 'Отчет: Рецепты хлеба (на 1 ед)',
    mockDataFile: 'mock-data.json',
    columns: [
      { key: 'bread_item', field: 'номенклатура_title', label: 'Номенклатура 1 (хлеб)', type: 'dimension' },
      { key: 'dough_item', field: 'номенклатура_вход_title', label: 'Номенклатура 2 (Т)', type: 'dimension' },
      { key: 'ingredient_item', field: 'номенклатура_вх_2_передел_title', label: 'Номенклатура 3 (И)', type: 'dimension' },
      { key: 'bread_group', field: 'группа_title', label: 'Группа 1 (хлеб)', type: 'dimension' },
      { key: 'dough_group', field: 'группа_1_title', label: 'Группа 2 (Т)', type: 'dimension' },
      { key: 'ingredient_group', field: 'группа_2_title', label: 'Группа 3 (И)', type: 'dimension' },
      { key: 'qty_per_unit', field: 'итого_итого', label: 'Кол-во г (на 1 ед)', type: 'value' }
    ],
    rowMap: {
      bread_item: ['номенклатура_title'],
      dough_item: ['номенклатура_вход_title', 'номенклатура_вход', 'номенклатура_2_title', 'номенклатура_2'],
      ingredient_item: [
        'номенклатура_вх_2_передел_title',
        'номенклатура_вх_2_передел',
        'номенклатура_вх_2_пер_title',
        'номенклатура_вх_2_пер',
        'номенклатура_вход_2_title',
        'номенклатура_вход_2'
      ],
      bread_group: ['группа_title', 'группа'],
      dough_group: ['группа_1_title', 'группа_1'],
      ingredient_group: ['группа_2_title', 'группа_2'],
      qty_per_unit: ['итого_итого', 'итого', 'колво_2_итого', 'колво_всего', 'колво_на_1_ед', 'колво', 'qty']
    },
    layout: {
      rows: ['bread_item', 'dough_item', 'ingredient_item'],
      columns: [],
      values: ['qty_per_unit']
    },
    datasourceExpression: [
      'catalog.номенклатура | Select (id, группа) | GetTitle () as Группа; // Группу нужно подтянуть к номенклатуре (номенклатура здесь - это хлеб)',
      'TempTable.группа | Select (id, группа as группа_1, группа_title as группа_1_title) as Группа_1; // Группу_1 подтянем к номенклатуре первого передела, в общем смысле это Тесто',
      'TempTable.группа | Select (id, группа as группа_2, группа_title as группа_2_title) as Группа_2; // Группу_2 подтянем к номенклатуре второго передела, в общем смысле это из чего состоит Тесто',
      'рецепты_2 | Select (номенклатура_выход, номенклатура_вход, колво_г_на_ед_и_100_г, колво_на_1_ед, колво_на_100_г) | GetTitle () as Рецепт; //таблица ингредиентов, подтянем к первому переделу - к тесту',
      'TempTable.рецепт | Select (номенклатура_выход as номенклатура_вых_2_передел, номенклатура_выход_title as номенклатура_вых_2_передел_title, номенклатура_вход as номенклатура_вх_2_передел, номенклатура_вход_title as номенклатура_вх_2_передел_title, колво_на_100_г as колво_на_100_г_2) as Рецепт_2; //таблица ингредиентов, подтянем ко второму переделу - к тому из чего Тесто состоит',
      '',
      'catalog.номенклатура | группа (5) | Select (id as номенклатура, title as номенклатура_title, группа) | AddColumn (необходимо_шт, number, 1) | LeftJoinAuto (рецепт, номенклатура = рецепт.номенклатура_выход) | LeftJoinAuto (группа_1, номенклатура_вход = группа_1.id) | Compute (колво_всего, колво_на_1_ед * необходимо_шт) | LeftJoinAuto (рецепт_2, номенклатура_вход = рецепт_2.номенклатура_вых_2_передел) | LeftJoinAuto (группа_2, номенклатура_вх_2_передел = группа_2.id) | DeleteColumn (id, группа, номенклатура_выход, номенклатура_вход, группа_1, номенклатура_вых_2_передел, номенклатура_вх_2_передел, группа_2) | Compute (колво_2_итого, колво_на_100_г_2 * колво_всего / 100) | OrderBy (номенклатура_выход_title, номенклатура_вход_title, номенклатура_вх_2_передел_title) | Coalesce (итого_итого, колво_2_итого, колво_всего)'
    ].join('\n')
  };

  var reportDefaults = Object.assign({}, embeddedFallbackConfig, window.HC_REPORT_DEFAULT_CONFIG || {});
  var reportManifest = window.HC_REPORT_MANIFEST || {};
  var reportConfig = Object.assign({}, reportDefaults, reportManifest);
  var rowMap = reportConfig.rowMap || {};
  var reportColumns = Array.isArray(reportConfig.columns) ? reportConfig.columns : [];
  var dimensionCatalog = reportColumns.filter(function(item) { return item.type === 'dimension'; });
  var valueCatalog = reportColumns.filter(function(item) { return item.type === 'value'; });
  function pickValue(item, aliases, fallback) {
    var keys = Array.isArray(aliases) ? aliases : [];
    for (var i = 0; i < keys.length; ++i) {
      if (
        Object.prototype.hasOwnProperty.call(item, keys[i]) &&
        item[keys[i]] !== null &&
        typeof item[keys[i]] !== 'undefined' &&
        item[keys[i]] !== ''
      ) {
        return item[keys[i]];
      }
    }
    return fallback;
  }

  function normalizeLabel(value) {
    if (value === null || typeof value === 'undefined' || value === '') {
      return 'Без значения';
    }
    return String(value);
  }

  function hasMeaningfulValue(value) {
    return !(value === null || typeof value === 'undefined' || value === '');
  }

  function cloneAxisList(list, fallback) {
    if (Array.isArray(list) && list.length > 0) {
      return list.slice();
    }
    return Array.isArray(fallback) ? fallback.slice() : [];
  }

  new Vue({
    el: '#root',
    data: {
      reportTitle: reportConfig.reportTitle || embeddedFallbackConfig.reportTitle,
      mockDataUrl: reportConfig.mockDataFile || embeddedFallbackConfig.mockDataFile,
      dataSourceMode: 'hubcloud',
      isWaiting: false,
      settingsPanelOpen: true,
      pendingRowKey: '',
      pendingColumnKey: '',
      pendingValueKey: '',
      selectedRowKeys: cloneAxisList(reportConfig.layout && reportConfig.layout.rows, embeddedFallbackConfig.layout.rows),
      selectedColumnKeys: cloneAxisList(reportConfig.layout && reportConfig.layout.columns, []),
      selectedValueKeys: cloneAxisList(reportConfig.layout && reportConfig.layout.values, embeddedFallbackConfig.layout.values),
      rawRows: [],
      normalizedRows: [],
      visibleColumns: [],
      treeRows: [],
      visibleTreeRows: [],
      expandedRowKeys: [],
      relationModal: {
        visible: false,
        title: '',
        rows: [],
        viewMode: 'tree',
        flow: {
          root: { label: '', value: 0 },
          branches: []
        }
      }
    },

    computed: {
      selectedRows: function() {
        return this.mapKeysToItems(this.selectedRowKeys, dimensionCatalog);
      },
      selectedColumns: function() {
        return this.mapKeysToItems(this.selectedColumnKeys, dimensionCatalog);
      },
      selectedValues: function() {
        return this.mapKeysToItems(this.selectedValueKeys, valueCatalog);
      },
      availableRowOptions: function() {
        return this.getAvailableDimensionOptions(this.selectedRowKeys);
      },
      availableColumnOptions: function() {
        return this.getAvailableDimensionOptions(this.selectedColumnKeys);
      },
      availableValueOptions: function() {
        var selected = this.selectedValueKeys;
        return valueCatalog.filter(function(option) {
          return selected.indexOf(option.key) < 0;
        });
      },
      rowHeaderLabel: function() {
        if (this.selectedRows.length === 0) {
          return 'Строки';
        }
        return this.selectedRows.map(function(item) { return item.label; }).join(' / ');
      },
      rowHeaderNumberLabel: function() {
        return '';
      }
    },

    methods: {
      mapKeysToItems: function(keys, catalog) {
        var list = [];
        for (var i = 0; i < keys.length; ++i) {
          for (var j = 0; j < catalog.length; ++j) {
            if (catalog[j].key === keys[i]) {
              list.push(catalog[j]);
              break;
            }
          }
        }
        return list;
      },

      getAvailableDimensionOptions: function(currentAxis) {
        var locked = this.selectedRowKeys.concat(this.selectedColumnKeys);
        return dimensionCatalog.filter(function(option) {
          return locked.indexOf(option.key) < 0 || currentAxis.indexOf(option.key) >= 0;
        });
      },

      readField: function(item, fieldKey) {
        return pickValue(item, rowMap[fieldKey] || [fieldKey], '');
      },

      normalizeSourceRow: function(item) {
        var normalized = {};
        for (var i = 0; i < dimensionCatalog.length; ++i) {
          normalized[dimensionCatalog[i].key] = normalizeLabel(this.readField(item, dimensionCatalog[i].key));
        }
        for (var j = 0; j < valueCatalog.length; ++j) {
          normalized[valueCatalog[j].key] = Number(this.readField(item, valueCatalog[j].key) || 0);
        }
        return normalized;
      },

      getQueryParameters: function() {
        if (reportCore && typeof reportCore.getQueryParameters === 'function') {
          return reportCore.getQueryParameters(window.location.search, window.HC_QUERY_PARAMETERS);
        }
        return {};
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

      toggleSettingsPanel: function() {
        this.settingsPanelOpen = !this.settingsPanelOpen;
      },

      addAxisItem: function(axisName) {
        var listName = axisName === 'rows' ? 'selectedRowKeys' : (axisName === 'columns' ? 'selectedColumnKeys' : 'selectedValueKeys');
        var pendingName = axisName === 'rows' ? 'pendingRowKey' : (axisName === 'columns' ? 'pendingColumnKey' : 'pendingValueKey');
        var key = this[pendingName];
        if (!key || this[listName].indexOf(key) >= 0) {
          this[pendingName] = '';
          return;
        }
        this[listName].push(key);
        this[pendingName] = '';
        this.rebuildMatrix(true);
      },

      removeAxisItem: function(axisName, index) {
        var listName = axisName === 'rows' ? 'selectedRowKeys' : (axisName === 'columns' ? 'selectedColumnKeys' : 'selectedValueKeys');
        if (index < 0 || index >= this[listName].length) {
          return;
        }
        this[listName].splice(index, 1);
        this.rebuildMatrix(true);
      },

      moveAxisItem: function(axisName, index, direction) {
        var listName = axisName === 'rows' ? 'selectedRowKeys' : (axisName === 'columns' ? 'selectedColumnKeys' : 'selectedValueKeys');
        var nextIndex = index + (direction < 0 ? 1 : -1);
        if (nextIndex < 0 || nextIndex >= this[listName].length) {
          return;
        }
        var nextList = this[listName].slice();
        var current = nextList[index];
        nextList[index] = nextList[nextIndex];
        nextList[nextIndex] = current;
        this[listName] = nextList;
        this.rebuildMatrix(true);
      },

      getDatasourceExpression: function() {
        if (window.HC_REPORT_DS_TEXT && String(window.HC_REPORT_DS_TEXT).trim()) {
          return String(window.HC_REPORT_DS_TEXT).trim();
        }
        return String(reportConfig.datasourceExpression || '').trim();
      },

      validateDatasourceExpression: function(expression) {
        if (!expression) {
          return 'Не задан datasource для отчета';
        }
        if (reportCore && typeof reportCore.findUnresolvedDsPlaceholders === 'function') {
          var unresolved = reportCore.findUnresolvedDsPlaceholders(expression);
          if (unresolved.length > 0) {
            return 'Не подставлены параметры DS: ' + unresolved.join(', ');
          }
        }
        return '';
      },

      executeDatasourceRequest: function(config, doneCallback, failCallback) {
        if (this.dataSourceMode === 'mock') {
          $.getJSON(this.mockDataUrl)
            .done(function(payload) {
              doneCallback({ isOK: true, data: Array.isArray(payload && payload.rows) ? payload.rows : [] });
            })
            .fail(failCallback);
          return;
        }

        $.ajax({
          url: '/api/v1/datasource/execute/',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          data: JSON.stringify({
            expression: String(config && config.expression ? config.expression : '').trim(),
            applyDimensionRights: true
          })
        }).done(doneCallback).fail(failCallback);
      },

      loadReport: function() {
        this.isWaiting = true;
        var expression = this.getDatasourceExpression();
        var validationError = this.validateDatasourceExpression(expression);
        if (validationError) {
          this.makeToast(validationError, 'danger');
          this.isWaiting = false;
          return;
        }

        this.executeDatasourceRequest(
          { expression: expression },
          function(responseData) {
            if (!responseData || responseData.isOK === false) {
              this.makeToast((responseData && responseData.message) || 'Ошибка загрузки отчета', 'danger');
              this.isWaiting = false;
              return;
            }
            this.rawRows = Array.isArray(responseData.data) ? responseData.data : [];
            this.normalizedRows = this.rawRows.map(this.normalizeSourceRow.bind(this));
            this.rebuildMatrix(true);
            this.isWaiting = false;
          }.bind(this),
          function(jqXHR, textStatus, errorThrown) {
            this.makeToast(textStatus || errorThrown || 'Ошибка запроса', 'danger');
            this.isWaiting = false;
          }.bind(this)
        );
      },

      rebuildMatrix: function(resetExpanded) {
        var matrix = this.buildMatrix(this.normalizedRows);
        this.visibleColumns = matrix.columns;
        this.treeRows = matrix.rows;
        if (resetExpanded) {
          this.expandedRowKeys = matrix.expandedKeys.slice();
        }
        this.visibleTreeRows = this.filterVisibleRows();
      },

      collectVisibleAggregateValue: function(aggregates) {
        var keys = Object.keys(aggregates || {});
        for (var i = 0; i < keys.length; ++i) {
          var numeric = Number(aggregates[keys[i]] || 0);
          if (numeric !== 0) {
            return numeric;
          }
        }
        return 0;
      },

      buildMatrix: function(rows) {
        var rowDefs = this.selectedRows;
        var columnDefs = this.selectedColumns;
        var valueDef = this.selectedValues[0] || valueCatalog[0];
        var columns = [];
        var columnLookup = {};
        var rootNode = {
          pathKey: 'root',
          label: 'Итого',
          depth: -1,
          aggregates: {},
          children: [],
          childMap: {}
        };

        function addAggregate(target, key, amount) {
          target[key] = (target[key] || 0) + amount;
        }

        if (columnDefs.length === 0) {
          columns.push({ key: '__value__', label: valueDef ? valueDef.label : 'Значение' });
          columnLookup.__value__ = true;
        }

        for (var rowIndex = 0; rowIndex < rows.length; ++rowIndex) {
          var sourceRow = rows[rowIndex];
          var rawAmount = valueDef ? sourceRow[valueDef.key] : 0;
          if ((!rawAmount && rawAmount !== 0) && valueDef && valueDef.key) {
            rawAmount = this.readField(sourceRow, valueDef.key);
          }
          var amount = Number(rawAmount || 0);
          var columnKey = '__value__';
          var columnLabel = valueDef ? valueDef.label : 'Значение';

          if (columnDefs.length > 0) {
            var parts = [];
            for (var c = 0; c < columnDefs.length; ++c) {
              parts.push(normalizeLabel(sourceRow[columnDefs[c].key]));
            }
            columnKey = parts.join('||');
            columnLabel = parts.join(' / ');
            if (!columnLookup[columnKey]) {
              columns.push({ key: columnKey, label: columnLabel });
              columnLookup[columnKey] = true;
            }
          }

          addAggregate(rootNode.aggregates, columnKey, amount);

          if (rowDefs.length === 0) {
            if (!rootNode.childMap.total) {
              rootNode.childMap.total = {
                pathKey: 'root::total',
                label: 'Итого',
                depth: 0,
                aggregates: {},
                children: [],
                childMap: {}
              };
              rootNode.children.push(rootNode.childMap.total);
            }
            addAggregate(rootNode.childMap.total.aggregates, columnKey, amount);
            continue;
          }

          var currentNode = rootNode;
          for (var level = 0; level < rowDefs.length; ++level) {
            var rawLabel = sourceRow[rowDefs[level].key];
            if (!hasMeaningfulValue(rawLabel)) {
              continue;
            }
            var label = normalizeLabel(rawLabel);
            var pathKey = currentNode.pathKey + '::' + rowDefs[level].key + '=' + label;
            if (!currentNode.childMap[pathKey]) {
              currentNode.childMap[pathKey] = {
                pathKey: pathKey,
                label: label,
                depth: level,
                aggregates: {},
                children: [],
                childMap: {},
                sourceBreadItem: sourceRow.bread_item
              };
              currentNode.children.push(currentNode.childMap[pathKey]);
            }
            currentNode = currentNode.childMap[pathKey];
            addAggregate(currentNode.aggregates, columnKey, amount);
          }
        }

        columns.sort(function(a, b) {
          return a.label.localeCompare(b.label, 'ru');
        });

        var flattened = [];
        var expandedKeys = [];

        function nodeHasVisibleValue(node) {
          if (!node) {
            return false;
          }
          var aggregateKeys = Object.keys(node.aggregates || {});
          for (var keyIndex = 0; keyIndex < aggregateKeys.length; ++keyIndex) {
            if (Number(node.aggregates[aggregateKeys[keyIndex]] || 0) !== 0) {
              return true;
            }
          }
          for (var childIndex = 0; childIndex < node.children.length; ++childIndex) {
            if (nodeHasVisibleValue(node.children[childIndex])) {
              return true;
            }
          }
          return false;
        }

        function flattenNodes(nodes) {
          for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            if (!nodeHasVisibleValue(node)) {
              continue;
            }
            node.hasChildren = node.children.length > 0;
            if (node.hasChildren) {
              expandedKeys.push(node.pathKey);
            }
            flattened.push(node);
            if (node.children.length > 0) {
              flattenNodes(node.children);
            }
          }
        }

        flattenNodes(rootNode.children);

        return {
          columns: columns,
          rows: flattened,
          expandedKeys: expandedKeys
        };
      },

      filterVisibleRows: function() {
        var expandedLookup = {};
        for (var i = 0; i < this.expandedRowKeys.length; ++i) {
          expandedLookup[this.expandedRowKeys[i]] = true;
        }

        return this.treeRows.filter(function(row) {
          var parts = row.pathKey.split('::');
          for (var level = 1; level < parts.length - 1; ++level) {
            if (!expandedLookup[parts.slice(0, level + 1).join('::')]) {
              return false;
            }
          }
          return true;
        });
      },

      buildRelationRows: function(rootLabel) {
        var rows = [];
        var grouped = {};
        for (var i = 0; i < this.normalizedRows.length; ++i) {
          var sourceRow = this.normalizedRows[i];
          if (sourceRow.bread_item !== rootLabel) {
            continue;
          }

          var doughLabel = hasMeaningfulValue(sourceRow.dough_item) ? sourceRow.dough_item : 'Без значения';
          var ingredientLabel = hasMeaningfulValue(sourceRow.ingredient_item) ? sourceRow.ingredient_item : 'Без значения';
          var amount = Number(sourceRow.qty_per_unit || 0);

          if (!grouped[doughLabel]) {
            grouped[doughLabel] = {
              value: 0,
              ingredients: {}
            };
          }

          grouped[doughLabel].value += amount;
          grouped[doughLabel].ingredients[ingredientLabel] = (grouped[doughLabel].ingredients[ingredientLabel] || 0) + amount;
        }

        var rootTotal = 0;
        var doughKeys = Object.keys(grouped);
        for (var doughIndex = 0; doughIndex < doughKeys.length; ++doughIndex) {
          rootTotal += grouped[doughKeys[doughIndex]].value;
        }

        rows.push({
          depth: 0,
          label: rootLabel,
          value: rootTotal
        });

        for (var j = 0; j < doughKeys.length; ++j) {
          var doughKey = doughKeys[j];
          rows.push({
            depth: 1,
            label: doughKey,
            value: grouped[doughKey].value
          });

          var ingredientKeys = Object.keys(grouped[doughKey].ingredients);
          for (var ingredientIndex = 0; ingredientIndex < ingredientKeys.length; ++ingredientIndex) {
            var ingredientKey = ingredientKeys[ingredientIndex];
            rows.push({
              depth: 2,
              label: ingredientKey,
              value: grouped[doughKey].ingredients[ingredientKey]
            });
          }
        }

        return rows;
      },

      buildRelationFlow: function(rows) {
        var flow = {
          root: {
            label: rows.length > 0 ? rows[0].label : '',
            value: rows.length > 0 ? rows[0].value : 0
          },
          branches: []
        };

        var currentBranch = null;
        for (var i = 1; i < rows.length; ++i) {
          var row = rows[i];
          if (row.depth === 1) {
            currentBranch = {
              label: row.label,
              value: row.value,
              children: []
            };
            flow.branches.push(currentBranch);
            continue;
          }
          if (row.depth === 2 && currentBranch) {
            currentBranch.children.push({
              label: row.label,
              value: row.value
            });
          }
        }

        return flow;
      },

      isExpanded: function(pathKey) {
        return this.expandedRowKeys.indexOf(pathKey) >= 0;
      },

      toggleRow: function(pathKey) {
        var index = this.expandedRowKeys.indexOf(pathKey);
        if (index >= 0) {
          this.expandedRowKeys.splice(index, 1);
        } else {
          this.expandedRowKeys.push(pathKey);
        }
        this.visibleTreeRows = this.filterVisibleRows();
      },

      onTreeRowClick: function(row) {
        if (!row || row.depth !== 0) {
          return;
        }
        var rootKey = row.sourceBreadItem || row.label || '';
        this.relationModal.title = String(row.label || '');
        this.relationModal.rows = this.buildRelationRows(String(rootKey));
        this.relationModal.flow = this.buildRelationFlow(this.relationModal.rows);
        this.relationModal.viewMode = 'tree';
        this.relationModal.visible = true;
      },

      setRelationViewMode: function(mode) {
        this.relationModal.viewMode = mode;
      },

      closeRelationModal: function() {
        this.relationModal.visible = false;
        this.relationModal.title = '';
        this.relationModal.rows = [];
        this.relationModal.viewMode = 'tree';
        this.relationModal.flow = {
          root: { label: '', value: 0 },
          branches: []
        };
      },

      rowClass: function(row) {
        return 'bread-row-depth-' + Math.max(0, row.depth);
      },

      formatValue: function(value) {
        var numeric = Number(value || 0);
        if (!numeric) {
          return '';
        }
        return numeric.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4
        });
      },

      buildExcelHtml: function() {
        var header = '<th>#</th><th>' + this.escapeHtml(this.rowHeaderLabel) + '</th>';
        for (var i = 0; i < this.visibleColumns.length; ++i) {
          header += '<th>' + this.escapeHtml(this.visibleColumns[i].label) + '</th>';
        }
        var body = '';
        for (var rowIndex = 0; rowIndex < this.visibleTreeRows.length; ++rowIndex) {
          var row = this.visibleTreeRows[rowIndex];
          body += '<tr><td>' + (rowIndex + 1) + '</td><td>' + this.escapeHtml(row.label) + '</td>';
          for (var colIndex = 0; colIndex < this.visibleColumns.length; ++colIndex) {
            body += '<td>' + this.escapeHtml(this.formatValue(row.aggregates[this.visibleColumns[colIndex].key])) + '</td>';
          }
          body += '</tr>';
        }
        return "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><table border='1'><thead><tr>" + header + "</tr></thead><tbody>" + body + "</tbody></table></body></html>";
      },

      exportToExcel: function() {
        if (this.visibleTreeRows.length === 0) {
          this.makeToast('Нет данных для выгрузки', 'warning');
          return;
        }
        var html = this.buildExcelHtml();
        var blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'bread_recipes_unit.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      },

      printReport: function() {
        window.print();
      },

      escapeHtml: function(value) {
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },

      makeToast: function(text, alertClass) {
        var template = "<div id='toastAlert' class='alert alert-%class% alert-dismissable' style='width:360px; position:fixed; top:20px; right:20px; z-index:9999;'><a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a><span>%text%</span></div>";
        template = template.replace('%text%', text || '');
        template = template.replace('%class%', alertClass || 'info');
        $('#toastAlert').remove();
        $('body').append(template);
        $('#toastAlert').fadeOut(5000);
      }
    },

    mounted: function() {
      this.dataSourceMode = this.detectDataSourceMode();
      this.loadReport();
    }
  });
})();
