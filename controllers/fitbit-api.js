var fs = require('fs'),
	OAuth = require('oauth'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Twilio = require('./twilio-api'),
	moment = require('moment'),
	env = process.env.NODE_ENV || 'production',
	five = require("johnny-five"),
	config = require('../config')[env];

var oauth = new OAuth.OAuth(
	'https://api.fitbit.com/oauth/request_token',
	'https://api.fitbit.com/oauth/access_token',
	config.fitbitClientKey,
	config.fitbitClientSecret,
	'1.0',
	null,
	'HMAC-SHA1'
);

function updateUserSteps(encodedId, callback) {
	console.log("updateUserSteps for", encodedId);

	User.findOne(
		{
			'encodedId': encodedId
		},
		function(err, user) {
			if (err) {
				console.error("Error finding user", err);
				callback(err);
				return;
			}

			// Get updated steps from Fitbit API
			oauth.get(
				'https://api.fitbit.com/1/user/-/activities/date/' + moment().utc().add('ms', user.timezoneOffset).format('YYYY-MM-DD') + '.json',
				user.accessToken,
				user.accessSecret,
				function (err, data, res) {
					if (err) {
						console.error("Error fetching activity data. ", err);
						callback(err);
						return;
					}

					data = JSON.parse(data);
					//console.log("Fitbit Get Activities", data);

					// Update (and return) the user
					User.findOneAndUpdate(
						{
							encodedId: user.encodedId
						},
						{
							activeMinutes: data.summary.fairlyActiveMinutes + data.summary.veryActiveMinutes,
							stepsToday: data.summary.steps,
							stepsGoal: data.goals.steps
						},
						null,
						function(err, user) {
							if (err) {
								console.error("Error updating user activity.", err);
							}
							callback(err, user);
						}
					);
				}
			);
		}
	);
};

// function updateUserSleep(encodedId, callback) {
// 	console.log("updateUserSleep for", encodedId);

// 	User.findOne(
// 		{
// 			'encodedId': encodedId
// 		},
// 		function(err, user) {
// 			if (err) {
// 				console.error("Error finding user", err);
// 				callback(err);
// 				return;
// 			}

// 			// Get updated steps from Fitbit API
// 			oauth.get(
// 				'https://api.fitbit.com/1/user/-/sleep/date/' + moment().utc().add('ms', user.timezoneOffset).format('YYYY-MM-DD') + '.json',
// 				user.accessToken,
// 				user.accessSecret,
// 				function (err, data, res) {
// 					if (err) {
// 						console.error("Error fetching sleep data. ", err);
// 						callback(err);
// 						return;
// 					}

// 					data = JSON.parse(data);
// 					console.log("Fitbit Get Sleep", data.sleep[data.sleep.length-1]);

// 					// Update (and return) the user
// 					User.findOneAndUpdate(
// 						{
// 							encodedId: user.encodedId
// 						},
// 						{
// 							isAsleep: data.sleep[data.sleep.length-1].minuteData.value,
// 							totalSleepRecords: data.summary.totalSleepRecords
// 						},
// 						null,
// 						function(err, user) {
// 							if (err) {
// 								console.error("Error updating user sleep activity.", err);
// 							}
// 							callback(err, user);
// 						}
// 					);
// 				}
// 			);
// 		}
// 	);
// };

// function totalSleepRecordsCallback(err, user) {
// 	if (err) {
// 		console.error('totalSleepRecordsCallback error:', err);
// 		return;
// 	}

// 	var smsBody = '';

// 	if (user.totalSleepRecords) {
// 		smsBody = 'You have slept ' + user.totalSleepRecords + ' times today.';


// 		// Turn off the led pulse loop after X seconds (shown in ms)
// 		var led = five.Led(13);
// 		led.strobe(1000);

// 		setTimeout(function() {
// 			led.stop().off();
// 		}, 1000 * user.totalSleepRecords);

// 	} else {
// 		smsBody = 'You have not slept at all today.';
// 	}

// 	//console.log("Twilio.sendSms", user.phoneNumber, smsBody);
// 	//Twilio.sendSms(user.phoneNumber, smsBody);
// }

// function map(value, low1, high1, low2, high2) {
//     return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
// }

function motivateUserCallback(err, user) {
	if (err) {
		console.error('motivateUserCallback error:', err);
		return;
	}

	var led = new five.Led.RGB([3, 5, 6]);
	led.off();

	console.log('User activity minutes: ' + user.activeMinutes);

	if (user.activeMinutes > 0) {
		if (user.activeMinutes < 30) {
			led.color("#00ff00"); //green
			console.log("green");
		}
		else if(user.activeMinutes > 30 && user.activeMinutes < 60) {
			led.color("#ffff00"); //yellow
			console.log("yellow");
		}
		else if(user.activeMinutes > 60) {
			led.color("#ff0000"); //red
			console.log("red");
		}
	}

	//led.on();
	// var smsBody = '';

	// if (user.stepsToday > user.stepsGoal) {
	// 	smsBody = 'Overachiever! You are ' + (user.stepsToday - user.stepsGoal) + ' over your daily goal of ' + user.stepsGoal + ' steps!';
	// } else {
	// 	var stepsRemaining = user.stepsGoal - user.stepsToday;

	// 	smsBody = 'Keep it up! ' + stepsRemaining + ' to go today.';
	// }


	//console.log("Twilio.sendSms", user.phoneNumber, smsBody);
	//Twilio.sendSms(user.phoneNumber, smsBody);
}

function notificationsReceived(req, res) {
	// Immediately send HTTP 204 No Content
	res.send(204);

	// TODO: Verify req.headers['x-fitbit-signature'] to ensure it's Fitbit

	fs.readFile(req.files.updates.path, {encoding: 'utf8'}, function (err, data) {
		if (err) console.error(err);
		data = JSON.parse(data);

		// [
		// 	 {
		// 		collectionType: 'activities',
		// 		date: '2013-10-21',
		// 		ownerId: '23RJ9B',
		// 		ownerType: 'user',
		// 		subscriptionId: '23RJ9B-all'
		// 	}
		// ]

		for (var i = 0; i < data.length; i++) {
			//console.log(data[i]);
			updateUserSteps(data[i].ownerId, motivateUserCallback);
			//updateUserSleep(data[i].ownerId, totalSleepRecordsCallback);
		}
	});
};

module.exports.notificationsReceived = notificationsReceived;

module.exports.updateUserSteps = updateUserSteps;