///House Keeping///
//Author         - Warren Kavanagh 
//Student Number - C16463344
//Date           - 10/11/2019 

///Description///
//The purpose of this script is to connect to a BBC microbit over a bluetooth link
//The script will access the bluetooth profile of the BBC Microbit, reading the services 
//and associated characteristicss of these services, it will then  upload these characteristic 
//readings to an mqtt broker. The rapsberry pi will be subscribed to the topics that are being 
//published to and write these values to a sql and time series database 

///Database Assumstions///
//This script assumes there is a database in mariadb and influx db called 'BBCData'
//In mariadb this script access the database through the account:
//Username:myuser
//Password:dit
//The account and database must be set up BEFORE running this script 
//The tables inside the database are created inside the script 

///BBCSetup Assumstions///
//The following setup is assumed of the BBC microbit:
//1.BBC Microbit     : UUID = c92615562689, Local Name = WarrenBBC
//2.LED Service      : UUID = a000, R/W characteristic UUID = a001
//3.Accel Service    : UUID = a012, R characteristic UUID   = a013, a014, a015
//4.Button A Service : UUID = 1eee, R/N characteristic UUID = 2019
//5.Mag Service      : UUID = fff3, R characteristic UUID   = 1, 2, 3

///Modules required///:
// noble   - BLE module to establish bluetooth conection, API: https://github.com/noble/noble
// mqtt    - MQTT module to communicate with MQTT server, API: https://github.com/mqttjs/MQTT.js 
// mariadb - The mariadb node module to connect to use the functionality of mariabdb https://mariadb.com/kb/en/library/connector-nodejs-promise-api/#promise-api-documentation 
// Influx  - The influx library used to write to time series database 
var noble = require('@abandonware/noble'); 
var mqtt = require('mqtt');
const mariadb = require('mariadb/callback');
const Influx = require('influx');

///MQTT related setup///
//mqtt.connect - connects to the broker specfied by the url given to it, returns client object 
//acceltopic   - The name of the accelerometer topic to publish to 
//magtopic     - The name of the magnotometer topic to publish to 
//LEDTopic     - The name of the LED topic to subscribe to 
//buttontopic  - The name of the button topic to pub/sub too
var mqttClient  = mqtt.connect('mqtt://broker.mqttdashboard.com'); //url f the mqtt broker to connect to 
var acceltopic  = "Accel_Topic";
var magtopic    = "Mag_Topic";
var LEDtopic    = "LED_Topic";
var buttontopic = "Button_Topic"; 

///BLE related setup///
//peripheralOfInterest     - Local name given to peripheral to connnect to 
//peripheralOfInterestUUID - UUID of the peripheral to connnet to 
//serviceOfInterestUuids   - Particular services of BLE peripheral we are interested in
//accel_UUID               - UUID for accelerometer
//mag_UUID                 - UUID for magnetometer 
//button_UUID              - UUID for button A
//allowDuplicates          - Set to false to not allow duplicate peripheral to be returned for discovery event
//characteristicOfInterest - Characteritic of interest, set to false as all characteristics to be captured 
//notifChars               - The notify UUID charactersitic of the button 
//accelcharsUUID           - Contains the Accelerometer Characteristics UUID's
//accelchars               - Array to hold Accelerometer characteristic objects
//magcharsUUID             - Contains the Magnetometer Characteristics UUID's
//magchars                 - Array to hold Magnetometer characteristic objects
//LEDcharUUID              - Contains the LED's characteristic UUID to be written to 
//LEDchar                  - Variable to hold the LED characteristic to write to   
var peripheralOfInterest     = 'WarrenBBC';
var peripheralOfInterestUUID = 'c92615562689';
var accel_UUID               ='a012';
var mag_UUID                 ='fff3';
var button_UUID              ='1eee'
var serviceOfInterestUuids   = ['a000', 'a012','1eee','fff3']; 
var allowDuplicates          = false; 
var characteristicOfInterest = 0; 
var notifChars               = ['2019'];
var accelcharsUUID           = ['a013','a014','a015'];
var accelchars               = [];
var magcharsUUID             = ['1','2','3'];
var magchars                 = [];
var LEDcharUUID              = ['a001'];
var LEDchar           
var accelaxis                = ['X','Y','Z'];
var magaxis                  = ['X','Y','Z'];
var accelcount               = 0;
var magcount                 = 0;

