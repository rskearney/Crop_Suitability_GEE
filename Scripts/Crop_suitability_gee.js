/* 

This code was created by Robert Kearney on : 2021-06-04

This code identifies the areas with the optimal climate and soil conditions for
growing Sweet Corn. Crop optimal suitability parameters are from the U.N. Food
and Agriculture Organization (FAO) EcoCrop database. The data analysed in this 
code includes PRISM 30-Year Climate Normals, NEX-DCP30 future climate scenarios
and SoilGrids Soil Ph. The suitability constraints considered in this analysis 
include annual precipitation, mean temperature in the growing season months (May
, June, July, August), minimuntemperature in April, and soil Ph. Finally suit-
ability is is created by using the Fuzzy AND operator to find where all suit-
abiluity constraints are met.

*/

/*
//Optional: Load crop landcover data
var dataset = ee.ImageCollection('USDA/NASS/CDL')
                  .filter(ee.Filter.date('2018-01-01', '2019-12-31'))
                  .first();
var cropLandcover = dataset.select('cropland');
//Optional: Add crop landcover layer to map
Map.addLayer(cropLandcover, {}, 'Crop Landcover');
*/

///Part 1: Current Suitability
//Load climate data
var precip_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("ppt");
var tmin_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("tmin");
var tmean_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("tmean");


//Load soil Ph data
var soil_band = ee.Image("projects/soilgrids-isric/phh2o_mean").select("phh2o_0-5cm_mean");


//Define crop parameters: Sweet corn
var ktmp = 0;
var topmn = 16;
var topmx = 24;
var ropmn = 800;
var ropmx = 1500;
var phopmn = 5.5;
var phopmx = 6.8;
var tkill = ktmp + 4;

//Calculate annual precipitation
var total_precip = precip_band.reduce(ee.Reducer.sum());

//Select optimal precipitation suitability
var op_precip_suit = total_precip.gte(ropmn).and(total_precip.lte(ropmx));

//Define optimal temperature suitability function
var op_temp_suit = function(image){
  return(image.gte(topmn).and(image.lte(topmx)))
}

//Define survival temperature function
var kill_temp = function(image2){
  return(image2.gte(tkill))
}

//Map optimal temperature suitabilty function and define as a list
var monthly_op_temp_suit_12 = tmean_band.map(op_temp_suit);
var op_temp_suit_12_list = monthly_op_temp_suit_12.toList(monthly_op_temp_suit_12.size());

//Map survival temperature function and define as a list
var monthly_kill_temp_12 = tmin_band.map(kill_temp);
var kill_temp_12_list = monthly_kill_temp_12.toList(monthly_kill_temp_12.size());

//Select relevant constraint images and select optimal temperature suitability
var op_temp_suit_may = ee.Image(op_temp_suit_12_list.get(4));
var op_temp_suit_june = ee.Image(op_temp_suit_12_list.get(5));
var op_temp_suit_july = ee.Image(op_temp_suit_12_list.get(6));
var op_temp_suit_august = ee.Image(op_temp_suit_12_list.get(7));
var op_kill_temp_april = ee.Image(kill_temp_12_list.get(3));
var op_temp_suit = op_temp_suit_may.and(op_temp_suit_june.and(op_temp_suit_july.and(op_temp_suit_august.and(op_kill_temp_april))));

//Divide soil Ph band by 10
var divide_soil_10 = soil_band.divide(10);

//Select optimal soil Ph
var op_ph_suit = divide_soil_10.gte(phopmn).and(divide_soil_10.lte(phopmx));

//Select combined suitability using fuzzy AND operator
var combined_suit = op_ph_suit.and(op_temp_suit.and(op_precip_suit)).selfMask();

//Define map visual parameters
var visParams = {
  min:0,
  max:1,
  palette: ['white','blue']
}

//Define map center and add combined suitability layer to map
Map.setCenter(-100.55, 40.71, 4);
Map.addLayer(combined_suit, visParams, 'PRISM (2010)')

