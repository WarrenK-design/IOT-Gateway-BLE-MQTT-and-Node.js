# Introduction
This repository holds the code for the implmentation of a IOT network. The sensory device in the network is the BBC microbit, the gatway device is the Rapsberry Pi and at the cloud layer is an MQTT broker.

### Note 
The front end code is located in the repo - https://github.com/WarrenK-design/WarrenK-design-IOT-Network-NodeJS-HTML

The low level sensory device code for the BBC microbit is located in the repo - https://github.com/WarrenK-design/BBC-Microbit-Bluetooth-and-i2c-communication

Video explanations on the project can be found on this youtube playlist https://www.youtube.com/playlist?list=PLUwop3CM6g8rhwAWVDwtwt7uUWopl_08w

## Overview of documentation

The purpose of this document is to provide details on the system being implemented. The document will detail:

1. The desired goal of the system being implemented
2. A description of the components in the system:
  1. Raspberry Pi Model 3 V 1.2
  2. The BBC MicroBit
  3. MQTT Broker
3. An overview of the MQTT server connection
4. A UML flow diagram of the process

The link to the YouTube video associated with this document can be found at:

[https://www.youtube.com/watch?v=5f3m2BX8zyE&amp;feature=youtu.be.](https://www.youtube.com/watch?v=5f3m2BX8zyE&amp;feature=youtu.be.)

## Goal of the system

The goal of the system is to implement a communication network between a BBC microbit, a raspberry pi and a MQTT broker. The network diagram illustrating this system is shown in the figure below.

![image](https://user-images.githubusercontent.com/61060096/84172381-d9c8d500-aa73-11ea-96af-d9425d73928a.png)




The BBC Microbit will connect to the Raspberry Pi through a Bluetooth low energy (BLE) connection. There are several BLE enabled services on the BBC Microbit, the ones used in this system are:

1. Accelerometer
2. Magnetometer
3. LED&#39;s
4. Button A

These services can be advertised to the raspberry pi using the generic attribute profile (GATT). The GATT profile will contain information on the characteristics associated with each of these services. Information on the characteristics configured for these services is discussed later in this document. The information transferred from the BBC Microbit to the Raspberry Pi can now be processed. This processing is done through a scripting language node js built on the java script language. Once processing is completed the information can be uploaded to a MQTT broker. The Raspberry Pi is connected to the MQTT broker over an internet link. The Raspberry Pi will publish messages to the broker containing information on the BBC Microbit&#39;s services. Where the information is published to depends upon the MQTT topic which divides information up into sorted groups known as topics. In this system there will be two topics:

1. Accel\_Topic – Contains information on the accelerometer
2. Mag\_Topic – Contains information on the magnetometer

The Raspberry Pi will also subscribe to these topics which enables the MQTT broker to send a notification to the Raspberry Pi when a new message is published to these topics. The Raspberry Pi can then act upon these new updates by communicating with the BBC Microbit.

# System Overview

This section details the components in the system:

1. BBC Microbit – Sensory Device Layer
2. Raspberry Pi – Gateway Device Layer
3. MQTT Broker – Cloud Storage Layer

The components of the system are shown in the system architecture diagram below.

![image](https://user-images.githubusercontent.com/61060096/84172563-11d01800-aa74-11ea-9960-eaeb80a7ff7d.png)



### Sensory Device Layer

The sensory layer consists of small battery-operated electronic devices that will be placed out in the field to gather information. They have one or more on board sensors and actuators that will convert real world analog values to digital values. These devices do not have a lot of computing power and can only perform minimal data processing. The device must also have a means of communicating data to another device, typically this is over Bluetooth or Bluetooth Low Energy.

### Gateway Layer

The gateway device receives the information collected from the sensory device&#39;s sensors. The gateway device has a higher computing power and can process this data further using it in a meaningful way. The gateway device can be connected to many sensory devices and it acts as a gateway from the sensory layer to the cloud layer. The gateway device has an internet connection and is able to transmit the processed data from the sensory device layer to the cloud layer.

### Cloud Layer

The information obtained from the sensors is now stored on a cloud server. The cloud server stores information from one or multiple gateways which are connected to one or more sensors. The cloud server can build up a repository of information that it can now share with other users. Communication can now be established between multiple gateway devices which are transmitting and reading data to a cloud server.

## BBC Microbit – Sensory Device

The BBC Microbit is the sensory device in the network that will capture information. The function of the BBC Microbit in the system is to turn analog data from the real word into digital data to be processed. The figure below shows a layout of the BBC Microbit and the components on the microbit.

![image](https://user-images.githubusercontent.com/61060096/84172761-4a6ff180-aa74-11ea-8f19-fca13d449eb7.png)



The table below references the part numbers in the figure above.

| **Part Number** | **Device** | **Description** |
| --- | --- | --- |
| 1 | Radio and Bluetooth Antenna | Allows radio and Bluetooth communication between BBC Microbit and other devices |
| 2 | Nordic nRF51822 | Low power system on chip microcontroller. Built upon the 32-bit ARM Cortex-M0 CPU microcontroller, 128 kB flash memory and 16 kB of RAM. Suited to low energy Bluetooth communications of 2.4 GHz |
| 3 | MAG3110 Magnetometer | Measures the magnetic field strength in all three x, y and z axes |
| 4 | MMA8653 Accelerometer | Measures the acceleration in all three x, y and z axes |
| 5 | Micro USB Connector | Allows the microbit to communicate with a PC through a USB cable. Can also be used to power the microbit. |
| 6 | Reset Button | Used to reset the BBC Microbit |
| 7 | Battery Connector | Connects to a battery supply |
| 8 | LED Display | LED display consisting of 25 LED&#39;s |
| 9 | Button A | Push button A can be used for user application |
| 10 | Button B | Push button B can be used for user application |
| 11 | Edge Connector | Can be connected to a breakout board |


The Bluetooth enabled sensory services that will be used on the BBC Microbit are:

1. Accelerometer
2. Magnetometer
3. Button A
4. LED Service

These services have attributes associated with which are known as characteristics. The information these characteristics hold can be transmitted and accessed by the Raspberry Pi through the Bluetooth connection. If a characteristic is set to read, then the Raspberry Pi will be able to read the value of the characteristic. A write characteristic will enable the raspberry pi to write to the characteristic changing its value. A notify characteristic will notify the raspberry pi when the characteristic has changed. The BBC Microbit, services and characteristics are all assigned a universal unique identification number (UUID) which will be used as a reference for the Raspberry Pi when connecting and receiving information from the BBC microbit over a Bluetooth connection. The assignment of the UUID&#39;s for the services and characteristics is shown in the table below. The BBC Microbit device has a UUID of c92615562689 and a local name of &#39;WarrenBBC&#39; for this project.

| **Service** | **UUID** | **Characteristics** | **UUID** |
| --- | --- | --- | --- |
| Accelerometer | a012 | x plane -Read, y plane - Read, z plane - Read | a013, a014, a015 |
| Magnetometer | fff3 | x plane - Read, y plane - Read, z plane - Read | 1, 2, 3 |
| LED | a000 | Single LED - Read/Write | 2019 |
| Button A | 1eee | Button - Read/Notify | 2019 |


The BBC Microbit has low computing power and the data gathered at this level cannot be processed in a meaningful way using the BBC Microbit alone. The data must be transferred using Bluetooth to a gateway device which will be able to further process data collected at the sensory level.

## Raspberry PI - Gateway Device

The Raspberry Pi is a low-cost computer that will be used as the gateway device for this process. The function of the gateway device is to pre-process the data collected at the sensory level before transmitting the data to the cloud. The model used is the Raspberry Pi Model 3 V 1.2 measuring at 85mm x 56mm x 17mm. The layout of the Raspberry Pi is shown in the figure below.

![image](https://user-images.githubusercontent.com/61060096/84173086-b18da600-aa74-11ea-9c8f-7192222359e6.png)

The parts table below refers to the part numbers displayed in the figure above.

| **Part Number** | **Device** | **Description** |
| --- | --- | --- |
| 1 | Broadcom BCM2837 | System on chip, contains 64-bit quad core ARM Cortex - A53 CPU at 1.2 GHz |
| 2 | GPIO Pins | 40 General purpose input and output pins |
| 3 | USB Ports | 4 USB ports |
| 4 | LAN Port | Used for ethernet connection |
| 5 | Audio- Visio jack | 3.5 mm audio and visual connection |
| 6 | HDMI port | HDMI port used to connect to TV or monitor |
| 7 | Micro USB port | Supplies power to the Raspberry Pi |
| 8 | DSI Display Port | Used for connecting to an LCD display panel |
| 9 | Micro SD slot | Micro SD can be inserted for memory storage |
| 10 | Chip Antenna | Antenna used for WIFI and Bluetooth communications |


The programming language used on the Raspberry Pi to establish a connection with the BBC Microbit is node JS. The services associated with each of the characteristics can be read in node JS and the data can be processed. Using node JS, a connection to the MQTT Broker can be established to transmit the processed information to the cloud.

## MQTT Broker – Cloud

MQTT stands for message queuing telemetry transport and it is a communication protocol built upon the publish subscribe method used to transfer data between devices. The MQTT broker is the cloud server which is responsible for receiving and transmitting data to gateway devices on the IoT stack, being the Raspberry Pi. The figure below shows the basic layout of a MQTT broker with two gateway devices connected to it, note there is only one gateway device in this project.


![image](https://user-images.githubusercontent.com/61060096/84173195-d8e47300-aa74-11ea-958b-2522c026f0fb.png)



The MQTT broker has topics associated with it which are collections of data of a specified category, in this project there are two topics:

1. Accel\_Topic – Contains information on the accelerometer
2. Mag\_Topic – Contains information on the magnetometer

In the above figure device B subscribes to the Accel\_Topic indicating it wants to receive information on the Accel\_Topic. Device A then publishes to the Accel\_Topic updating the topic with the latest values of its connected accelerometer sensor. As device B is subscribed to this topic, the message published by device A will be received at device B from the MQTT broker hence establishing communication through a cloud server.

In this implementation of the project there is one Raspberry Pi which will be both publishing to the Accel\_Topic and Mag\_topic as well as being subscribed to the topics.

![image](https://user-images.githubusercontent.com/61060096/84173258-f285ba80-aa74-11ea-9bb1-766cd1ca2653.png)


# Functionality of system

There is a PDF flow chart contained in this repository. It details the steps taking in the process and the flow of the script IOT_Gateway_Code.js. 

Node JS is a programming language built on top of java script. The two libraries used for this project inside the script are Noble and MQQT. Noble is the library used for Bluetooth low energy (BLE) connections in node JS. The main functions of the noble library in the script are:

1. Scan for BLE enabled devices
2. Establish a BLE connection between the Raspberry Pi and the BBC Microbit
3. Discover the services of the BBC Microbit
4. Discover the characteristics associated with each service
5. Read the value of the characteristic

How the characteristic will be used in the process is detailed in the table below.

| **Service** | **UUID** | **Characteristics** | **UUID** | **Usage** |
| --- | --- | --- | --- | --- |
| Accelerometer | a012 | x plane -Read, y plane - Read, z plane - Read | a013, a014, a015 | The value of each Accelerometer characteristic will be published to the Accel \_Topic every 5 seconds |
| Magnetometer | fff3 | x plane - Read, y plane - Read, z plane - Read | 1, 2, 3 | The value of each Magnetometer characteristic will be published to the Mag\_Topic every 5 seconds |
| LED | a000 | Single LED - Read/Write | 2019 | When a message is received from the Accel\_Topic or Mag\_Topic write to the LED characteristic to flash the LED on and then off indicating a message has been received |
| Button A | 1eee | Button - Read/Notify | 2019 | When Button A is pressed initiate a &quot;Manual Read&quot; which will publish the values of the Accelerometer and Magnetometer characteristics to the Accel\_Topic and Mag\_Topic |

MQTT is the library used for the connection to the MQTT broker. The main functions of the library in the script are:

1. Establish connection between the Raspberry Pi and the MQTT Broker
2. Subscribe to the Accel_Topic (for Accelerometer characteristic values) and the Mag_Topic (for Magnetometer characteristic values)
3. Publish accelerometer characteristic values to the Accel\_Topic
4. Publish magnetometer characteristic values to the Mag\_Topic

# References

| [1] | GitHub, &quot;Noble Library,&quot; 8 June 2018. [Online]. Available: https://github.com/noble/noble. [Accessed 6 November 2019]. |
| --- | --- |
| [2] | GitHub, &quot;MQTT Library,&quot; 28 May 2019. [Online]. Available: https://github.com/mqttjs/MQTT.js. [Accessed 6 Novemeber 2019]. |
| [3] | W. Kavanagh, &quot;DT021a IoT Data Capture and Messaging,&quot; 9 November 2019. [Online]. Available: https://www.youtube.com/watch?v=5f3m2BX8zyE&amp;feature=youtu.be. [Accessed 10 Novemeber 2019]. |