///Mariadb related setup///
//conn - Connecting to the database  usingthe user "myuser"
//Read the database values every 10 seconds with the retrieveData function 
const conn = mariadb.createConnection({host:"localhost",user:"myuser",password:"dit",database:"BBCData"});
setInterval(retrieveSQLData, 10000);

//Crete the AccelData table
//If the table already exists just use existing table 
conn.query((
"create table AccelData ("+
"Device_ID varchar(20),"+
"Sensor_ID varchar(20),"+
"Location varchar(20),"+
"Axis varchar(20),"+
"Value varchar(20),"+
"Units varchar(20),"+
"TS DATETIME(6) NOT NULL,"+
"PRIMARY KEY (TS));"), 
function (err,res){
	if(err == null){
		console.log("AccelData table created in database BBCData");
	}
	else if (err.code =="ER_TABLE_EXISTS_ERROR"){
		console.log("WARNING table AccelData already in exisistentnce, existing table will be used")
	}});

//Crete the MagData table
//If the table already exists just use existing table 
conn.query((
"create table MagData ("+
"Device_ID varchar(20),"+
"Sensor_ID varchar(20),"+
"Location varchar(20),"+
"Axis varchar(20),"+
"Value varchar(20),"+
"Units varchar(3),"+
"TS DATETIME(6) NOT NULL,"+
"PRIMARY KEY (TS));"), 
function (err,res){
	if(err == null){
		console.log("MagData table created in database BBCData");
	}
	else if (err.code =="ER_TABLE_EXISTS_ERROR"){
		console.log("WARNING table MagData already in exisistentnce, existing table will be used")
	}});

//Create the table ButtonData
//If table already exists just use existing table
conn.query((
"create table ButtonData ("+
"Device_ID varchar(20),"+
"Sensor_ID varchar(20),"+
"Location varchar(20) default 'Kevin Street',"+
"Value varchar(20),"+
"Units varchar(7) default 'Boolean',"+
"TS DATETIME(6) NOT NULL,"+
"PRIMARY KEY (TS));"), 
function (err,res){
	if(err == null){
		console.log("ButtonData table created in database BBCData");
	}
	else if (err.code =="ER_TABLE_EXISTS_ERROR"){
		console.log("WARNING table ButtonData already in exisistentnce, existing table will be used")
	}});



///InfluxDB related setup///
//Must first create the measurements in the datbase "BBCData"
//There will be three measurments:
//1.AccelData  - Holds the data associated with teh accelerometer 
//2.MagData    - Holds the data associated with the magnetometer
//3.ButtonData - Holds the data associated with the button 
const influx = new Influx.InfluxDB({
 host: 'localhost',
 database: 'BBCData',
 schema: [
   {
     measurement: 'AccelData',
     fields: {
       //there are five fields
       Device_ID: Influx.FieldType.STRING,
       Sensor_ID: Influx.FieldType.STRING,
       Location: Influx.FieldType.STRING,
       Unit:Influx.FieldType.STRING,
       Value:Influx.FieldType.STRING
     },
      //this tag would be included with the timestamp in the index, to allow individual machines to be queried.
     tags: [
       'Axis'
     ]
   },
   {
     measurement: 'MagData',
     fields: {
       //there are five fields
       Device_ID: Influx.FieldType.STRING,
       Sensor_ID: Influx.FieldType.STRING,
       Location: Influx.FieldType.STRING,
       Unit:Influx.FieldType.STRING,
       Value:Influx.FieldType.STRING
     },
      //this tag would be included with the timestamp in the index, to allow individual machines to be queried.
     tags: [
       'Axis'
     ]
   },
   {
     measurement: 'ButtonData',
     fields: {
       //there are five fields
       Device_ID: Influx.FieldType.STRING,
       Sensor_ID: Influx.FieldType.STRING,
       Unit:Influx.FieldType.STRING,
       Value:Influx.FieldType.STRING
     },
      //this tag would be included with the timestamp in the index, to allow individual machines to be queried.
     tags: [
       'Location'
     ]
   
   }
   
 ]
})
setInterval(retrieveTimeSeriesData, 12000);