///Part 2: Future Suitability #1
//Load future climate scenario
var datasetrcp85_2020 = ee.ImageCollection('NASA/NEX-DCP30_ENSEMBLE_STATS')
                  .filter(ee.Filter.date('2020-01-01', '2020-12-31')).filterMetadata('scenario', 'equals', 'rcp85');

//Define calculate mean temperature function
var meanMinMax = function(image){
  var meant = image.expression(
    '(tasmin_mean + tasmax_mean)*0.5',{ 
      'tasmin_mean': image.select('tasmin_mean'),
      'tasmax_mean': image.select('tasmax_mean')}).rename('meant');
    return image.addBands(meant)
}

//Map calculate mean temperature function
var monthly_rcp85_2020 = datasetrcp85_2020.map(meanMinMax);

//Select minimum and mean temperature bands
var monthly_meant_rcp85_2020 = monthly_rcp85_2020.select('meant');
var monthly_min_rcp85_2020 = monthly_rcp85_2020.select('tasmin_mean');

//Convert crop temperature paramerters to Kelvin:
var topmn_conv = topmn + 273.15;
var topmx_conv = topmx + 273.15;
var tkill_conv = tkill + 273.15;

//Define converted optimal temperature suitability function
var op_temp_suit_conv = function(image){
  return(image.gte(topmn_conv).and(image.lte(topmx_conv)))
}

//Define survival temperature function
var kill_temp_conv = function(image){
  return(image.gte(tkill_conv))
}

//Map converted optimal temperature suitabilty function and define result as a list
var monthly_op_temp_suit_12_rcp85_2020 = monthly_meant_rcp85_2020.map(op_temp_suit_conv);
var op_temp_suit_12_list_rcp85_2020 = monthly_op_temp_suit_12_rcp85_2020.toList(monthly_op_temp_suit_12_rcp85_2020.size());

//Map converted survival temperature function and define result as a list
var monthly_kill_temp_12_rcp85_2020 = monthly_min_rcp85_2020.map(kill_temp_conv);
var kill_temp_12_list_rcp85_2020 = monthly_kill_temp_12_rcp85_2020.toList(monthly_kill_temp_12_rcp85_2020.size());

//Select relevant constraint images and select optimal temperature suitability
var op_temp_suit_may_rcp85_2020 = ee.Image(op_temp_suit_12_list_rcp85_2020.get(4));
var op_temp_suit_june_rcp85_2020 = ee.Image(op_temp_suit_12_list_rcp85_2020.get(5));
var op_temp_suit_july_rcp85_2020 = ee.Image(op_temp_suit_12_list_rcp85_2020.get(6));
var op_temp_suit_august_rcp85_2020 = ee.Image(op_temp_suit_12_list_rcp85_2020.get(7));
var op_kill_temp_april_rcp85_2020 = ee.Image(kill_temp_12_list_rcp85_2020.get(3));
var op_temp_suit_rcp85_2020 = op_temp_suit_may_rcp85_2020.and(op_temp_suit_june_rcp85_2020.and(op_temp_suit_july_rcp85_2020.and(op_temp_suit_august_rcp85_2020.and(op_kill_temp_april_rcp85_2020)))).selfMask();

//Select precipitation band
var monthlyMeanPrecip_rate_rcp85_2020 = datasetrcp85_2020.select('pr_mean');

//Define precipitation conversion factor
var conversionF = 86400 * 30.4167;

//Define convert precipitation function
var Convert_mmMonth = function(image){
  return(image.multiply(conversionF))
};

//Map convert precipitation function, calculate annual precipitation total, and select optimal precipitation suitability
var monthly_mm_rcp85_2020 = monthlyMeanPrecip_rate_rcp85_2020.map(Convert_mmMonth);
var annualMeanPrecip_rcp85_2020 = monthly_mm_rcp85_2020.reduce(ee.Reducer.sum());
var op_precip_suit_rcp85_2020 = annualMeanPrecip_rcp85_2020.gte(ropmn).and(annualMeanPrecip_rcp85_2020.lte(ropmx));

