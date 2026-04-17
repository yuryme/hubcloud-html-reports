var vueApp = new Vue({
  el: '#root',
  data: {
    isWaiting: false,
    dataSourceMode: 'hubcloud',
    mockDataUrl: './mock-data.json',
    rawRows: [],
    fullDisplayRows: [],
    displayRows: [],
    showDoughModal: false,
    isTableHeaderHovered: false,
    selectedDoughName: ''
  },
  methods: {
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
      var requestedMode = (queryParameters.mode || queryParameters.source || '').toString().toLowerCase();

      if (requestedMode === 'mock' || requestedMode === 'local') {
        return 'mock';
      }

      if (queryParameters.mock === '1' || queryParameters.mock === 'true') {
        return 'mock';
      }

      if (window.HC_QUERY_PARAMETERS && typeof window.HC_QUERY_PARAMETERS === 'object') {
        return 'hubcloud';
      }

      return 'hubcloud';
    },

    initializeRuntime: function() {
      this.dataSourceMode = this.detectDataSourceMode();
    },

    executeDatasourceRequest: function(config, doneCallback, failCallback) {
      if (this.dataSourceMode === 'mock') {
        $.getJSON(this.mockDataUrl)
          .done(function(mockResponse) {
            var normalizedResponse = mockResponse;

            if (Array.isArray(mockResponse)) {
              normalizedResponse = { isOK: true, data: mockResponse };
            } else if (!mockResponse || typeof mockResponse !== 'object' || !('isOK' in mockResponse)) {
              normalizedResponse = { isOK: true, data: [] };
            }

            doneCallback(normalizedResponse);
          })
          .fail(function(jqXHR, textStatus, errorThrown) {
            failCallback(jqXHR, textStatus, errorThrown);
          });
        return;
      }

      var safeConfig = {
        expression: (config && config.expression ? String(config.expression) : '').trim(),
        applyDimensionRights: true
      };

      if (!safeConfig.expression) {
        failCallback(null, 'empty_expression', 'Datasource expression is empty');
        return;
      }

      this.sendRequest('/api/v1/datasource/execute/', 'POST', JSON.stringify(safeConfig), doneCallback, failCallback);
    },

    getDatasourceExpression: function() {
      return `
catalog.номенклатура | Select (id, группа) | GetTitle () as Группа; //Это таблица для подтягивания Группы к номенклатуре
закупка | Last (номенклатура, цена) | Compute (цена_гр, цена/1000 ) as цена;

рецепты_2 | номенклатура_выход (true ) |Select (номенклатура_выход as номенклатура_хлеб_и_пр, номенклатура_вход as номенулатура_тесто_и_пр, колво_на_1_ед, колво_на_100_г) | GetTitle () as Рецепт;  //таблица Рецептов

// ниже таблица, "выпуск цеха" - это вся номенклатура, которую мы продаем, то есть это изделия, и поэтому нет никаких фильтров, но так же может быть заказан и конечный ингредиент
рецепты_2 | GroupBy(номенклатура_выход as номенклатура) | AddColumn (производим_шт_или_кг, number, 10) | GetTitle () | LeftJoinAuto (группа, номенклатура = группа.id ) | группа (4)  | LeftJoinAuto (рецепт, номенклатура = рецепт.номенклатура_хлеб_и_пр ) | Compute (нужно_теста_и_пр_в_гр, колво_на_100_г* производим_шт_или_кг) as ТаблицаТестоКолво; //получили таблицу, в которой мы посчитали, сколько нужно Теста и других ингредиентов, которые в рецепте хлеба

//нам нужна таблица ингредиентов, которую подтянем к первому переделу - к тесту
TempTable.рецепт | Select (номенклатура_хлеб_и_пр as номенлатура_1, номенклатура_хлеб_и_пр_title as номенлатура_1_title, номенулатура_тесто_и_пр as номенлатура_2, номенулатура_тесто_и_пр_title as номенлатура_2_title, колво_на_1_ед, колво_на_100_г ) as Рецепт_2;

//теперь присоединяем слева таблицу Рецептов, то есть дальше разукомплектовываем Тесто (и пр) до следующего уровня
CreateTable () | FullJoinAuto ( ТаблицаТестоКолво, ) | DeleteColumn (колво_на_1_ед, колво_на_100_г ) | LeftJoinAuto  (Рецепт_2, номенулатура_тесто_и_пр = Рецепт_2.номенлатура_1 ) //эту процедуру нужно три раза повторить, ...Coalesce ( номенклатура_ххх, номенлатура_2_title, номенулатура_тесто_и_пр_title ) | Coalesce ( колво_ххх, , нужно_теста_и_пр_в_гр ) | 

| Compute ( колво_потребн_расчет, нужно_теста_и_пр_в_гр * колво_на_100_г / 100 ) | Coalesce ( колво_потреб_ингред_1, колво_потребн_расчет, нужно_теста_и_пр_в_гр )  | Coalesce (номенк_3й_уровень_title, номенлатура_2_title, номенулатура_тесто_и_пр_title) 
| Coalesce (номенк_3й_уровень, номенлатура_2, номенулатура_тесто_и_пр)
| DeleteColumn ( номенклатура_title, номенлатура_1_title, номенлатура_2_title, номенклатура, номенлатура_1, номенлатура_2, id, группа, группа_title, колво_потребн_расчет, колво_на_1_ед, колво_на_100_г, нужно_теста_и_пр_в_гр)

//к этому моменту получили разукомплектование до 2-го уровня, то есть Хлеб (1) - Тесто (2-й уровень) - Мука и пр (3-й уровень), и теперь разукомплектовываем третий уровень, то есть будет уже 4-й 
| LeftJoinAuto  (Рецепт_2, номенк_3й_уровень = Рецепт_2.номенлатура_1 ) | Compute ( колво_расчет_4й_уровень, колво_потреб_ингред_1 * колво_на_100_г / 100 ) | Coalesce ( колво_отчет_гр, колво_расчет_4й_уровень, колво_потреб_ингред_1 )  | Compute (колво_отчет_кг, колво_отчет_гр / 1000)

| Coalesce (номенк_4й_уровень_title, номенлатура_2_title, номенк_3й_уровень_title) | Coalesce (номенк_4й_уровень, номенлатура_2, номенк_3й_уровень) | DeleteColumn (колво_на_1_ед, колво_на_100_г, колво_расчет_4й_уровень,  номенк_3й_уровень, колво_потреб_ингред_1, номенулатура_тесто_и_пр, номенлатура_1, номенлатура_1_title, номенлатура_2, номенлатура_2_title)

   |  LeftJoinAuto  (цена, номенк_4й_уровень= цена.номенклатура ) | DeleteColumn (номенклатура, цена) | Compute (цена, цена_гр*колво_отчет_гр)  |  LeftJoinAuto  (группа, номенк_4й_уровень= группа.id) | группа (1) | GroupBy (номенклатура_хлеб_и_пр_title, номенк_4й_уровень_title,колво_отчет_гр, цена )
      `;
    },

    onReportClick: function() {
      this.isWaiting = true;
      this.rawRows = [];
      this.displayRows = [];

      var config = {
        expression: this.getDatasourceExpression(),
        applyDimensionRights: true
      };

      this.executeDatasourceRequest(
        config,
        function(responseData) {
          var responseItems = Array.isArray(responseData.data) ? responseData.data : [];
          if (responseData.isOK) {
            this.rawRows = responseItems;
            this.fullDisplayRows = this.buildDisplayRows(responseItems);
            if (this.selectedDoughName && !this.hasDoughName(this.selectedDoughName)) {
              this.selectedDoughName = '';
            }
            this.applyDoughFilter();
            if (this.displayRows.length === 0) {
              this.makeToast('Источник вернул 0 строк для текущего контекста.', 'warning', 8000);
            }
          } else {
            this.makeToast(responseData.message || 'Ошибка при загрузке отчета', 'danger');
          }
          this.isWaiting = false;
        }.bind(this),
        function(jqXHR, textStatus, errorThrown) {
          this.makeToast(textStatus || errorThrown || 'Ошибка запроса', 'danger');
          this.isWaiting = false;
        }.bind(this)
      );
    },

    getValueByCandidates: function(row, candidates) {
      for (var i = 0; i < candidates.length; ++i) {
        var key = candidates[i];
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          return row[key];
        }
      }
      return '';
    },

    toNumber: function(value) {
      var numeric = parseFloat(value);
      return isNaN(numeric) ? 0 : numeric;
    },

    buildDisplayRows: function(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        return [];
      }

      var grouped = {};

      for (var i = 0; i < rows.length; ++i) {
        var row = rows[i] || {};
        var doughName = this.getValueByCandidates(row, [
          'dough',
          'номенклатура_хлеб_и_пр_title',
          'номенклатура_выход_title'
        ]) || 'Без названия';

        var ingredientName = this.getValueByCandidates(row, [
          'ingredient',
          'номенк_4й_уровень_title',
          'номенклатура_вход_title'
        ]) || 'Ингредиент';

        var qtyGr = this.toNumber(this.getValueByCandidates(row, [
          'qty',
          'колво_отчет_гр',
          'колво_2_итого',
          'колво_на_100_г'
        ]));

        var price = this.toNumber(this.getValueByCandidates(row, ['цена']));

        if (!grouped[doughName]) {
          grouped[doughName] = {
            totalQty: 0,
            totalPrice: 0,
            ingredients: {}
          };
        }

        if (!grouped[doughName].ingredients[ingredientName]) {
          grouped[doughName].ingredients[ingredientName] = {
            qtyGr: 0,
            price: 0
          };
        }

        grouped[doughName].totalQty += qtyGr;
        grouped[doughName].totalPrice += price;
        grouped[doughName].ingredients[ingredientName].qtyGr += qtyGr;
        grouped[doughName].ingredients[ingredientName].price += price;
      }

      var sectionNames = Object.keys(grouped).sort(function(a, b) {
        return a.localeCompare(b, 'ru');
      });

      var result = [];
      for (var sectionIndex = 0; sectionIndex < sectionNames.length; ++sectionIndex) {
        var sectionName = sectionNames[sectionIndex];
        var sectionData = grouped[sectionName];

        result.push({
          type: 'group-row',
          name: sectionName,
          qtyGr: sectionData.totalQty,
          price: sectionData.totalPrice
        });

        var ingredientNames = Object.keys(sectionData.ingredients).sort(function(a, b) {
          return a.localeCompare(b, 'ru');
        });

        for (var ingredientIndex = 0; ingredientIndex < ingredientNames.length; ++ingredientIndex) {
          var ingredientName = ingredientNames[ingredientIndex];
          var ingredientData = sectionData.ingredients[ingredientName];

          result.push({
            type: 'ingredient-row',
            name: ingredientName,
            qtyGr: ingredientData.qtyGr,
            price: ingredientData.price
          });
        }
      }

      return result;
    },

    getDoughNames: function() {
      var names = [];
      var seen = {};
      for (var i = 0; i < this.fullDisplayRows.length; ++i) {
        var row = this.fullDisplayRows[i] || {};
        if (row.type !== 'group-row') {
          continue;
        }
        var name = String(row.name || '').trim();
        if (!name || seen[name]) {
          continue;
        }
        seen[name] = true;
        names.push(name);
      }
      return names;
    },

    hasDoughName: function(name) {
      var names = this.getDoughNames();
      for (var i = 0; i < names.length; ++i) {
        if (names[i] === name) {
          return true;
        }
      }
      return false;
    },

    applyDoughFilter: function() {
      if (!this.selectedDoughName) {
        this.displayRows = Array.isArray(this.fullDisplayRows) ? this.fullDisplayRows.slice() : [];
        return;
      }

      var filteredRows = [];
      var includeCurrentBlock = false;

      for (var i = 0; i < this.fullDisplayRows.length; ++i) {
        var row = this.fullDisplayRows[i] || {};
        if (row.type === 'group-row') {
          includeCurrentBlock = row.name === this.selectedDoughName;
        }

        if (includeCurrentBlock) {
          filteredRows.push(row);
        }
      }

      this.displayRows = filteredRows;
    },

    getDoughNameByRowIndex: function(index) {
      if (!Array.isArray(this.displayRows) || index < 0 || index >= this.displayRows.length) {
        return '';
      }

      for (var i = index; i >= 0; --i) {
        var row = this.displayRows[i] || {};
        if (row.type === 'group-row') {
          return String(row.name || '').trim();
        }
      }

      return '';
    },

    getRowActionTitle: function(row, index) {
      var currentRow = row || {};
      if (this.selectedDoughName && currentRow.type === 'group-row' && currentRow.name === this.selectedDoughName) {
        return 'Показать все рецепты';
      }
      return 'Показать карточку';
    },

    onRecipeRowClick: function(row, index) {
      var currentRow = row || {};

      if (this.selectedDoughName && currentRow.type === 'group-row' && currentRow.name === this.selectedDoughName) {
        this.selectDough('');
        return;
      }

      var doughName = currentRow.type === 'group-row'
        ? String(currentRow.name || '').trim()
        : this.getDoughNameByRowIndex(index);

      if (!doughName) {
        return;
      }

      this.selectDough(doughName);
    },

    selectDough: function(name) {
      this.selectedDoughName = name || '';
      this.applyDoughFilter();
      this.showDoughModal = false;
    },

    onTableHeaderEnter: function() {
      this.isTableHeaderHovered = true;
    },

    onTableHeaderLeave: function() {
      this.isTableHeaderHovered = false;
    },

    onTableHeaderClick: function(event) {
      if (!event || event.button !== 0) {
        return;
      }
      if (!this.isTableHeaderHovered) {
        return;
      }
      this.showDoughModal = true;
    },

    closeDoughModal: function() {
      this.showDoughModal = false;
    },

    formatNumber: function(value) {
      return this.toNumber(value).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
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

      var encoded = unescape(encodeURIComponent(String(value || '')));
      var bytes = new Uint8Array(encoded.length);
      for (var i = 0; i < encoded.length; ++i) {
        bytes[i] = encoded.charCodeAt(i);
      }
      return bytes;
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

    createZipRecord: function(signature, size) {
      var buffer = new ArrayBuffer(size);
      var view = new DataView(buffer);
      view.setUint32(0, signature, true);
      return {
        buffer: buffer,
        view: view,
        bytes: new Uint8Array(buffer)
      };
    },

    concatUint8Arrays: function(chunks) {
      var totalLength = 0;
      for (var i = 0; i < chunks.length; ++i) {
        totalLength += chunks[i].length;
      }

      var result = new Uint8Array(totalLength);
      var offset = 0;
      for (var chunkIndex = 0; chunkIndex < chunks.length; ++chunkIndex) {
        result.set(chunks[chunkIndex], offset);
        offset += chunks[chunkIndex].length;
      }

      return result;
    },

    createStoredZip: function(files) {
      var localChunks = [];
      var centralChunks = [];
      var localOffset = 0;

      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var nameBytes = this.encodeUtf8(file.name);
        var contentBytes = file.contentBytes;
        var crc32 = this.calculateCrc32(contentBytes);

        var localHeader = this.createZipRecord(0x04034b50, 30);
        localHeader.view.setUint16(4, 20, true);
        localHeader.view.setUint16(6, 0, true);
        localHeader.view.setUint16(8, 0, true);
        localHeader.view.setUint16(10, 0, true);
        localHeader.view.setUint16(12, 0, true);
        localHeader.view.setUint32(14, crc32, true);
        localHeader.view.setUint32(18, contentBytes.length, true);
        localHeader.view.setUint32(22, contentBytes.length, true);
        localHeader.view.setUint16(26, nameBytes.length, true);
        localHeader.view.setUint16(28, 0, true);

        localChunks.push(localHeader.bytes, nameBytes, contentBytes);

        var centralHeader = this.createZipRecord(0x02014b50, 46);
        centralHeader.view.setUint16(4, 20, true);
        centralHeader.view.setUint16(6, 20, true);
        centralHeader.view.setUint16(8, 0, true);
        centralHeader.view.setUint16(10, 0, true);
        centralHeader.view.setUint16(12, 0, true);
        centralHeader.view.setUint16(14, 0, true);
        centralHeader.view.setUint32(16, crc32, true);
        centralHeader.view.setUint32(20, contentBytes.length, true);
        centralHeader.view.setUint32(24, contentBytes.length, true);
        centralHeader.view.setUint16(28, nameBytes.length, true);
        centralHeader.view.setUint16(30, 0, true);
        centralHeader.view.setUint16(32, 0, true);
        centralHeader.view.setUint16(34, 0, true);
        centralHeader.view.setUint16(36, 0, true);
        centralHeader.view.setUint32(38, 0, true);
        centralHeader.view.setUint32(42, localOffset, true);

        centralChunks.push(centralHeader.bytes, nameBytes);

        localOffset += localHeader.bytes.length + nameBytes.length + contentBytes.length;
      }

      var centralDirectory = this.concatUint8Arrays(centralChunks);
      var endRecord = this.createZipRecord(0x06054b50, 22);
      endRecord.view.setUint16(4, 0, true);
      endRecord.view.setUint16(6, 0, true);
      endRecord.view.setUint16(8, files.length, true);
      endRecord.view.setUint16(10, files.length, true);
      endRecord.view.setUint32(12, centralDirectory.length, true);
      endRecord.view.setUint32(16, localOffset, true);
      endRecord.view.setUint16(20, 0, true);

      return this.concatUint8Arrays(localChunks.concat([centralDirectory, endRecord.bytes]));
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
        return '<c r="' + cellRef + '"' + styleAttr + '><v>' + this.toNumber(value) + '</v></c>';
      }

      return '<c r="' + cellRef + '" t="inlineStr"' + styleAttr + '><is><t>' + this.escapeXml(value) + '</t></is></c>';
    },

    buildXlsxWorksheetXml: function() {
      var rowsXml = [];
      var headerCells = [
        this.buildXlsxCell(1, 1, 'Тесто / Ингредиенты', 'string', 1),
        this.buildXlsxCell(2, 1, 'Кол-во (гр)', 'string', 1),
        this.buildXlsxCell(3, 1, 'Цена', 'string', 1)
      ];

      rowsXml.push('<row r="1">' + headerCells.join('') + '</row>');

      for (var i = 0; i < this.displayRows.length; ++i) {
        var row = this.displayRows[i] || {};
        var rowIndex = i + 2;
        var styleIndex = row.type === 'group-row' ? 2 : 0;

        rowsXml.push(
          '<row r="' + rowIndex + '">' +
            this.buildXlsxCell(1, rowIndex, String(row.name || ''), 'string', styleIndex) +
            this.buildXlsxCell(2, rowIndex, row.qtyGr, 'number', styleIndex) +
            this.buildXlsxCell(3, rowIndex, row.price, 'number', styleIndex) +
          '</row>'
        );
      }

      return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<dimension ref="A1:C' + (this.displayRows.length + 1) + '"/>' +
          '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
          '<sheetFormatPr defaultRowHeight="15"/>' +
          '<cols>' +
            '<col min="1" max="1" width="42" customWidth="1"/>' +
            '<col min="2" max="3" width="16" customWidth="1"/>' +
          '</cols>' +
          '<sheetData>' + rowsXml.join('') + '</sheetData>' +
        '</worksheet>'
      );
    },

    buildXlsxStylesXml: function() {
      return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<fonts count="2">' +
            '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
            '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
          '</fonts>' +
          '<fills count="3">' +
            '<fill><patternFill patternType="none"/></fill>' +
            '<fill><patternFill patternType="gray125"/></fill>' +
            '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FF"/><bgColor indexed="64"/></patternFill></fill>' +
          '</fills>' +
          '<borders count="1">' +
            '<border><left/><right/><top/><bottom/><diagonal/></border>' +
          '</borders>' +
          '<cellStyleXfs count="1">' +
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
          '</cellStyleXfs>' +
          '<cellXfs count="3">' +
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
            '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
          '</cellXfs>' +
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>'
      );
    },

    buildXlsxFileEntries: function() {
      var worksheetXml = this.buildXlsxWorksheetXml();
      var workbookXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets>' +
            '<sheet name="Отчет" sheetId="1" r:id="rId1"/>' +
          '</sheets>' +
        '</workbook>';

      var workbookRelsXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>';

      var rootRelsXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';

      var contentTypesXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>';

      return [
        { name: '[Content_Types].xml', contentBytes: this.encodeUtf8(contentTypesXml) },
        { name: '_rels/.rels', contentBytes: this.encodeUtf8(rootRelsXml) },
        { name: 'xl/workbook.xml', contentBytes: this.encodeUtf8(workbookXml) },
        { name: 'xl/_rels/workbook.xml.rels', contentBytes: this.encodeUtf8(workbookRelsXml) },
        { name: 'xl/worksheets/sheet1.xml', contentBytes: this.encodeUtf8(worksheetXml) },
        { name: 'xl/styles.xml', contentBytes: this.encodeUtf8(this.buildXlsxStylesXml()) }
      ];
    },

    downloadXlsxWorkbook: function() {
      var zipBytes = this.createStoredZip(this.buildXlsxFileEntries());
      var blob = new Blob(
        [zipBytes],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'sebestoimost_testa_' + new Date().toLocaleDateString('en-CA') + '.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },

    exportToExcel: function() {
      if (!Array.isArray(this.displayRows) || this.displayRows.length === 0) {
        this.makeToast('Нет данных для выгрузки', 'warning');
        return;
      }

      this.downloadXlsxWorkbook();
    },

    printReport: function() {
      if (!Array.isArray(this.displayRows) || this.displayRows.length === 0) {
        this.makeToast('Нет данных для печати', 'warning');
        return;
      }

      window.print();
    },

    // Backward-compatible alias in case HTML still references old handler name.
    exportToCsv: function() {
      this.exportToExcel();
    },

    escapeHtml: function(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    sendRequest: function(url, reqType, dataSend, doneCallback, failCallback) {
      $.ajax({
        url: url,
        type: reqType,
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: dataSend
      })
      .done(doneCallback)
      .fail(failCallback);
    },

    makeToast: function(text, alertClass, fadeTime) {
      var timeout = typeof fadeTime === 'number' ? fadeTime : 5000;
      var template = "<div id='toastAlert' class='alert alert-%class% alert-dismissable' style='width:360px; position:fixed; top:20px; right:20px; z-index:9999;'><a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a><span>%text%</span></div>";
      template = template.replace('%text%', text || '');
      template = template.replace('%class%', alertClass || 'info');

      $('#toastAlert').remove();
      $('body').append(template);

      if (timeout > 0) {
        $('#toastAlert').fadeOut(timeout);
      }
    }
  },

  mounted: function() {
    this.initializeRuntime();
    this.onReportClick();
  }
});