//countInterval - Used in displaying current Service to console 
var countInterval = 0;

//Print out message to indacte script is running 
console.log("-----------Script running-----------");

//when a stateChange event occurs call the event handler callback function, discoverDeviceEventHandler
noble.on('stateChange', stateChangeEventHandler);

//when a 'connect' event is received call the connectCallback listener function
mqttClient.on('connect', mqttconnectCallback); 


///stateChangeEventHandler///
//When a state change event occurs this call back function will be executed  
//It will start scanning for the bluetooth enabled devices using noble library if the state change is 'poweredOn'
//If the state change is anything else noble will stop scanning for devices 
function stateChangeEventHandler(state) { 
  if (state === 'poweredOn') {
	console.log("--------------Scanning--------------");  
    console.log("starting scanning for devices with service uuids : " + serviceOfInterestUuids);  
    //Scan for devices containing the service of interest UUIDS only, do not allow duplicate services
    //This will find all Bluetooth enabled devices in proximety with the UUID's stored in the variable 'serviceOfInterestUuids' 
	noble.startScanning(serviceOfInterestUuids, allowDuplicates);
  } else {
    console.log("stopping scanning");  
    noble.stopScanning(); //Stop scanning for bluetooth enabled devices 
	process.exit(0);
  }
}

///mqttconnectCallback///
//When the mqtt client has connected to a broker this callback 
//function will be executed 
//The function will subscribe to 2 topics:
//  Accel_Topic - For the accelerometer values 
//  Mag_Topic   - For the magnetometer values 
function mqttconnectCallback(){
	//Subscribe to the Accel_Topic
	mqttClient.subscribe(acceltopic);
	console.log("subscribed to messages on topic '" + acceltopic);
	//Subscribe to the Mag_Topic
	mqttClient.subscribe(magtopic);
	console.log("subscribed to messages on topic '" + magtopic);
	//Subscribe to the LED Topic 
	mqttClient.subscribe(LEDtopic);
	console.log("subscribed to messages on topic '" + LEDtopic);
	//Subscribe to the Button_Topic
	mqttClient.subscribe(buttontopic);
	console.log("subscribed to messages on topic '" + buttontopic);
	
}


//When a discover event occurs call the event handler callback function, discoverDeviceEventHandler
//A discover event will occur when a BLE enabled peripheral is discovered from the noble.startScanning operation
noble.on('discover', discoverDeviceEventHandler); 


///discoverDeviceEventHandler///
//This function called when a BLE enabled peripheral is discovered 
//A device with a particular UUID is being serched for being the BBC microbit's UUID
//If the device is found the devices local name will be logged to the console along with its UUID 
//A connection is then made between the BBC Microbit (Perpherial) and the Rasberry Pi (Central)
function discoverDeviceEventHandler(peripheral) { 
	//If the UUID associated with discvered peripheral is the peripheral we want to connect to enter this loop 
	if (peripheral.uuid==peripheralOfInterestUUID) {
		console.log('Found device with local name: ' + peripheral.advertisement.localName);
		console.log("peripheral uuid : " + peripheral.uuid);
		//set the peripheralGlobal variable equal to the callback peripheral parameter value, it will be the BBC microbit of interest peripheral object 
        peripheralGlobal = peripheral;       
        //Call the connect function, connects the peripheral (BBC Microbit) with the central device(Rasberry Pi) 
        //When it returns the callback function connectCallback will be executed
		peripheral.connect(connectCallback); 
	}; 
}

///connectCallback///
//Called after the connection has been made to a peripheral device
//If there is an error in connecting it will log the error to the terminal
//If no error occurs then a succesful connection message is printed  
function connectCallback(error) { //this will be executed when the connect request returns
	if (error) {
		console.log("error connecting to peripheral");
	} else {		
		console.log('--------------Connected-------------');
		console.log('Connected to peripheral: ' + peripheralGlobal.uuid  + "   " + peripheralGlobal.advertisement.localName);
		
		//Call the discoverServices function on the peripheral, the serviceOfInterestUuids variable which 
		//stores the UUID's of the services we want to discover is also passed telling the 
		//function only to discover these services 
		//When it returns the callback function discoverServicesCallback will be executed
		console.log('--------Discovering Services--------');
		peripheralGlobal.discoverServices(serviceOfInterestUuids, discoverServicesCallback); 
	}
}


///discoverServicesCallback///
//Callback function when discovery of services of peripheral is executed 
//The callback parameter 'services' will contain the services discovered 
//This function will loop through each of these services and call the discoverCharacteristics
//function on them to discover what characteristics are associated with this service 
function discoverServicesCallback(error, services) { //this will be executed when the discoverServices request returns
	if (error) {
		console.log("error discovering services");
	} else {	
		//Loops through each of the services 	
		for (var i in services) {
			//If the service has the UUID of a service of interest enter this loop
			if (serviceOfInterestUuids.includes(services[i].uuid)) {
				//The characteristics of the service of interest must be discovered 
				//by calling the discoverCharacteristics function on the service 
				//When the discoverCharacteristics has been executed the callback 
				//function discoverCharsCallback will be executed 
				console.log("Service found, discovering Characteristics for service " + services[i].uuid);
				services[i].discoverCharacteristics(null, discoverCharsCallback);
			}
		}
	}
}


///discoverCharsCallback///
//Callback called when a discovery of characteristics is executed for a service 
//Will print out the characteristics discovered associated with the particular service 
//Depending upon the characteristic a it will be handled differently:
//***Accelerometer Characteristic:
//1.Add the characteristic object to the array accelchars
//2.Set a timer to read characteristic every 5 seconds
//***Magnetometer Characteristic:
//1.Add the characteristic object to the array magchars
//2.Set a timer to read characteristic every 5 seconds
//***Button Characteristic:
//1.Subsribe to the button characteritic to enable notfications 
//2.Register a callback for the data event, the data event is if the value changes 
//***LED Characteristic
//1.Set the gloabal variable LEDchar to the characteristic object 
function discoverCharsCallback(error, characteristics) { //this will be executed when the discoverCharacteristics request returns
	if (error) {
		console.log("error discovering characteristics");
	} else {
		//console.log('service ' + serviceOfInterestUuids[countInterval] + ' has the following characteristics:  ');
		for (var i in characteristics) {
			//console.log('  ' + i + ' uuid: ' + characteristics[i].uuid);  
			//***Accelerometer Characteristic:
            //1.Add the characteristic object to the array accelchars
            //2.Set a timer to read characteristic every 5 seconds
			if (accelcharsUUID.includes(characteristics[i].uuid)){
				accelchars.push(characteristics[i]);
				console.log("Accelerometer(UUID ="+serviceOfInterestUuids[countInterval]+") characteristic found, UUID:"+characteristics[i].uuid);
				setInterval(readChars, 5000, characteristics[i])
			}
			//***Magnetometer Characteristic:
            //1.Add the characteristic object to the array magchars
            //2.Set a timer to read characteristic every 5 seconds
			if (magcharsUUID.includes(characteristics[i].uuid)){
				magchars.push(characteristics[i]);
				console.log("Magnetometer(UUID ="+serviceOfInterestUuids[countInterval]+") characteristic found, UUID:"+characteristics[i].uuid);
				setInterval(readChars, 5000, characteristics[i])
			}
			//***Button Characteristic:
            //1.Subsribe to the button characteritic to enable notfications 
            //2.Register a callback for the data event, the data event is if the value changes 
			if(notifChars.includes(characteristics[i].uuid)){	// If the UUID is in the array of notification characteristics:
				console.log("ButtonA (UUID ="+serviceOfInterestUuids[countInterval]+") characteristic found, UUID: "+ characteristics[i].uuid);
				console.log("Setting notify for ButtonA characteristic "+characteristics[i].uuid);
				characteristics[i].subscribe(bleSubscribeCallback);
				characteristics[i].on('data', dataCallback);
			}     
			//***LED Characteristic
			//1.Set the gloabal variable LEDchar to the characteristic object 
			if(LEDcharUUID.includes(characteristics[i].uuid)){
				console.log("LED(UUID ="+serviceOfInterestUuids[countInterval]+") characteristic found, UUID:"+characteristics[i].uuid);
				LEDchar = characteristics[i];
			}
        }
        //Increment the countInterval for dispayling next service 
        countInterval = countInterval +1;
	} //end for loop
}

//When a 'message' event occurs call the messageEventHandler 
//A message event will occur when a subscribed topic on the mqqt broker 
//has been updated, for this script the topics subscribed are Mag_Topic and Accel_Topic
mqttClient.on('message', messageEventHandler);

///messageEventHandler///
//Called when a message is recieved from a subscribed topic on the mqtt broker
//Will print out the value of the message and the topic it came from 
//Writes to the SQL and influxdb databases:
//AccelData  - Written to when message recieved from Accel_Topic
//MagData    - Written to when message recieved from Mag_Topic
//ButtonData - Written to wehn message recieved from Button_Topic
function messageEventHandler(topic, message, packet) { 
    console.log("Received message'" + message + "' on topic '" + topic + "'");
    res=message.toString().split(":");
    if (topic == acceltopic){
		//Inseting into SQL AccelData table, olumns in table:
		//1.Device_ID - UUID of BBC Microbit 
		//2.Sensor_ID - UUID of accelerometer
		//3.Location  - Loction of the sensor 
		//4.Axis      - The x,y,z axis being read 
		//5.Value     - The value of the x,y,z axis 
		//6.Units     - The units of the x,y,z axis reading  
		//7.ts        - The timestamp of the reading of the reading YYYY-MM-DD HH-MM-SS.SSSSSS, PRIMARY KEY
		conn.query("INSERT INTO AccelData(Device_ID,Sensor_ID,Location, Axis, Value,Units, TS) value (?,?,?,?,?,?, now(6))", [res[0],res[1],res[2],res[3],res[4],res[5]],insertCallback);
		
		//Inserting into timeseries AccelData measurment
		//Tags = Axis
		//Fileds:
		//1.Device_ID
		//2.Sensor_ID 
		//3.Location 
		//4.Unit
		//5.Value
		influx.writePoints([
		{
		measurement: 'AccelData', 
		tags: { Axis:res[3]},
		fields: { Device_ID:res[0], Sensor_ID: res[1], Location:res[2], Unit:res[5], Value:res[4]},
		}
		]);  
		
    }
   else if (topic==magtopic){
		//Inseting into SQL MagData table, columns in table:
		//1.Device_ID - UUID of BBC Microbit 
		//2.Sensor_ID - UUID of accelerometer
		//3.Location  - Loction of the sensor 
		//4.Axis      - The x,y,z axis being read 
		//5.Value     - The value of the x,y,z axis 
		//6.Units     - The units of the x,y,z axis reading  
		//7.ts        - The timestamp of the reading of the reading YYYY-MM-DD HH-MM-SS.SSSSSS, PRIMARY KEY
		conn.query("INSERT INTO MagData(Device_ID,Sensor_ID,Location, Axis, Value,Units, TS) value (?,?,?,?,?,?, now(6))", [res[0],res[1],res[2],res[3],res[4],res[5]],insertCallback);
		
		//Inserting into timeseries AccelData measurment
		//Tags = Axis
		//Fileds:
		//1.Device_ID
		//2.Sensor_ID 
		//3.Location 
		//4.Unit
		//5.Value
		influx.writePoints([
		{
		measurement: 'MagData', 
		tags: { Axis:res[3]},
		fields: { Device_ID:res[0], Sensor_ID: res[1], Location:res[2], Unit:res[5], Value:res[4]},
		}
		]);  
	   
	   
	   
   }
   else if (topic==LEDtopic){
	//Turn the LED on writing a value of 1 to it 
	//When the value is written to it the callback function 
	//writeDataCallback will be executed 
	if (message == 'On'){
		LEDchar.write(new Buffer([1]), false, writeDataCallback);
	    }
	    
	//Turn the LED off writing a value of 0 to it 
	//When the value is written to it the callback function 
	//writeDataCallback will be executed 
	if (message == 'Off'){
		LEDchar.write(new Buffer([0]), false, writeDataCallback);
	}
    }
    
    else if (topic == buttontopic){
	    //Inseting into AccelData table, olumns in table:
		//1.Device_ID - UUID of BBC Microbit 
		//2.Sensor_ID - UUID of Button
		//3.Location  - Loction of the sensor
		//4.Value     - The value of the button
		//5.Units     - The units of the button, boolean 1 or 0  
		//6.ts        - The timestamp of the reading of the reading YYYY-MM-DD HH-MM-SS.SSSSSS, PRIMARY KEY
		conn.query("INSERT INTO ButtonData(Device_ID,Sensor_ID,Location, Value, Units, TS) value (?,?,?,?,?, now(6))", [res[0],res[1],res[2],res[3],res[4]],insertCallback);
		
		//Inserting into timeseries AccelData measurment
		//Tags = Axis
		//Fileds:
		//1.Device_ID
		//2.Sensor_ID 
		//3.Location 
		//4.Unit
		//5.Value
		influx.writePoints([
		{
		measurement: 'ButtonData', 
		tags: {Location:res[2]},
		fields: { Device_ID:res[0], Sensor_ID:res[1], Unit:res[4], Value:res[3]},
		}
		]); 
	    
    }
    
}

