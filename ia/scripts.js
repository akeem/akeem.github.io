var missingDataGraphParams = {
  title: "Instant Article Views",
  animate_on_load: true,
  missing_is_zero: true,
  description: "Instant Articles for the requested page views",
  chart_type: 'missing-data',
  missing_text: 'Query for insights',
  target: '#chart',
  full_width: true,
  height: 300,
  x_label: 'Dates',
  y_label: 'Visitors',
  show_tooltips: true,
  right: 50,
  legend: ['All traffic', 'Android', 'IOS'],
};

var dataGraphParams = {
  title: "Instant Article Views",
  animate_on_load: true,
  missing_is_zero: true,
  description: "Instant Articles for the requested page views",
  area: false,
  full_width: true,
  height: 300,
  target: '#chart',
  x_accessor: 'time',
  y_accessor: 'value',
  x_label: 'Dates',
  y_label: 'Visitors',
  show_tooltips: true,
  right: 50,
  legend: ['All traffic', 'Android', 'IOS'],
};

$(document).ready(function(){
  MG.data_graphic(missingDataGraphParams);
});

function renderGraph(data){
  for(var i = 0; i < data.length; i++) {
    MG.convert.date(data[i], 'time', "%Y-%m-%d");
  }

  dataGraphParams["data"] = data;
  MG.data_graphic(dataGraphParams);
}

function populateDataTable(table, data){
  var table = $(table).DataTable({
    retrieve: true,
    dom: 'rBtip',
    columns: [
      {data: 'time', title: "Date", type: "date"},
      {data: 'value', title: "Visitors"},
      {data: 'android', title: "Android"},
      {data: 'ios', title: "IOS"},
    ],
    paging: false,
    buttons: [ {extend: 'csv', text: 'Export to CSV'} ]
  });

  table.clear().rows.add(data).draw();
}

function formatDailyData(data){
  _.each(data, function(group){
    _.each(group, function(dayData){
      dayData.time = moment(dayData.time).format("YYYY-MM-DD");
      dayData.value = parseInt(dayData.value);
    });
  });
}

function getVisitData(params, params2){
  var publisherID = document.getElementById('pubID').value;

  FB.api(publisherID, 'get', params, function(response) {
    FB.api(publisherID, 'get', params2, function(response2) {
      if (!!response.instant_articles_insights) {
        var byPlatform= _.groupBy(response2.instant_articles_insights.data,
          function(currentDayData){
            return currentDayData.breakdowns.platform;
          });

        var totalDailyVisitors = response.instant_articles_insights.data;
        var allData = [];

        if(!_.isEmpty(totalDailyVisitors)){
          allData.push(totalDailyVisitors);
        }

        if(!_.isEmpty(byPlatform["ANDROID"])){
          allData.push(byPlatform["ANDROID"]);
        }

        if(!_.isEmpty(byPlatform["IOS"])){
          allData.push(byPlatform["IOS"]);
        }

        var mergedData = mergeData(allData[0], allData[1], allData[2]);
        formatDailyData(allData)
        renderGraph(allData);
        populateDataTable("#table", mergedData);

    } else {
      missingDataGraphParams["missing_text"] = "Insights is unavailable for the window requested";
      MG.data_graphic(missingDataGraphParams);
    }
  });
});
}

function getStats() {
  var startOfRange = document.getElementById('rangeStart').value;
  var endOfRange = document.getElementById('rangeEnd').value;

  if(_.isEmpty(startOfRange)){
    startOfRange = "90 days ago";
  }

  if(_.isEmpty(endOfRange)){
    endOfRange = "now";
  }

  var allViewsParams = {
    fields:
    'instant_articles_insights.metric(all_views).period(day).since('+startOfRange+').until('+endOfRange+')'
  };

  var allViewsByPlatformParams = {
    fields:
    'instant_articles_insights.metric(all_views).breakdown(platform).period(day).since('+startOfRange+').until('+endOfRange+')'
  };

  FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
      getVisitData(allViewsParams, allViewsByPlatformParams);
    } else {
      FB.login();
    }
  });
}

function mergeData(totalVisitorData,
                   androidVisitorData,
                   iosVisitorData){

 _.each(totalVisitorData, function(current){
   var androidMatch = _.find(androidVisitorData, function(x){
     return moment(x.time).isSame(current.time);
   });

   var iosMatch = _.find(iosVisitorData, function(y){
     return moment(y.time).isSame(current.time);
   });

   if(androidMatch){
     current['android'] = androidMatch['value'];
   }else{
     current['android'] = 0;
   }

   if(iosMatch){
     current['ios'] = iosMatch['value'];
   }else{
     current['ios'] = 0;
   }
 });

 return totalVisitorData;
}