//Select Combined suitability using fuzzy AND operator
var combine_suit_rcp85_2020 = op_ph_suit.and(op_temp_suit_rcp85_2020.and(op_precip_suit_rcp85_2020)).selfMask()

//Define map visual parameters
var suit_2020_Vis = {
  min: 0,
  max: 1,
  palette: ['white','green']
};

//Add combined suitability layer to map
Map.addLayer(
    combine_suit_rcp85_2020, suit_2020_Vis,
    'NEX-DCP30 RCP85 (2020)');
    

///Part 3: Future Suitability #2
//Load future climate scenario
var datasetrcp85_2040 = ee.ImageCollection('NASA/NEX-DCP30_ENSEMBLE_STATS')
                  .filter(ee.Filter.date('2040-01-01', '2040-12-31')).filterMetadata('scenario', 'equals', 'rcp85');

//Map calculate mean temperature function
var monthly_rcp85_2040 = datasetrcp85_2040.map(meanMinMax)

//Select minimum and mean temperature bands
var monthly_meant_rcp85_2040 = monthly_rcp85_2040.select('meant')
var monthly_min_rcp85_2040 = monthly_rcp85_2040.select('tasmin_mean')

//Map converted optimal temperature suitabilty function and define result as a list
var monthly_op_temp_suit_12_rcp85_2040 = monthly_meant_rcp85_2040.map(op_temp_suit_conv)
var op_temp_suit_12_list_rcp85_2040 = monthly_op_temp_suit_12_rcp85_2040.toList(monthly_op_temp_suit_12_rcp85_2040.size());

//Map converted survival temperature function and define result as a list
var monthly_kill_temp_12_rcp85_2040 = monthly_min_rcp85_2040.map(kill_temp_conv)
var kill_temp_12_list_rcp85_2040 = monthly_kill_temp_12_rcp85_2040.toList(monthly_kill_temp_12_rcp85_2040.size());

//Select relevant constraint images and select optimal temperature suitability
var op_temp_suit_may_rcp85_2040 = ee.Image(op_temp_suit_12_list_rcp85_2040.get(4))
var op_temp_suit_june_rcp85_2040 = ee.Image(op_temp_suit_12_list_rcp85_2040.get(5))
var op_temp_suit_july_rcp85_2040 = ee.Image(op_temp_suit_12_list_rcp85_2040.get(6))
var op_temp_suit_august_rcp85_2040 = ee.Image(op_temp_suit_12_list_rcp85_2040.get(7))
var op_kill_temp_april_rcp85_2040 = ee.Image(kill_temp_12_list_rcp85_2040.get(3))
var op_temp_suit_rcp85_2040 = op_temp_suit_may_rcp85_2040.and(op_temp_suit_june_rcp85_2040.and(op_temp_suit_july_rcp85_2040.and(op_temp_suit_august_rcp85_2040.and(op_kill_temp_april_rcp85_2040)))).selfMask()

//Select precipitation band
var monthlyMeanPrecip_rate_rcp85_2040 = datasetrcp85_2040.select('pr_mean');

//Map convert precipitation function, calculate annual precipitation total, and select optimal precipitation suitability
var monthly_mm_rcp85_2040 = monthlyMeanPrecip_rate_rcp85_2040.map(Convert_mmMonth)
var annualMeanPrecip_rcp85_2040 = monthly_mm_rcp85_2040.reduce(ee.Reducer.sum())
var op_precip_suit_rcp85_2040 = annualMeanPrecip_rcp85_2040.gte(ropmn).and(annualMeanPrecip_rcp85_2040.lte(ropmx));

//Select Combined suitability using fuzzy AND operator
var combine_suit_rcp85_2040 = op_ph_suit.and(op_temp_suit_rcp85_2040.and(op_precip_suit_rcp85_2040)).selfMask()

//Define map visual parameters
var suit_2040_Vis = {
  min: 0,
  max: 1,
  palette: ['white','yellow']
};

//Add combined suitability layer to map
Map.addLayer(
    combine_suit_rcp85_2040, suit_2040_Vis,
    'NEX-DCP30 RCP85 (2040)');