///writeDataCallback///
//Called when a write command is executed 
//This function will be executed when the LED characteristic is written to
function writeDataCallback(error, data) { //this will be executed when the write request returns
	if (error) {
		console.log("error writing data");
	} else {	
		
	}
}

///bleSubscribeCallback///
//Call back when a certain characteristic is subcribed to 
//Tells user notifications are now enabled
//This function is called when the button characteristic is subscribed to 
function bleSubscribeCallback(error){
	if(error){
		console.log('Error Subscribing');
	} else{	
		console.log('Notifications Enabled');
	}
}

///dataCallback///
//Call back used when button value changes 
//Will notify the user anytime the button value changes
//Will wirte the values of the accelerometer and magnotometer to broker 
function dataCallback(data, isNotification){
	//This Function is entered on state change i.e 0 -> 1 or 1 -> 0
	//The values should on be written to topic when the button changes from 0 -> 1
	//Hence the value of button is tested in this if loop 
	if ((data.toString('hex'))==("01")){
		
		//Publish to the Button_Topic the value of the button and when it was pressed 
		//The callback function publishCallback will be executed when the publish function is complete 
		mqttClient.publish(buttontopic,(peripheralOfInterestUUID+":"+button_UUID+":Kevin Street:"+data.toString('hex')+":Hex"),publishCallback)
		
		console.log('-----------Manual Read Executed-----------');
		//Iterate through the Accelerometer characteritics 
		for (var i in accelchars) {
			//charGlobal is a global variable used to reference the current characteristic
			charGlobal = accelchars[i];
			//Read the current Accelerometer characteritic and execute the readAccelDataCallback when complete 
			accelchars[i].read(readAccelDataCallback);
		  }
		  //Iterate through the Magnetometer characteritics 
		  for (var i in magchars){ 
			//charGlobal is a global variable used to reference the current characteristic
			charGlobal = magchars[i];
			//Read the current Magnetometer characteritic and execute the readAccelDataCallback when complete 
			magchars[i].read(readMagDataCallback);
		  }
}
}

///readChars///
//Function that will be called every set interval of time using a timer 
//to read the Characteristics values of the Accelerometer and Magnetometer
function readChars(charToRead) {
	//charGlobal is a global variable used to reference the current characteristic
	charGlobal=charToRead;
	//If the characteritic has the UUID of Magnetometer char
	//Then enter this loop and use the readMagDataCallback
	if (magcharsUUID.includes(charToRead.uuid)){
		charToRead.read(readMagDataCallback)
	}
	//If the characteritic has the UUID of Accelerometer char
	//Then enter this loop and use the readAccelDataCallback
	if (accelcharsUUID.includes(charToRead.uuid)){
		charToRead.read(readAccelDataCallback)
	}
}

