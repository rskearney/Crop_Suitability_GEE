# Crop Suitability Modeling using GEE
According to the United Nations (U.N.), an estimated 925 million people are suffering from hunger. Additionally, the U.N. Food and Agriculture Organization (FAO) estimates that by 2050, a 60% increase in food production will be required to feed a global population of 9.3 billion people. Finally, agriculture is one of the sectors most affected by climate change, a phenomenon that isolates farmers, mainly small-scale ones, from formerly agricultural lands. To meet these challenges head on, farmers need to know what crops will grow best on their land and prepare for future climate change impacts. 

## Introduction:
The objective of this project is to indentify areas with the optimal environmental conditions for growing sweet corn. The study area for this project is the United States. Optimal suitability is mapped using historic and future climate data to illustrate how climate change will impact which area are expected to have optimal suitability in the future. The results will indicate which areas have histoically had the optimal environmental conditions for growing sweet corn and if they are expected to persist in the future. Areas where the optimal environmental conditions are not expected to persitst may want to consider planting different cultivars or crop species. In the end, the results are intended to inform farmers in the identified areas about the potential climate change impacts and prepare them for these impacts. 

## Methods:
The crop suitability model was developed using Google Earth Engine (GEE). GEE is a web-based software that runs in your browser and is free for those who have a google account and sign up for it. GEE allows users to generate code using the Javascript programming language to do geographic analysis on publicly available datasets stored in Google's cloud platform. Since much of the analysis entails repeating the same process using differnet climate datasets, I will focus on the main methods and how they differ when using differnet climate datasets. 

To begin, the climate and soil data is loaded into GEE.

```Java
// Load Climate Data

var precip_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("ppt");
var tmin_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("tmin");
var tmean_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("tmean");

//Load Soil PH Data

var soil_band = ee.Image("projects/soilgrids-isric/phh2o_mean").select("phh2o_0-5cm_mean");
```
Notice that only annual precipitation total, monthly mean temperature, monthly minimum temperature, and soil Ph are considered.

When loading in future climate scenario's different methods are used to prepare the data. Below is the method used for preparing the temperature data.

```Java
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
```
Notice that here, a function is defined that contains an image expression. The expression calculates the mean temperature by computing the average of the monthly mean minimum temperature and the monthly mean maximum temperature and adds the new band to the image collection. 

Below is the method for preparing the precipitation data. 

```Java
//Select precipitation band
var monthlyMeanPrecip_rate_rcp85_2020 = datasetrcp85_2020.select('pr_mean');

//Define precipitation conversion factor
var conversionF = 86400 * 30.4167

//Define convert precipitation function
var Convert_mmMonth = function(image){
  return(image.multiply(conversionF))
}

//Map convert precipitation function, calculate annual precipitation total, and select optimal precipitation suitability
var monthly_mm_rcp85_2020 = monthlyMeanPrecip_rate_rcp85_2020.map(Convert_mmMonth)
```

## Results:
## Discussion and Conclusions:
## Future Work:
