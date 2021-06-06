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

**2) Define Optimal Suitability Parameters**

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

Temperature suitability is assessed for every month image. To acomplish this, two functions are created. The first iterates through the monthly images and defines suitability as areas with monthly mean temperatures that are within the optimal range. The second function iterates through the monthly images and defines suitability as areas that are above the minimum monthly temperature threshold. For this analysis, the only the mean temperature suitability of May, June, July, and August as well as the survivable areas in April are considered. 

```Java
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
```

The two functions need to be altered when analyzing the future climate data in order to account for the conversion from Celcius to Kelvin. Otherwise, the analysis is essentially the same. 

```Java
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
```

Finally, soil Ph suitability is assessed in a way that is similar to how precipitation suitability was assessed. Once again, since soil Ph suitability is considered to be static, there is no difference between the way soil Ph suitability is assessd in current and future climate scenarios. 

```Java
//Select optimal soil Ph
var op_ph_suit = divide_soil_10.gte(phopmn).and(divide_soil_10.lte(phopmx));
```

**4) Combined Suitability**

With each individual suitability threshold image calculated, the combined suitability image can be created. This is done by using fuzzy logic and the AND operator to identify areas that meet all the suitability thresholds.

```Java
//Select combined suitability using fuzzy AND operator
var combined_suit = op_ph_suit.and(op_temp_suit.and(op_precip_suit)).selfMask();
```

In the future climate scenario analysis, the final suitability includes the future suitability constraints.

```Java
//Select Combined suitability using fuzzy AND operator
var combine_suit_rcp85_2020 = op_ph_suit.and(op_temp_suit_rcp85_2020.and(op_precip_suit_rcp85_2020)).selfMask()
```

**5) Mapping the Results**

The final step is to display the combined suitability results. To do this, the map center is defined. Next, the visual parameters are set. Finally, the combined suitability image is added to the map. 

```Java
//Define map visual parameters
var visParams = {
  min:0,
  max:1,
  palette: ['white','blue']
}

//Define map center and add combined suitability layer to map
Map.setCenter(-100.55, 40.71, 4);
Map.addLayer(combined_suit, visParams, 'PRISM (2010)')
```

Once again, the future climate analysis is slightly different.

```Java
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
```

## Results:
After running the code, 4 images are added to the map. One image represents the current suitability and is based on the PRISM climate data. The other three are 3 different future climate scenarios. By changing the basemap to the satelite imagery and adjusting the transparency of the suitability layers, the results can be validated using a simple visual inspection. The results overlay quite nicely with current crop land. Furthermore, when compared to crop land cover data (included as an optional layer in the script), it is clear that corn is grown in the areas currently have the optimal suitability. Together, the visual inspection of the results indicates that the model is functioning properly and identifying areas where corn is grown. 

![](image)

## Discussion and Conclusions:
In terms of the implications of these results, it is clear that some areas that currently have the optimal conditions, may not have them in the future. This has the potential to have a serious impact on corn farmers in these areas and could require a different strategy. Furthermore, this analysis identifies some areas where the optimal conditions are expected to persist in multiple future climate scenarios. In the end, climate change is expected to improve suitability in some areas and diminish it in others. GEE allows users to compare multiple environmental datasets, adjust crop parameters, climate scenarios, and future time periods. This allows the code to be addapted for particular crops and geographies quite easily. 

## Future Work:
There are a number of ways that I intend to build on this project. I would like to learn how to pull crop parameters from a table that I load in as an asset. This will allow for the full extent of the ECOCROP database to be explored. Furthermore, as someone who is not very familiar with climate data, I would like to learn more about using different climate normal datasets and future climate scenarios. Also, I would like to see if there is someway to account for interannual variability that is lost with using climate normals. Finally, I would like to validate these results either empiracally by comparing yields across time (and suitabilty) or through interviews with real corn farmer. 
