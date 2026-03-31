var vueApp = new Vue({
    el: '#root',
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
    showIngredientsModal: false,
    ingredientSummaryRows: [],
//      period_from: Date.today().set({day: 1}).toString("yyyy-MM-ddT00:00:00"),
//      period_to: Date.today().toString("yyyy-MM-ddT23:59:59"),
//      dateStartPreviousDayEnd: Date.today().set({day: 1, hour: 23, minute: 59}).addDays(-1),
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
            ds_qvery=`

                    catalog.номенклатура | Select (id, группа) | GetTitle () as Группа; // Группу нужно подтянуть к номенклатуре (номенклатура здесь - это хлеб)
                  
                  
                    TempTable.группа | Select (id, группа as группа_1, группа_title as группа_1_title) as Группа_1; // Группу_1 подтянем к номенклатуре первого передела, в общем смысле это Тесто
                    
                    TempTable.группа | Select (id, группа as группа_2, группа_title as группа_2_title) as Группа_2; // Группу_2 подтянем к номенклатуре второго передела, в общем смысле это из чего состоит Тесто
                    
                    рецепты_2 | Select (номенклатура_выход, номенклатура_вход, колво_г_на_ед_и_100_г, колво_на_1_ед, колво_на_100_г, колво_на_1000_г) | GetTitle () as Рецепт; //таблица ингредиентов, подтянем к первому переделу - к тесту
                    
                    TempTable.рецепт | Select (номенклатура_выход as номенклатура_вых_2_передел, номенклатура_выход_title as номенклатура_вых_2_передел_title, номенклатура_вход as номенклатура_вх_2_передел, номенклатура_вход_title as номенклатура_вх_2_передел_title, колво_на_100_г  as колво_на_100_г_2 ) as Рецепт_2; //таблица ингредиентов, подтянем ко второму переделу - к тому из чего Тесто состоит
                    
                    
                    плюсминус | template (3) | Period (   ${this.DateStart}, ${this.DateFinish} )  | деньночь (1)  |   GroupBy (номенклатура, колво as необходимо_шт) | GetTitle () 
                    | LeftJoinAuto (группа, номенклатура = группа.id )  
                    | LeftJoinAuto (рецепт, номенклатура = рецепт.номенклатура_выход ) 
                    | LeftJoinAuto (группа_1, номенклатура_вход = группа_1.id ) | NOT группа (5)
                    | Compute (колво_всего, колво_на_1000_г* необходимо_шт/1000) 
               
                    | Compute ( колво_2_итого, колво_всего) | OrderBy ( номенклатура_выход_title, номенклатура_вход_title)
                     | ORDERBY(номенклатура_выход_title)  as tab6; 

temptable.tab6 | группа_1 (2,3,6) | ComputeFunction (r, номенклатура_выход=номенклатура_вход?1:0) | Having (r=0) | LeftJoinAuto (рецепт_2, номенклатура_вход= рецепт_2.номенклатура_вых_2_передел) |  LeftJoinAuto (группа_2, номенклатура_вх_2_передел= группа_2.id ) | группа_2 (1)   | Compute (кол2, колво_всего*колво_на_100_г_2/100 ) 
| ComputeFunction (x, номенклатура_вых_2_передел=номенклатура_вх_2_передел?1:0) | Having (x=0)   |  GroupBy ( номенклатура_вход as номенклатура, номенклатура_вход_title as номенклатура_title, колво_всего as необходимо_шт, номенклатура_вых_2_передел as номенклатура_выход, номенклатура_вых_2_передел_title as номенклатура_выход_title, номенклатура_вх_2_передел as номенклатура_вход, номенклатура_вх_2_передел_title as номенклатура_вход_title,  кол2 as колво_2_итого) | Compute (колво_всего, колво_2_итого) | UnionAll (tab6)                  
 
                  
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
                    
                    if (responseData.isOK && responseItems.length>0){
                        
                      //  this.partners = responseData.data;
                       // console.log(this.partners);
                          var source = [];
                          
                          NameTab="";
                          i=0;
                          var i_str=[];
                          
                          col_i=1;
                          col_name="col"+col_i;
                          nom_title="";
                          for(var item of responseItems){
                              if( (NameTab!==item.номенклатура_выход_title)  )
                              {
                                  //if(i==0){}
                                  nom_title=item.номенклатура_title; 
                                  col_i=1;

////////////Добавление колонок 
                                    obj={
                                        "num":i,
                                        "cols":["col1"],
                                        "name":item.номенклатура_выход_title,
                                        "fields":[ 
                                                {  
                                                    key: 'name',
                                                    label: '',
                                                },
                                                {  
                                                    key:  'col1',
                                                    label: item.номенклатура_title,
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


                                  obj_str={
                                       "name":"шт",
                                       "col1":item.необходимо_шт
                                  };
                                  i_str.push(obj_str);
                                  
                                  obj_str={
                                       "name":"⏷"+item.номенклатура_выход_title
,                                       "col1":0,
                                       _rowVariant: 'info'
                                  };
                                  i_str.push(obj_str);
                                  
                                  obj_str={
                                       "name":"   ├ "+item.номенклатура_вход_title,
                                       "col1":item.колво_2_итого,
                                  };
                                  i_str.push(obj_str)                                  
                                  
                                  
                                    
                                    
///////////// Для след значения Цикл                                   
                                    NameTab=item.номенклатура_выход_title;
                                    i++;
//////////////////                                    
                              }else
                              {
                                  if(nom_title!==item.номенклатура_title)
                                  {
                                    col_i++;
                                    col_name="col"+col_i;                 
                                    i_str[0][col_name]=item.необходимо_шт;
                                    
                                  //   console.log("item",i_str[0]); 
                                     
                                    fel= {  
                                                    key:  col_name,
                                                    label: item.номенклатура_title,
                                                };
                                                
                              //      console.log(this.mas_tab[i]); 
                                    this.mas_tab[i-1].fields.push(fel);
                                    nom_title=item.номенклатура_title;   
                                  }
                                  
                             //     obj_str={
                            //           "name":"   ├ "+item.номенклатура_вх_2_передел_title,
                                  ////     "col1":item.колво_2_итого
                              //    };
                             //     col_name="col"+col_i; 
                            //      obj_str[col_name]=item.колво_2_итого;
                                  
                                  //console.log(obj_str);
                                  
                                  s_name="   ├ "+item.номенклатура_вход_title;
                                  col_name="col"+col_i; 
                                  i_str=this.AddInem_arr(i_str, s_name, col_name,item.колво_2_итого);
                                //  i_str.push(obj_str);
                                  
                                  
                              }
                              
                              
                              
                          } 
                        //Добавляем последние данные  
                        this.mas_tab[i-1].items=i_str.slice();                          
                          
                       
                       this.Tab_Items_Summ();
                       console.log(this.mas_tab);   
                          

    
                         // console.log(this.table_items);
                          //window.bus.sources["partners"] = source;
                      //  console.log(this.partners);
                        
                     //   makeToast('Контрагенты прочитаны', "success");
                     
                    }
                    else{
                        makeToast(responseData.message, "danger");
                    }
                    this.isWaiting = false;
                    
                }.bind(this), 
                function(jqXHR, textStatus, errorThrown){
                    
                     console.log( textStatus, errorThrown);
                     makeToast(textStatus, "danger");
                     this.isWaiting = false;
                    
                }.bind(this));
          
          
      }, // loadPartners
      
    Tab_Items_Summ: function() {
      
   //  console.log("dddd");   
      for (t_i = 0; t_i < this.mas_tab.length; ++t_i) {
          
          for (index = 2; index < this.mas_tab[t_i].items.length; ++index) {
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
      
      
///////////////Суммирование построчно итог      
          for (t_i = 0; t_i < this.mas_tab.length; ++t_i) {
            for (index = 0; index < this.mas_tab[t_i].items.length; ++index) {
            
               summ=0;    
               for (var key3 in this.mas_tab[t_i].items[index]) {
                   
               
                       if(key3=="col1" || key3=="col2" || key3=="col3" || key3=="col4" || key3=="col5" || key3=="col6" || key3=="col7" || key3=="col8" || key3=="col9" || key3=="col10" || key3=="col11")
                         {
                               summ=summ+parseFloat(this.mas_tab[t_i].items[index][key3]);

                         }
              
                        
                }
               this.mas_tab[t_i].items[index]["sum"] =summ;
          
            }
            
            obj= {  
                     key: 'sum',
                     label: 'Итого'
                  };
          this.mas_tab[t_i].fields.push(obj);
            
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
          iss_add=true;
          
          for (index = 0; index < i_str.length; ++index) {
              
              if(i_str[index].name==s_name)
              {
                 i_str[index][col_name]=nums;
                 iss_add=false;
              }
              
            }
        if(iss_add)
        {
           obj_str={ "name":s_name};
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

        formatCell: function(value) {
            if (value === null || typeof value === "undefined" || value === "") {
                return "";
            }
            var numberValue = parseFloat(value);
            if (isNaN(numberValue)) {
                return String(value);
            }
            return numberValue.toFixed(3);
        },

        getSectionCount: function() {
            return Array.isArray(this.mas_tab) ? this.mas_tab.length : 0;
        },

        getProductCount: function() {
            if (!Array.isArray(this.mas_tab)) {
                return 0;
            }
            var total = 0;
            for (var i = 0; i < this.mas_tab.length; ++i) {
                var tab = this.mas_tab[i] || {};
                var fields = Array.isArray(tab.fields) ? tab.fields : [];
                total += Math.max(fields.length - 2, 0);
            }
            return total;
        },

        getRowCount: function() {
            if (!Array.isArray(this.mas_tab)) {
                return 0;
            }
            var total = 0;
            for (var i = 0; i < this.mas_tab.length; ++i) {
                var tab = this.mas_tab[i] || {};
                var items = Array.isArray(tab.items) ? tab.items : [];
                total += items.length;
            }
            return total;
        },

        getUniqueIngredientCount: function() {
            return this.getIngredientSummaryRows().length;
        },

        normalizeIngredientName: function(rawName) {
            var value = (rawName || "").toString().trim();
            if (!value) {
                return "";
            }
            return value.replace(/^[^A-Za-zА-Яа-я0-9]+/, "").trim();
        },

        getIngredientSummaryRows: function() {
            if (!Array.isArray(this.mas_tab)) {
                return [];
            }

            var totalsByIngredient = {};

            for (var i = 0; i < this.mas_tab.length; ++i) {
                var tab = this.mas_tab[i] || {};
                var items = Array.isArray(tab.items) ? tab.items : [];

                for (var rowIndex = 2; rowIndex < items.length; ++rowIndex) {
                    var row = items[rowIndex] || {};
                    var ingredientName = this.normalizeIngredientName(row.name);
                    if (!ingredientName) {
                        continue;
                    }

                    var rowSum = parseFloat(row.sum);
                    if (isNaN(rowSum)) {
                        rowSum = 0;
                    }

                    if (!totalsByIngredient[ingredientName]) {
                        totalsByIngredient[ingredientName] = 0;
                    }
                    totalsByIngredient[ingredientName] += rowSum;
                }
            }

            var result = [];
            for (var ingredient in totalsByIngredient) {
                if (Object.prototype.hasOwnProperty.call(totalsByIngredient, ingredient)) {
                    result.push({
                        name: ingredient,
                        sum: totalsByIngredient[ingredient]
                    });
                }
            }

            result.sort(function(a, b) {
                return a.name.localeCompare(b.name, "ru");
            });

            return result;
        },

        getIngredientSummaryTotal: function() {
            var rows = this.getIngredientSummaryRows();
            var total = 0;
            for (var i = 0; i < rows.length; ++i) {
                total += parseFloat(rows[i].sum || 0);
            }
            return total;
        },

        openIngredientsModal: function() {
            this.ingredientSummaryRows = this.getIngredientSummaryRows();
            this.showIngredientsModal = true;
        },

        closeIngredientsModal: function() {
            this.showIngredientsModal = false;
        },

        printIngredientsSummary: function() {
            var rows = Array.isArray(this.ingredientSummaryRows) && this.ingredientSummaryRows.length > 0
                ? this.ingredientSummaryRows
                : this.getIngredientSummaryRows();

            var tableRowsHtml = "";
            for (var i = 0; i < rows.length; ++i) {
                var row = rows[i] || {};
                tableRowsHtml += "<tr><td>" + this.escapeHtml(row.name || "") + "</td><td style='text-align:right;'>" + this.formatCell(row.sum) + "</td></tr>";
            }

            if (!tableRowsHtml) {
                tableRowsHtml = "<tr><td colspan='2'>Нет данных за выбранный период</td></tr>";
            }

            var printHtml =
                "<html><head><meta charset='utf-8'><title>Ингредиенты</title>" +
                "<style>" +
                "body{font-family:Segoe UI,Arial,sans-serif;padding:18px;color:#1f2f45;}" +
                "h2{margin:0 0 8px;font-size:16px;}" +
                ".meta{margin:0 0 12px;color:#4a5d78;font-size:10px;}" +
                "table{width:100%;border-collapse:collapse;}" +
                "th,td{border:1px solid #bfcde0;padding:6px 8px;}" +
                "th{background:#e8eef7;text-align:left;}" +
                "</style></head><body>" +
                "<h2>Ингредиенты</h2>" +
                "<p class='meta'>Уникальных: " + this.formatKpi(this.getUniqueIngredientCount()) +
                " | Общая сумма: " + this.formatKpi(this.getIngredientSummaryTotal()) + "</p>" +
                "<table><thead><tr><th>Ингредиент</th><th>Сумма</th></tr></thead><tbody>" +
                tableRowsHtml +
                "</tbody></table></body></html>";

            var popup = window.open("", "_blank");
            if (!popup) {
                return;
            }

            popup.document.open();
            popup.document.write(printHtml);
            popup.document.close();
            popup.focus();
            popup.print();
            popup.close();
        },

        escapeHtml: function(value) {
            var stringValue = String(value || "");
            return stringValue
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        },

        getTotalValue: function() {
            if (!Array.isArray(this.mas_tab)) {
                return 0;
            }
            var total = 0;
            for (var i = 0; i < this.mas_tab.length; ++i) {
                var tab = this.mas_tab[i] || {};
                var items = Array.isArray(tab.items) ? tab.items : [];
                if (items.length > 1 && typeof items[1].sum !== "undefined") {
                    total += parseFloat(items[1].sum || 0);
                }
            }
            return total;
        },

        formatKpi: function(value) {
            var numberValue = parseFloat(value || 0);
            if (isNaN(numberValue)) {
                return "0";
            }
            if (Math.abs(numberValue) >= 1000) {
                return numberValue.toLocaleString("ru-RU", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
            }
            if (Math.abs(numberValue % 1) > 0) {
                return numberValue.toFixed(3);
            }
            return numberValue.toFixed(0);
        },
   
    }, // methods
    
     mounted: function(){
            
          //console.log("query parameters", window.HC_QUERY_PARAMETERS);
      
        this.setSize();
            $(window).resize(function () {
              //this.setListSize();
         }.bind(this));

          this.initializeRuntime();
          this.isWaiting = true;
         
          this.loadPartners();
       }, // mounted
  });


function toPrint() {
        //alert("To Print");
        
//     var printContents = document.getElementById("div_to_print").innerHTML;
 //    var originalContents = document.body.innerHTML;
   //    document.body.innerHTML = "<html><head><title></title></head><body>" + printContents + "</body>";
   //    window.print();
   //    document.body.innerHTML = originalContents;        
     
style_s=`
<html>
<style>
    table{ 
                border: solid black 1px;
                border-collapse: collapse;
        
    }
    
     td {
         border: 1px solid black;
         padding: .3em 1em;  
    }
    
    th {
         border: 1px solid black;
         padding: .3em 1em;  
    }
   
  #tab_in_mas_tab{
    break-inside: avoid;
  } 

</style>
<body>
`;     
w=window.open();
w.document.write(style_s+ $('#div_to_print').html()+"</body></html>");
w.print();
w.close();     
     
    }

 function onReportClicked21() 
 {
    console.log("key");    
     
 }
