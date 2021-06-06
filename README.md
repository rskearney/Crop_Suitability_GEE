# Crop Suitability Modeling using GEE
According to the United Nations (U.N.), an estimated 925 million people are suffering from hunger. Additionally, the U.N. Food and Agriculture Organization (FAO) estimates that by 2050, a 60% increase in food production will be required to feed a global population of 9.3 billion people. Finally, agriculture is one of the sectors most affected by climate change, a phenomenon that isolates farmers, mainly small-scale ones, from formerly agricultural lands. To meet these challenges head on, farmers need to know what crops will grow best on their land and prepare for future climate change impacts. 

## Introduction:
The objective of this project is to indentify areas with the optimal environmental conditions for growing sweet corn. The study area for this project is the United States. Optimal suitability is mapped using historic and future climate data to illustrate how climate change will impact which area are expected to have optimal suitability in the future. The results will indicate which areas have histoically had the optimal environmental conditions for growing sweet corn and if they are expected to persist in the future. Areas where the optimal environmental conditions are not expected to persitst may want to consider planting different cultivars or crop species. In the end, the results are intended to inform farmers in the identified areas about the potential climate change impacts and prepare them for these impacts. 

## Methods:
The crop suitability model was developed using Google Earth Engine (GEE). GEE is a web-based software that runs in your browser and is free for those who have a google account and sign up for it. GEE allows users to generate code using the Javascript programming language to do geographic analysis on publicly available datasets stored in Google's cloud platform. Much of the analysis entails repeating the same process using current and future climate data, rather than explain what every line does, I will instead focus on the how the methods differ when using different climate datasets. 

**1) Import and prepare data**
The climate variables being considered in this suitability model are annual precipitation (mm), monthly mean temperature (Celcius), and monthly minimum temperature (Celcius). The minimum and mean temperature bands in the PRISM image collection do not need to be converted because they are represented as degrees Celcius. However, the PRISM precipitation band represents monthly precipitation and annual precipitation is required. 

```Java
// Load Climate Data

var precip_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("ppt");
var tmin_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("tmin");
var tmean_band = ee.ImageCollection("OREGONSTATE/PRISM/Norm81m").select("tmean");
```

The minimum and mean temperature bands in the PRISM image collection do not need to be converted because they are represented as degrees celcius. However, the PRISM precipitation band represents monthly precipitation and annual precipitation is required. A reducer is used to calculate the sum of all monthly precipitation images.

```Java
//Calculate annual precipitation
var total_precip = precip_band.reduce(ee.Reducer.sum());
```

Importing the future climate data requires a slightly different method. Filtering is required to select the future timeframe and relative concentration pathway. 

```Java
//Load future climate scenario
var datasetrcp85_2020 = ee.ImageCollection('NASA/NEX-DCP30_ENSEMBLE_STATS')
                  .filter(ee.Filter.date('2020-01-01', '2020-12-31')).filterMetadata('scenario', 'equals', 'rcp85');
```

Once imported, further preperation is required to get the data in the proper units. In this part, a function is defined that contains an image expression. The expression calculates the mean temperature by computing the average of the monthly mean minimum temperature and the monthly mean maximum temperature and adds the new band to the image collection. The temperature units in the future climate scenario are in degrees Kelvin. The code is designed to use these units in the future climate scenario analysis. 

```Java
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

Future precipitation data is represented as kg/sq m/s. To convert this value to monthly precipitation, the conversion factor is defined. Since a kg of water over 1 sq m is eqivalent to 1 mm, and there are 86,400 seconds in a day, the daily precipitation can be calculated by multiplying the native precipitation units by 86,400. Furthermore, the monthly precipitation can be calculated by mulitplying the daily precipitation rate by the 30.4167 (the average number of days in a month). A function is defined that multiplies the future climate precipitation data by the conversion factor. Finally, a reducer is used to calculate the annual precipitation.

```Java
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

```

For this analysis the soil data is considered static across different future time periods. As such, there is no difference in the way soil Ph suitability is calculated in the current and future climate scenarios. However, since the soil Ph data in its native format represents soil Ph x 10, the data needs to be transformed into standard Ph values. This is done by dividing Soil Ph by 10. 

```Java
//Divide soil Ph band by 10
var divide_soil_10 = soil_band.divide(10);
```

**2)Define Optimal Suitability Parameters**
Now that the data has been processed and is in the desired units, the optimal suitability parameters for corn are defined. These parameters are from the ECOCROP database that came with the installation of TerrSet. The temperature parameters are in degrees Celcius. The "ktmp" is the temperature that will kill corn. The "topmn" is the optimal monthly minimum mean temperature. The "topmx" is the optimal monthly maximum mean temperature. All the precipitation parameters are in milimeters. The "ropmn" is the optimal minimum annual precipitation. The "ropmx" is the optimal minimum annual precipitation. Soil Ph is measured as Ph in water. The "phopmn" is the optimal minimum Ph in water. The "phopmx" is the optimal maximum Ph in water. The "tkill" is the minimum monthly temperature that corn will survive.  

```Java
//Define crop parameters: Sweet corn
var ktmp = 0;
var topmn = 16;
var topmx = 24;
var ropmn = 800;
var ropmx = 1500;
var phopmn = 5.5;
var phopmx = 6.8;
var tkill = ktmp + 4;
```

When working with the future climate data, the only changes that need to be made to the crop parameters is the conversion of the temperature parameters from Celcius to Kelvin. This is done by adding 273.15 to the original temperature parameters. 

```Java
//Convert crop temperature paramerters to Kelvin:
var topmn_conv = topmn + 273.15;
var topmx_conv = topmx + 273.15;
var tkill_conv = tkill + 273.15;
```

**3) Assess Suitability**
With the data layers prepared and the crop parameters set, suitability can now be assessed. Areas are considered suitable if they fall within the optimal ranges for temperature, precipitation and soil Ph. The resulting suitability images are boolean images with a value of 1 representing areas that fall within the optimal ranges and a value of 0 for areas that do not. For example, areas that meet the precipitation suitability threshold have annual precipitation values that are greater than or equal to "ropmn" and less than or equal to "ropmx". 

```Java
//Select optimal precipitation suitability
var op_precip_suit = total_precip.gte(ropmn).and(total_precip.lte(ropmx));
```

## Results:
## Discussion and Conclusions:
## Future Work:
