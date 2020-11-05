///House Keeping///
//Author         - Warren Kavanagh 
//Student Number - C16463344
//Date           - 10/12/2019 

///Reference Material///
//Paho API - http://www.eclipse.org/paho/files/jsdoc/Paho.MQTT.Client.html 

///Description///
//The purpose of this script is to revcieve information from an MQTT server and display it on a webbrowser
//There will be 3 topics on the MQTT server, there uses in this scrit are:
//1.Accel_Topic - Display the values in a table 
//2.Mag_Topic   - Display the values on table
//3.LED_Topic   - Write to the LED topic to turn on the LED on BBC Microbit

///Genreal Variables///
//client     - The MQTT client object used to connect to the MQTT broker 
//LEDTopic   - The name of the LED topic 
//date       - Date object of class Date used to display the date on the table  
//accel_UUID - Accelerometer UUID
//mag_UUID   - Magnetometer UUID
client = new Paho.MQTT.Client("broker.mqttdashboard.com", 8000, "web_" + parseInt(Math.random() * 100, 10));
var LEDtopic     ="LED_Topic";
var date         = new Date();
var accel_UUID   ='a012';
var mag_UUID     ='fff3';

///MQTT options///
//connectOptions - used when establishing conection:
//  onSuccess     - Called when a succesful connection is made 
//  onFailure     - Called when connection has failed 
//subOptions     - Options passed when subscribing to a topic:
//  qos           - Secure connection is assumed so no ack from sender/reciever required 
//  onSuccess     - The callback function for when a topic is succesfully subscribed to 
//  onFailure     - Callback function for failure to subscribe to a topic 
var connectOptions = {
    onSuccess: onConnectCallback, 
    onFailure: onConnectFailCallback
};
var subOptions = {
    qos: 0,
    onSuccess: onSubCallback,
    onFailure: failSubCallback
};

///Callback handlers//
//onConnectionLost - Calll the callback function onConnectionLost if a connection is lost 
//onMessageArrived - When a message arrives from a subscribed topic call the onMessageArrival callback
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrival;


///connectToBroker///
//This function is called when the "Connect" buuton on the webpage is clicked
//the function will connect to the MQTT broker hosted by HiveMQ
function connectToBroker(){
  try{
    client.connect(connectOptions);
  }
  catch(err){
    console.log("There is an error in connection: "+err);
  }
}

///onConnectCallback///
//This function is called upon succesful connection to MQTT broker
//It will enable the user to interact with the brker by enabling the buttons and text inputs on the page
function onConnectCallback() {
  console.log("Succesful connection to MQTT broker");
  document.getElementById("publish").disabled = false;
  document.getElementById("disconnect").disabled = false;
  document.getElementById("subscribe").disabled = false;
  document.getElementById("TopicSub").disabled = false;
  document.getElementById("TopicPub").disabled = false;
  document.getElementById("MessagePub").disabled = false;
  document.getElementById("LEDOn").disabled = false;
  document.getElementById("LEDOff").disabled = false;
  document.getElementById("connect").disabled = true;
}

///onConnectFailCallback///
//Callback function when connectio has failed to MQTT broker
function onConnectFailCallback(){
    console.log("Failure to connect to the Hive MQ broker, ensure there is a stable intenet connection");

}

///disconnectFromBroker///
//This function wil be called when the disconnect button is pressed on the webpage
//It will disconnect the page from the MQTT broker 
function disconnectFromBroker(){
  //disconnect from broker
  try{client.disconnect();
  document.getElementById("publish").disabled = true;
  document.getElementById("disconnect").disabled = true;
  document.getElementById("subscribe").disabled = true;
  document.getElementById("TopicSub").disabled = true;
  document.getElementById("TopicPub").disabled = true;
  document.getElementById("MessagePub").disabled = true;
  document.getElementById("LEDOn").disabled = true;
  document.getElementById("LEDOff").disabled = true;
  document.getElementById("connect").disabled = false;
    }
  //Catch the error and print out in meanigful way
  catch(err){
    console.log("There is an error in connecting "+err);
  }
  console.log("Disconnected from Broker");
}