///readMagDataCallback///
//Callback function when a read of a Magnetomter characteristic value 
//is carried out, it will publish the value of the characteristic 
//to the Mag_Topic on the mqtt server    
function readMagDataCallback(error, data) {
	if (error) {
		console.log("error reading data");
	} 
	else{
		//An attribute of a characteristic object is its descriptors, this is set to the topic to publish to
		charGlobal.descriptors = magtopic;
		//Publish to the Mag_Topic the value of the magnetometer characteristic 
		//The callback function publishCallback will be executed when the publish function is complete 
		mqttClient.publish(magtopic,(peripheralOfInterestUUID+":"+mag_UUID+":Kevin Street:"+magaxis[magcount]+":"+data.toString('hex')+":Hex"),publishCallback)
		magcount = magcount +1;
		if (magcount == 3){
			magcount=0;
			}
	}
}

		
///readAccelDataCallback///
//Callback function when a read of a Accelerometer characteristic value 
//is carried out, it will publish the value of the characteristic 
//to the Accel_Topic on the mqtt server    
function readAccelDataCallback(error, data){
	if (error) {
		console.log("error reading data");
	} 
	else{
		//Publish to the Accel_Topic the value of the Accelerometer characteristic 
		//The callback function publishCallback will be executed when the publish function is complete
		mqttClient.publish(acceltopic, (peripheralOfInterestUUID+":"+accel_UUID+":Kevin Street:"+accelaxis[accelcount]+":"+data.toString('hex')+":Hex"),publishCallback)
		//console.log(accelaxis[accelcount]);
		accelcount = accelcount +1;
		if (accelcount == 3){
			accelcount=0;
			}
	}
}

///publishCallback///
// Call back function for when publsihing to topic is complete 
// Displays the topic that the message is published to 
function publishCallback(error) {     
   	if (error) {
		console.log("error publishing data");
	} else {	
		//charGlobal.descriptors references the current topic of the characteristic 
        //console.log("Message is published to topic '" + charGlobal.descriptors + "'");
    }
}

///insertCallback///
// Call back function for when data is inserted into the database 
function insertCallback(err,res){
	if (err) throw err;
	//console.log(res);
}

///retrieveSQLData///
//Function to retrieve data from the database 
//This functin will be called every 10 seconds to log the data to the terminal 
function retrieveSQLData(){
	//Read the last three values from the AccelData SQL datbase 
	console.log("------SQL Database BBCData------");
	conn.query("select * from AccelData order by TS desc limit 3",function (err, results, fields){
		if (err) throw err;
		console.log("Last 3 data entrys in AccelData table");
		for (var i in results){
			console.log("Axis "+(results[i].Axis)+" was "+(results[i].Value)+" at "+(results[i].TS));
	}
		});
	//Read the last three values from the MagData SQL table
	conn.query("select * from MagData order by TS desc limit 3",function (err, results, fields){
		if (err) throw err;
		console.log("Last 3 data entrys in MagData table");
		for (var i in results){
			console.log("Axis "+(results[i].Axis)+" was "+(results[i].Value)+" at "+(results[i].TS));
	}
		});
	//Read the last three values from the ButtonData SQL table
	conn.query("select * from ButtonData order by TS desc limit 3",function (err, results, fields){
		if (err) throw err;
		console.log("Last 3 button presses at times");
		for (var i in results){
			console.log((parseInt(i)+1)+"." +(results[i].TS));
	}
		});
}

///retrieveTimeSeriesData///
//Function used to retrieve data from the timeseries database 
//This functin will be called every 7 seconds tolog the data to the terminal 
function retrieveTimeSeriesData(){
	console.log("------Time Series Database BBCData------")
	//Reading the last 3 AccelData measurment entries 
	influx.query(`
		select * from AccelData
		order by time desc
		limit 3
		`).then(rows => {
			console.log("Last 3 data entries in AccelData measurment for Acellereometer");
			// provide summary to the user for each record.
			rows.forEach(row => console.log(`Axis ${row.Axis} was ${row.Value} HEX at ${row.time}`))
});
	//Reading the last 3 MagData measurment entries 
	influx.query(`
		select * from MagData
		order by time desc
		limit 3
		`).then(rows => {
			console.log("Last 3 data entries in MagData measurment for Magnetometer");
			// provide summary to the user for each record.
			rows.forEach(row => console.log(`Axis ${row.Axis} was ${row.Value} HEX at ${row.time}`))
});
	//Reading the last 3 ButtonData measurment entries 
	influx.query(`
		select * from ButtonData
		order by time desc
		limit 3
		`).then(rows => {
			console.log("Last 3 times the button was pressed");
			// provide summary to the user for each record.
			rows.forEach(row => console.log(`${row.time} in ${row.Location}`))
});
	
}

 
