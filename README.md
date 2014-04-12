# Fitbit API demo
From API Strategy & Practice Conference SF 2013

## Overview
This application is a barebones example that demonstrates Fitbit OAuth 1.0a authentication, the Fitbit Subscriptions API, and the Twilio API.

The workflow looks like:

1. A Fitbit user signs into this application.

2. This application subscribes to updates to the user's activity. When the user's Fitbit tracker sync, this application will receive a notification from Fitbit.

3. The user enters their cell phone number into this application.

4. When the subscription notification from Fitbit is received by this application, this application fetches the user's current step count and daily step goal.

5. This application then sends a text message to the user's cell phone informing them of how many steps they need to hit their step goal.

Fitbit trackers sync every 15–20 minutes when near a Fitbit USB dongle or [supported smart phone](https://www.fitbit.com/devices). Users can also manually request a Fitbit tracker sync.


## Prerequisites

- A host for a Node.js application that is publicly accessible
- A MongoDB database
- A verified [Twilio](https://www.twilio.com/) account to send SMS. 
- A Fitbit application. [Create one](https://dev.fitbit.com/apps)


## Using Modulus
[Modulus](https://modulus.io/) is a Node.js and MongoDB platform-as-a-service provider. You can use any hosting method you prefer, but instructions are included for Modulus. All new accounts get a credit enough for a month of hosting this application.

1. Sign up at https://modulus.io/

2. Create a database by clicking on "Databases" in the left navigation at https://modulus.io/user/dashboard

3. Install the Modulus command line application
> sudo npm install -g modulus


## Installation

1. git clone this repo

2. cd fitbit-twilio && npm install

3. Update ./config.js with your Fitbit application credentials, Twilio credentials, application hostname, and MongoDB connection information.

If you are using Modulus to host your application, you will need to create and deploy this application to obtain a hostname.
> modulus project create
> modulus project deploy
Remember to enter your hostname into the ./config.js file and redeploy.

4. Add a subscriber to your Fitbit application settings. Go to https://dev.fitbit.com/apps and click on your app, Edit Application Settings, Add a subscriber. This application expects to receive Fitbit Subscription API notifications at http://{hostname}/notifications , e.g. http://fitbitexample-9501.onmodulus.net/notifications . Format = JSON, Version = 1, Subscriber ID = 1. Click Save.

5. Start the app. This happens automatically on Modulus. Otherwise:
> NODE_ENV=production node app.js


## Using the application

Go to http://{hostname}/ , sign in with your Fitbit account, enter your phone number, and sync your Fitbit tracker. You should receive a text message.