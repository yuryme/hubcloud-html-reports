var vueApp = new Vue({
    el: "#root",
    data: {
        reportTitle: "New HubCloud Report",
        period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA"),
        period_to: new Date().toLocaleDateString("en-CA"),
        dataSourceMode: "hubcloud",
        mockDataUrl: "./mock-data.json",
        summaryCards: [],
        sections: []
    },
    computed: {
        periodLabel: function() {
            return "Report date: " + this.period_to;
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

        detectDataSourceMode: function() {
            var queryParameters = this.getQueryParameters();
            var requestedMode = (queryParameters.mode || "").toString().toLowerCase();

            if (requestedMode === "mock") {
                return "mock";
            }

            if (window.HC_QUERY_PARAMETERS && typeof window.HC_QUERY_PARAMETERS === "object") {
                return "hubcloud";
            }

            return "hubcloud";
        },

        formatCell: function(value) {
            if (value === null || typeof value === "undefined") {
                return "";
            }
            return String(value);
        },

        loadReport: function() {
            this.summaryCards = [
                { label: "Sections", value: "0" },
                { label: "Rows", value: "0" }
            ];
            this.sections = [];
        }
    },
    mounted: function() {
        this.dataSourceMode = this.detectDataSourceMode();
        this.loadReport();
    }
});