///subToBroker///
//Function is called when the subscribe button on the webpage is pressed 
//The function will subscribe to the topic entered in the field "Topic to subscribe to"
function subToBroker(){
  subTopicGlobal=document.getElementById("TopicSub").value;
  console.log("Attempting to subscribe to: "+subTopicGlobal);
  try{client.subscribe(subTopicGlobal,subOptions);
  }
  catch(err){
    console.log("Error in subscribing to topic "+subTopicGlobal+":"+err);
  }
}

///onSubCallback///
//Callback function for when a tpic has succesfully been subscribed to 
function onSubCallback(){
  console.log("Succes in subscribing to "+subTopicGlobal);
}

///failSubCallback///
//Function called when there is an error in subscribing to a topic 
function failSubCallback(){
  console.log("Failure subscribing to "+subTopicGlobal);
}


///onMessageArrival///
//When a new message is recieved from a subscribed topic this function is called 
//If the message is from the Accel_Topic or Mag_Topic and fits the format of 
//DEVICENAME:SENSORNAME:AXIS:VALUE
//Then the Magnetometer or Accelrometer table will be populated 
//If the message is from another subscribed topic it will be logged to the console 
function onMessageArrival(message){
  console.log("New message: "+message.payloadString);
  res=message.payloadString.split(":");
  //[ 'c92615562689', 'a012', 'Kevin Street', 'Y', 'feff', 'Hex' ]
  if (res[1] == mag_UUID) {
    document.getElementById("Mag"+res[3]+"Device").innerHTML     =res[0]; 
    document.getElementById("Mag"+res[3]+"Sensor").innerHTML     =res[1]; 
    document.getElementById("Mag"+res[3]+"Location").innerHTML   =res[2]; 
    document.getElementById("Mag"+res[3]+"Axis").innerHTML       =res[3]; 
    document.getElementById("Mag"+res[3]+"Value").innerHTML      =res[4]; 
    document.getElementById("Mag"+res[3]+"Time").innerHTML       =new Date(); 
  }
  else if (res[1] == accel_UUID) {
    document.getElementById("Accel"+res[3]+"Device").innerHTML   =res[0]; 
    document.getElementById("Accel"+res[3]+"Sensor").innerHTML   =res[1]; 
    document.getElementById("Accel"+res[3]+"Location").innerHTML =res[2]; 
    document.getElementById("Accel"+res[3]+"Axis").innerHTML     =res[3]; 
    document.getElementById("Accel"+res[3]+"Value").innerHTML    =res[4]; 
    document.getElementById("Accel"+res[3]+"Time").innerHTML     =new Date(); 
  }
  else{
    console.log("Error")
  }
}


///onConnectionLost///
//Called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

///publishToBroker///
//Function is called when the publish button is pressed on the webpage
//The function publishes the message entered in the input box "Message to publish" to the 
//topic in the input box "Topic to publish to"
function publishToBroker(){
  pubTopicGlobal=document.getElementById("TopicPub").value;
  messageGlobal = document.getElementById("MessagePub").value;
  console.log(messageGlobal)
  client.publish(pubTopicGlobal,messageGlobal, 0, false); 
  console.log("Message published to topic "+(pubTopicGlobal)+":"+(messageGlobal));
}


///LEDOn//
//Function called when the LED on button is pressed on the webpage 
//It writes a value of "On" to the "LED_Topic" to turn the LED on
function LEDOn(){
  client.publish(LEDtopic,'On',0,false);
  console.log("Message published to topic "+(LEDtopic)+":On");
}
 
///LEDOff///
//Function called when the LED off button is pressed on the webpage 
//It writes a value of "Off" to the "LED_Topic" to turn the LED off 
function LEDOff(){
  client.publish(LEDtopic,'Off',0,false);
  console.log("Message published to topic "+(LEDtopic)+":Off");
}


