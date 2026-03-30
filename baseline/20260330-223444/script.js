var vueApp = new Vue({
    el: '#root',
    delimiters: ['[[', ']]'],
    data: {
      isWaiting: true,  
      partners: [],
      partners_totals: [],
      partners_data: [],
      docs_data: [],    
      invoices_data: [],
      payments_data: [],
      report_data:[],
      table_items:[],
      partnerId: 0,
      dataSourceMode: "hubcloud",
      mockDataUrl: "./mock-data.json",
      borderless:true,
      bordered:true,
      
      period_from: new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).toLocaleDateString('en-CA'),
      period_to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('en-CA'),
      DateStart: "2022-11-01 00:00:00", 
      DateFinish: "2022-11-06 23:59:59",
      
      mas_tab:[],
      summaryCards: [
        { key: "sections", label: "Разделов", value: "0", note: "Секций в отчете" },
        { key: "products", label: "Изделий", value: "0", note: "Колонок продукции" },
        { key: "rows", label: "Строк", value: "0", note: "Ингредиентов и итогов" },
        { key: "total", label: "Итого", value: "0.000", note: "Сумма по всем секциям" }
      ],
      ingredientModalVisible: false,
      ingredientModalStyle: {},
      ingredientSummaryRows: [],
      ingredientSummaryTotal: 0,
      ingredientModalHideTimer: null,
      ingredientModalAnchor: null,
      
      stickyHeader: "700px",
      noCollapse: false,   
      fields: [ {
                    key: 'title',
                    label: 'Клиент',
                //    formatter: 'fullName'
                },
                {   
                    key: 'market',
                    label: 'Маркеты',
                },

              ],
      
    modal_title:"",
    modal_contetn_src:"",
    modal_size:"",
//      period_from: Date.today().set({day: 1}).toString("yyyy-MM-ddT00:00:00"),
//      period_to: Date.today().toString("yyyy-MM-ddT23:59:59"),
//      dateStartPreviousDayEnd: Date.today().set({day: 1, hour: 23, minute: 59}).addDays(-1),
    },
    computed: {
      formattedPeriodLabel: function() {
          if (!this.period_from && !this.period_to) {
              return "Период не выбран";
          }

          if (this.period_from === this.period_to) {
              return "Дата отчета: " + this.period_from;
          }

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

      applyPeriodFromQuery: function() {
          var queryParameters = this.getQueryParameters();
          var sourceDate = queryParameters["$h.date"] || queryParameters["h.date"] || queryParameters["date"];
          var normalizedDate = this.normalizeDateValue(sourceDate);

          if (normalizedDate) {
              this.period_from = normalizedDate;
              this.period_to = normalizedDate;
          }
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
          this.dataSourceMode = this.detectDataSourceMode();
          this.applyPeriodFromQuery();
      },

      executeDatasourceRequest: function(config, doneCallback, failCallback) {
          if (this.dataSourceMode === "mock") {
              $.getJSON(this.mockDataUrl)
                  .done(function(mockResponse){
                      var normalizedResponse = mockResponse;

                      if (Array.isArray(mockResponse)) {
                          normalizedResponse = {
                              isOK: true,
                              data: mockResponse
                          };
                      } else if (!mockResponse || typeof mockResponse !== "object" || !("isOK" in mockResponse)) {
                          normalizedResponse = {
                              isOK: true,
                              data: []
                          };
                      }

                      doneCallback(normalizedResponse);
                  })
                  .fail(function(jqXHR, textStatus, errorThrown){
                      failCallback(jqXHR, textStatus, errorThrown);
                  });

              return;
          }

          var payload = JSON.stringify(config);
          var url = "/api/v1/datasource/execute/";

          this.sendRequest(url, "POST", payload, doneCallback, failCallback);
      },
        
//      fullName(value) {
//        return `${value}`;
//     },  

      onReportClick2:function() {
       
       
        this.isWaiting = true;
        console.log(this.isWaiting);
        this.mas_tab=[];
        this.resetSummaryCards();

        this.setSize();
            $(window).resize(function () {
              //this.setListSize();
         }.bind(this));

          this.isWaiting = true;
          
     //   console.log("load1");        
    //    this.DateStart=this.period_from.toString("yyyy-MM-dd");
  //      this.DateFinish=this.period_to.toString("yyyy-MM-dd");
        
        this.loadPartners();
       
        console.log(this.mas_tab);
        
        //console.log("PartnerChange partnerId: ", this.partnerId);
      },
  
      onAllShowHide: function () {
        var allRows = this.report_data.filter(x=>x.kind > 1);
          for(var item of allRows){
              item.isVisible = !item.isVisible;
          }
      },    
      
      onPartnerClick: function(row){
          
          console.log("row clicked", row);
          this.modal_title=row.title;
          $('#modal_top_form').appendTo("body").modal('show');
          
         // var slaveRows = this.report_data.filter(x=>x.parent == row.id);
          
          
        //  for(var item of slaveRows){
        //      item.isVisible = !item.isVisible;
        //  }
          
          //console.log("slave rows", slaveRows);
          
          
      }, // onPartnerClick
   
  
      
      loadPartners: function(){
          
            this.isWaiting = true;
            this.DateStart = this.toPeriodBoundary(this.period_from, false);
            this.DateFinish = this.toPeriodBoundary(this.period_to, true);
            
         //   console.log("DateStart", this.DateStart);
         //   console.log("DateFinish", this.DateFinish);
    
            // Config to call data sources.
            var ds_qvery=`

                    catalog.номенклатура | Select (id, группа) | GetTitle () as группа;
                  
                  
                    TempTable.группа | Select (id, группа as группа_1, группа_title as группа_1_title) as группа_1;
                    
                    TempTable.группа | Select (id, группа as группа_2, группа_title as группа_2_title) as группа_2;
                    
                    рецепты_2 | Select (номенклатура_выход, номенклатура_вход, колво_г_на_ед_и_100_г, колво_на_1_ед, колво_на_100_г, колво_на_1000_г) | GetTitle () as рецепт;
                    
                    TempTable.рецепт | Select (номенклатура_выход as номенклатура_вых_2_передел, номенклатура_выход_title as номенклатура_вых_2_передел_title, номенклатура_вход as номенклатура_вх_2_передел, номенклатура_вход_title as номенклатура_вх_2_передел_title, колво_на_100_г as колво_на_100_г_2 ) as рецепт_2;
                    
                    
                    плюсминус | template (3) | Period (${this.DateStart}, ${this.DateFinish}) | деньночь (1) | GroupBy (номенклатура, колво as необходимо_шт) | GetTitle () 
                    | LeftJoinAuto (группа, номенклатура = группа.id)
                    | LeftJoinAuto (рецепт, номенклатура = рецепт.номенклатура_выход)
                    | LeftJoinAuto (группа_1, номенклатура_вход = группа_1.id) | NOT группа (5)
                    | Compute (колво_всего, колво_на_1000_г * необходимо_шт / 1000) 
               
                    | Compute ( колво_2_итого, колво_всего) | OrderBy ( номенклатура_выход_title, номенклатура_вход_title)
                     | ORDERBY(номенклатура_выход_title)  as tab6; 

temptable.tab6 | группа_1 (2,3,6) | ComputeFunction (r, номенклатура_выход = номенклатура_вход ? 1 : 0) | Having (r = 0) | LeftJoinAuto (рецепт_2, номенклатура_вход = рецепт_2.номенклатура_вых_2_передел) | LeftJoinAuto (группа_2, номенклатура_вх_2_передел = группа_2.id) | группа_2 (1) | Compute (кол2, колво_всего * колво_на_100_г_2 / 100) 
| ComputeFunction (x, номенклатура_вых_2_передел = номенклатура_вх_2_передел ? 1 : 0) | Having (x = 0) | GroupBy (номенклатура_вход as номенклатура, номенклатура_вход_title as номенклатура_title, колво_всего as необходимо_шт, номенклатура_вых_2_передел as номенклатура_выход, номенклатура_вых_2_передел_title as номенклатура_выход_title, номенклатура_вх_2_передел as номенклатура_вход, номенклатура_вх_2_передел_title as номенклатура_вход_title, кол2 as колво_2_итого) | Compute (колво_всего, колво_2_итого) | UnionAll (tab6)
 
                  
  `;
          //console.log(ds_qvery);
             
            
           var config = {
               expression: ds_qvery,
               applyDimensionRights: true,
           };
           
           this.executeDatasourceRequest(config, 
                function(responseData){
                    
                    //console.log("partners", responseData);
                    var responseItems = Array.isArray(responseData.data) ? responseData.data : [];
                    
                    if (responseData.isOK && responseItems.length > 0){
                        
                      //  this.partners = responseData.data;
                       // console.log(this.partners);
                          var source = [];
                          
                          var NameTab="";
                          var i=0;
                          var i_str=[];
                          
                          var col_i=1;
                          var col_name="col"+col_i;
                          var nom_title="";
                          for(var item of responseItems){
                              if( (NameTab!==item["номенклатура_выход_title"])  )
                              {
                                  //if(i==0){}
                                  nom_title=item["номенклатура_title"]; 
                                  col_i=1;

////////////Р”обавление колонок 
                                    var obj={
                                        "num":i,
                                        "cols":["col1"],
                                        "name":item["номенклатура_выход_title"],
                                        "fields":[ 
                                                {  
                                                    key: 'name',
                                                    label: '',
                                                },
                                                {  
                                                    key:  'col1',
                                                    label: item["номенклатура_title"],
                                                }                                                
                                                
                                        ],
                                        "items":[],
                                    };
                                  
                                    this.mas_tab[i]=obj;
////////////////////////////////////


                                  if(i_str.length>0){
                                  //  console.log("im",i);     
                                    //console.log("items",i_str);   
                                  //  console.log(this.mas_tab[i]);   
                                    this.mas_tab[i-1].items=i_str.slice();
                                  }
                                  
                                  i_str=[];


                                  var obj_str={
                                       "name":"шт",
                                       "col1":item["необходимо_шт"]
                                  };
                                  i_str.push(obj_str);
                                  
                                  obj_str={
                                       "name":"∑ "+item["номенклатура_выход_title"]
,                                       "col1":0,
                                       _rowVariant: 'info'
                                  };
                                  i_str.push(obj_str);
                                  
                                  obj_str={
                                       "name":"   ├ "+item["номенклатура_вход_title"],
                                       "col1":item["колво_2_итого"],
                                  };
                                  i_str.push(obj_str)                                  
                                  
                                  
                                    
                                    
///////////// Р”ля след знаС‡ения Цикл                                   
                                    NameTab=item["номенклатура_выход_title"];
                                    i++;
//////////////////                                    
                              }else
                              {
                                  if(nom_title!==item["номенклатура_title"])
                                  {
                                    col_i++;
                                    col_name="col"+col_i;                 
                                    i_str[0][col_name]=item["необходимо_шт"];
                                    
                                  //   console.log("item",i_str[0]); 
                                     
                                    var fel= {  
                                                    key:  col_name,
                                                    label: item["номенклатура_title"],
                                                };
                                                
                              //      console.log(this.mas_tab[i]); 
                                    this.mas_tab[i-1].fields.push(fel);
                                    nom_title=item["номенклатура_title"];   
                                  }
                                  
                             //     obj_str={
                            //           "name":"   ├ "+item.номенклаС‚ура_РІС…_2_передел_title,
                                  ////     "col1":item.колво_2_итого
                              //    };
                             //     col_name="col"+col_i; 
                            //      obj_str[col_name]=item.колво_2_итого;
                                  
                                  //console.log(obj_str);
                                  
                                  var s_name="   ├ "+item["номенклатура_вход_title"];
                                  col_name="col"+col_i; 
                                  i_str=this.AddInem_arr(i_str, s_name, col_name,item["колво_2_итого"]);
                                //  i_str.push(obj_str);
                                  
                                  
                              }
                              
                              
                              
                          } 
                        //Р”обавляем последние РґаннС‹е  
                       this.mas_tab[i-1].items=i_str.slice();                          
                          
                       
                       this.Tab_Items_Summ();
                       this.updateSummaryCards();
                       console.log(this.mas_tab);   
                          

    
                         // console.log(this.table_items);
                          //window.bus.sources["partners"] = source;
                      //  console.log(this.partners);
                        
                     //   makeToast('КонС‚рагенС‚С‹ проС‡РёС‚анС‹', "success");
                     
                    }
                    else if (responseData.isOK) {
                        this.mas_tab = [];
                        this.resetSummaryCards();
                        this.makeToast("Нет данных для выбранного периода", "warning");
                    }
                    else{
                        this.makeToast(responseData.message, "danger");
                    }
                    this.isWaiting = false;
                    
                }.bind(this), 
                function(jqXHR, textStatus, errorThrown){
                    
                     console.log( textStatus, errorThrown);
                     this.makeToast(textStatus, "danger");
                     this.isWaiting = false;
                    
                }.bind(this));
          
          
            }, // loadPartners

    resetSummaryCards: function() {
      this.summaryCards = [
        { key: "sections", label: "Разделов", value: "0", note: "Секций в отчете" },
        { key: "products", label: "Изделий", value: "0", note: "Колонок продукции" },
        { key: "rows", label: "Строк", value: "0", note: "Ингредиентов и итогов" },
        { key: "total", label: "Итого", value: "0.000", note: "Сумма по всем секциям" }
      ];
    },

    updateSummaryCards: function() {
      var sectionCount = this.mas_tab.length;
      var productCount = 0;
      var rowCount = 0;
      var totalSum = 0;

      for (var tabIndex = 0; tabIndex < this.mas_tab.length; ++tabIndex) {
        var tab = this.mas_tab[tabIndex];

        productCount += Math.max((tab.fields || []).length - 2, 0);
        rowCount += (tab.items || []).length;

        if (tab.items && tab.items.length > 1 && typeof tab.items[1].sum !== "undefined") {
          totalSum += parseFloat(tab.items[1].sum || 0);
        }
      }

      this.summaryCards = [
        { key: "sections", label: "Разделов", value: String(sectionCount), note: "Секций в отчете" },
        { key: "products", label: "Изделий", value: String(productCount), note: "Колонок продукции" },
        { key: "rows", label: "Строк", value: String(rowCount), note: "Ингредиентов и итогов" },
        { key: "total", label: "Итого", value: totalSum.toFixed(3), note: "Сумма по всем секциям" }
      ];
    },

    onSummaryCardEnter: function(event, card) {
      if (!card || card.key !== "rows") {
        return;
      }

      if (this.ingredientModalHideTimer) {
        clearTimeout(this.ingredientModalHideTimer);
        this.ingredientModalHideTimer = null;
      }

      this.refreshIngredientSummary();
      this.showIngredientModal(event.currentTarget);
    },

    onSummaryCardLeave: function(card) {
      if (!card || card.key !== "rows") {
        return;
      }

      this.scheduleIngredientModalHide();
    },

    onSummaryCardFocus: function(event, card) {
      if (!card || card.key !== "rows") {
        return;
      }

      this.refreshIngredientSummary();
      this.showIngredientModal(event.currentTarget);
    },

    onSummaryCardBlur: function(card) {
      if (!card || card.key !== "rows") {
        return;
      }

      this.scheduleIngredientModalHide();
    },

    onSummaryCardClick: function(event, card) {
      if (!card || card.key !== "rows") {
        return;
      }

      if (this.ingredientModalVisible) {
        this.hideIngredientModal(true);
        return;
      }

      this.refreshIngredientSummary();
      this.showIngredientModal(event.currentTarget);
    },

    onSummaryCardKeydown: function(event, card) {
      if (!card || card.key !== "rows") {
        return;
      }

      var key = event && event.key ? event.key : "";
      if (key === "Enter" || key === " " || key === "Spacebar") {
        event.preventDefault();
        this.onSummaryCardClick(event, card);
      }
    },

    onIngredientModalEnter: function() {
      if (this.ingredientModalHideTimer) {
        clearTimeout(this.ingredientModalHideTimer);
        this.ingredientModalHideTimer = null;
      }
    },

    onIngredientModalLeave: function() {
      this.scheduleIngredientModalHide();
    },

    showIngredientModal: function(targetElement) {
      if (!targetElement) {
        return;
      }

      this.ingredientModalAnchor = targetElement;
      this.positionIngredientModal(targetElement);
      this.ingredientModalVisible = true;
    },

    hideIngredientModal: function(immediate) {
      if (this.ingredientModalHideTimer) {
        clearTimeout(this.ingredientModalHideTimer);
        this.ingredientModalHideTimer = null;
      }

      this.ingredientModalVisible = false;

      if (immediate) {
        this.ingredientModalAnchor = null;
      }
    },

    scheduleIngredientModalHide: function() {
      if (this.ingredientModalHideTimer) {
        clearTimeout(this.ingredientModalHideTimer);
      }

      this.ingredientModalHideTimer = setTimeout(function() {
        this.hideIngredientModal(true);
      }.bind(this), 180);
    },

    positionIngredientModal: function(targetElement) {
      if (!targetElement) {
        return;
      }

      var rect = targetElement.getBoundingClientRect();
      var modalWidth = 430;
      var top = rect.bottom + 10;
      var left = rect.left;

      if (left + modalWidth > window.innerWidth - 12) {
        left = window.innerWidth - modalWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      this.ingredientModalStyle = {
        top: top + "px",
        left: left + "px"
      };
    },

    syncIngredientModalPosition: function() {
      if (!this.ingredientModalVisible || !this.ingredientModalAnchor) {
        return;
      }

      this.positionIngredientModal(this.ingredientModalAnchor);
    },

    handleIngredientModalEsc: function(event) {
      if (event.key === "Escape" && this.ingredientModalVisible) {
        this.hideIngredientModal(true);
      }
    },

    cleanIngredientName: function(name) {
      if (!name) {
        return "";
      }

      return name
        .toString()
        .replace(/[^\S\r\n]+/g, " ")
        .replace(/[├└┌│•]/g, "")
        .trim();
    },

    refreshIngredientSummary: function() {
      var ingredientTotals = {};

      for (var tabIndex = 0; tabIndex < this.mas_tab.length; ++tabIndex) {
        var tab = this.mas_tab[tabIndex];
        var tabItems = tab.items || [];

        for (var rowIndex = 0; rowIndex < tabItems.length; ++rowIndex) {
          var row = tabItems[rowIndex];
          if (!row || row._rowVariant === "info") {
            continue;
          }

          var ingredientName = this.cleanIngredientName(row.name);
          if (!ingredientName || ingredientName === "шт") {
            continue;
          }

          var rowTotal = parseFloat(row.sum || 0);
          if (!ingredientTotals[ingredientName]) {
            ingredientTotals[ingredientName] = 0;
          }
          ingredientTotals[ingredientName] += rowTotal;
        }
      }

      var rows = [];
      var total = 0;
      for (var key in ingredientTotals) {
        if (!Object.prototype.hasOwnProperty.call(ingredientTotals, key)) {
          continue;
        }

        rows.push({
          name: key,
          total: ingredientTotals[key]
        });
        total += ingredientTotals[key];
      }

      rows.sort(function(a, b) { return b.total - a.total; });

      this.ingredientSummaryRows = rows;
      this.ingredientSummaryTotal = total;
    },

    formatIngredientTotal: function(value) {
      return (parseFloat(value || 0)).toFixed(3);
    },

    formatCellValue: function(value) {
      if (value === null || typeof value === "undefined" || value === "") {
        return "";
      }

      var numberValue = Number(value);
      if (isNaN(numberValue)) {
        return String(value);
      }

      return numberValue.toFixed(3);
    },

    printIngredientSummary: function() {
      this.refreshIngredientSummary();

      var rowsHtml = "";
      for (var i = 0; i < this.ingredientSummaryRows.length; ++i) {
        var item = this.ingredientSummaryRows[i];
        rowsHtml += "<tr><td>" + item.name + "</td><td style='text-align:right;'>" + this.formatIngredientTotal(item.total) + "</td></tr>";
      }

      if (!rowsHtml) {
        rowsHtml = "<tr><td colspan='2'>Нет данных</td></tr>";
      }

      var printableHtml = `
        <div style="padding:16px;background:#fff;">
          <h2 style="margin:0 0 12px;font-size:24px;">Список уникальных ингредиентов</h2>
          <div style="margin-bottom:12px;color:#64748b;">Период: ${this.period_from} - ${this.period_to}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #d1d9e2;">Ингредиент</th>
                <th style="text-align:right;padding:8px;border-bottom:1px solid #d1d9e2;">Расход</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td style="padding:8px;border-top:1px solid #d1d9e2;font-weight:700;">Итого</td>
                <td style="padding:8px;border-top:1px solid #d1d9e2;text-align:right;font-weight:700;">${this.formatIngredientTotal(this.ingredientSummaryTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;

      openPrintPreview(printableHtml, "Печать списка ингредиентов");
    },
    Tab_Items_Summ: function() {
      
   //  console.log("dddd");   
      for (var t_i = 0; t_i < this.mas_tab.length; ++t_i) {
          
          for (var index = 2; index < this.mas_tab[t_i].items.length; ++index) {
             for (var key in this.mas_tab[t_i].items[index]) {
                 if(key!=="name")
                 {
                   
                   if(this.mas_tab[t_i].items[1][key]>0)
                   {
                    this.mas_tab[t_i].items[1][key]=this.mas_tab[t_i].items[1][key]+(this.mas_tab[t_i].items[index][key]);
                   }else
                   {
                    this.mas_tab[t_i].items[1][key]=(this.mas_tab[t_i].items[index][key]);   
                   }
                   //округление
                 //  s_num=this.mas_tab[t_i].items[1][key];
                 //  s_num=s_num.toFixed(3);
                 //  this.mas_tab[t_i].items[1][key]=s_num;
                   
                //   this.mas_tab[t_i].items[1][key]=this.mas_tab[t_i].items[1][key].toFixed(3);
                   
                //   console.log(key);   
                 }
             }
              
          }
      }
      
      
///////////////Суммирование посС‚роС‡но РёС‚ог      
          for (var t_i2 = 0; t_i2 < this.mas_tab.length; ++t_i2) {
            for (var index2 = 0; index2 < this.mas_tab[t_i2].items.length; ++index2) {
            
               var summ=0;    
               for (var key3 in this.mas_tab[t_i2].items[index2]) {
                   
               
                       if(key3==="col1" || key3==="col2" || key3==="col3" || key3==="col4" || key3==="col5" || key3==="col6" || key3==="col7" || key3==="col8" || key3==="col9" || key3==="col10" || key3==="col11")
                         {
                               summ = summ + parseFloat(this.mas_tab[t_i2].items[index2][key3]);

                         }
              
                        
                }
               this.mas_tab[t_i2].items[index2]["sum"] = summ;
          
            }
            
            var obj= {  
                     key: 'sum',
                     label: 'Итого'
                  };
          this.mas_tab[t_i2].fields.push(obj);
            
        }
///////////////////      
      
 
 /*     
      
      for (t_i2 = 0; t_i2 < this.mas_tab.length; ++t_i2) {
       for (var key2 in this.mas_tab[t_i2].items[1]) {
                 if(key==("col1"))
                 {
                   s_num=this.mas_tab[t_i2].items[1][key2];
                   s_num=parseFloat(s_num).toFixed(2); 
                   this.mas_tab[t_i2].items[1][key2]=s_num;
               //    console.log(s_num);  
                 }
       }
          
      }
*/
      
          
    },
     
     
      AddInem_arr: function(i_str, s_name, col_name,nums) {
          var iss_add = true;
          
          for (var index = 0; index < i_str.length; ++index) {
              
              if(i_str[index].name==s_name)
              {
                 i_str[index][col_name]=nums;
                 iss_add=false;
              }
              
            }
        if(iss_add)
        {
           var obj_str={ "name":s_name};
           obj_str[col_name]=nums; 
           i_str.push(obj_str);
           
        }
            
        return i_str;
      }, //AddInem_arr
      
    
      
      sendRequest(url, reqType, dataSend, doneCallback, failCallback) {
    
            $.ajax({
                    url: url,
                    type: reqType,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: dataSend
                })
                .done(doneCallback)
                .fail(failCallback);
    
      }, // sendRequest
      
      makeToast: function(text, alertClass, fadeTime = 5000){
            
            var template = "<div id='toastAlert' class='alert alert-%class% alert-dismissable' style='width:300px; position:fixed; top:20px; right:50px;z-index:9999;'><a href= '#' class='close' data-dismiss='alert' aria-label='close' >&times; </a><span>%text%</span></div>";
            template = template.replace("%text%", text);
            template = template.replace("%class%", alertClass);
    
            $("#toastAlert").remove();
            $("body").append(template);
    
            if (fadeTime > 0) {
                $("#toastAlert").fadeOut(fadeTime);
            }
            
        }, // makeToast
        
        setSize: function(){
            
            var h = $(window).height();
            var w = $(window).width();
            
          let tableHeight = (h - 220) + "px";
          $("#table-container").css("max-height", tableHeight);
            
        }, // setSize
   
    }, // methods
    
     mounted: function(){
            
          //console.log("query parameters", window.HC_QUERY_PARAMETERS);
      
        this.setSize();
            $(window).resize(function () {
              this.syncIngredientModalPosition();
         }.bind(this));

          window.addEventListener("scroll", this.syncIngredientModalPosition, true);
          document.addEventListener("keydown", this.handleIngredientModalEsc);

          this.initializeRuntime();
          this.isWaiting = true;
         
          this.loadPartners();
       }, // mounted

     beforeDestroy: function() {
          window.removeEventListener("scroll", this.syncIngredientModalPosition, true);
          document.removeEventListener("keydown", this.handleIngredientModalEsc);
       }
  });


var printPreviewOverlay = null;
var printPreviewEscHandler = null;

function openPrintPreview(contentHtml, previewTitle) {
    if (printPreviewOverlay) {
        closePrintPreview(false);
    }

    var overlay = document.createElement("div");
    overlay.className = "print-preview-overlay";

    var titleText = previewTitle || "Предпросмотр печати";

    overlay.innerHTML = `
      <div class="print-preview-dialog">
        <div class="print-preview-toolbar">
          <div class="print-preview-title">${titleText}</div>
          <div class="print-preview-actions">
            <button type="button" class="print-preview-btn primary" data-action="print">Печать</button>
            <button type="button" class="print-preview-btn" data-action="close">Закрыть</button>
          </div>
        </div>
        <div class="print-preview-content" id="print-preview-content">${contentHtml}</div>
      </div>
    `;

    document.body.appendChild(overlay);
    printPreviewOverlay = overlay;

    // Trigger transition on the next frame.
    requestAnimationFrame(function() {
        overlay.classList.add("is-visible");
    });

    overlay.addEventListener("click", function(event) {
        var actionElement = event.target.closest("[data-action]");
        if (actionElement) {
            if (actionElement.getAttribute("data-action") === "print") {
                window.print();
            } else {
                closePrintPreview();
            }
            return;
        }

        if (event.target === overlay) {
            closePrintPreview();
        }
    });

    printPreviewEscHandler = function(event) {
        if (event.key === "Escape") {
            closePrintPreview();
        }
    };
    document.addEventListener("keydown", printPreviewEscHandler);
}

function closePrintPreview(withAnimation) {
    if (!printPreviewOverlay) {
        return;
    }

    if (printPreviewEscHandler) {
        document.removeEventListener("keydown", printPreviewEscHandler);
        printPreviewEscHandler = null;
    }

    var overlayToRemove = printPreviewOverlay;
    printPreviewOverlay = null;

    if (withAnimation === false) {
        overlayToRemove.remove();
        return;
    }

    overlayToRemove.classList.remove("is-visible");
    setTimeout(function() {
        overlayToRemove.remove();
    }, 220);
}

function toPrint() {
    var printSourceElement = document.getElementById("div_to_print");
    if (!printSourceElement) {
        return;
    }

    openPrintPreview(printSourceElement.innerHTML, "Предпросмотр печати");
}

window.addEventListener("afterprint", function() {
    closePrintPreview();
});

 function onReportClicked21() 
 {
    console.log("key");    
     
 }