///Part 4: Future Suitability #3
//Load future climate scenario
var datasetrcp85_2060 = ee.ImageCollection('NASA/NEX-DCP30_ENSEMBLE_STATS')
                  .filter(ee.Filter.date('2060-01-01', '2060-12-31')).filterMetadata('scenario', 'equals', 'rcp85');

//Map calculate mean temperature function
var monthly_rcp85_2060 = datasetrcp85_2060.map(meanMinMax)

//Select minimum and mean temperature bands
var monthly_meant_rcp85_2060 = monthly_rcp85_2060.select('meant')
var monthly_min_rcp85_2060 = monthly_rcp85_2060.select('tasmin_mean');

//Map converted optimal temperature suitabilty function and define result as a list
var monthly_op_temp_suit_12_rcp85_2060 = monthly_meant_rcp85_2060.map(op_temp_suit_conv)
var op_temp_suit_12_list_rcp85_2060 = monthly_op_temp_suit_12_rcp85_2060.toList(monthly_op_temp_suit_12_rcp85_2060.size());

//Map converted survival temperature function and define result as a list
var monthly_kill_temp_12_rcp85_2060 = monthly_min_rcp85_2060.map(kill_temp_conv)
var kill_temp_12_list_rcp85_2060 = monthly_kill_temp_12_rcp85_2060.toList(monthly_kill_temp_12_rcp85_2060.size());

//Select relevant constraint images and select optimal temperature suitability
var op_temp_suit_may_rcp85_2060 = ee.Image(op_temp_suit_12_list_rcp85_2060.get(4))
var op_temp_suit_june_rcp85_2060 = ee.Image(op_temp_suit_12_list_rcp85_2060.get(5))
var op_temp_suit_july_rcp85_2060 = ee.Image(op_temp_suit_12_list_rcp85_2060.get(6))
var op_temp_suit_august_rcp85_2060 = ee.Image(op_temp_suit_12_list_rcp85_2060.get(7))
var op_kill_temp_april_rcp85_2060 = ee.Image(kill_temp_12_list_rcp85_2060.get(3))
var op_temp_suit_rcp85_2060 = op_temp_suit_may_rcp85_2060.and(op_temp_suit_june_rcp85_2060.and(op_temp_suit_july_rcp85_2060.and(op_temp_suit_august_rcp85_2060.and(op_kill_temp_april_rcp85_2060)))).selfMask()

//Select precipitation band
var monthlyMeanPrecip_rate_rcp85_2060 = datasetrcp85_2060.select('pr_mean');

//Map convert precipitation function, calculate annual precipitation total, and select optimal precipitation suitability
var monthly_mm_rcp85_2060 = monthlyMeanPrecip_rate_rcp85_2060.map(Convert_mmMonth)
var annualMeanPrecip_rcp85_2060 = monthly_mm_rcp85_2060.reduce(ee.Reducer.sum())
var op_precip_suit_rcp85_2060 = annualMeanPrecip_rcp85_2060.gte(ropmn).and(annualMeanPrecip_rcp85_2060.lte(ropmx));

//Select Combined suitability using fuzzy AND operator
var combine_suit_rcp85_2060 = op_ph_suit.and(op_temp_suit_rcp85_2060.and(op_precip_suit_rcp85_2060)).selfMask()

//Define map visual parameters
var suit_2060_Vis = {
  min: 0,
  max: 1,
  palette: ['white','orange']
};

//Add combined suitability layer to map
Map.addLayer(
    combine_suit_rcp85_2060, suit_2060_Vis,
    'NEX-DCP30 RCP85 (2060)');

/*
//Optional: Create a geometry representing an export region.
var geometry = ee.Geometry.Rectangle([-77, 39, -75, 41]);

//Optional: Export the image, specifying scale and region.
Export.image.toDrive({
  image: combined_suit,
  description: 'CornSuitabilityGEE',
  scale: 250,
  region: geometry,
  crs: 'EPSG:3857'
});
*/