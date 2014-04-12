var fs = require('fs'),
	OAuth = require('oauth'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Twilio = require('./twilio-api'),
	moment = require('moment'),
	env = process.env.NODE_ENV || 'production',
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
					console.log("Fitbit Get Activities", data);

					// Update (and return) the user
					User.findOneAndUpdate(
						{
							encodedId: user.encodedId
						},
						{
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

function updateUserSleep(encodedId, callback) {
	console.log("updateUserSleep for", encodedId);

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
				'https://api.fitbit.com/1/user/-/sleep/date/' + moment().utc().add('ms', user.timezoneOffset).format('YYYY-MM-DD') + '.json',
				user.accessToken,
				user.accessSecret,
				function (err, data, res) {
					if (err) {
						console.error("Error fetching sleep data. ", err);
						callback(err);
						return;
					}

					data = JSON.parse(data);
					console.log("Fitbit Get Sleep", data);

					// Update (and return) the user
					User.findOneAndUpdate(
						{
							encodedId: user.encodedId
						},
						{
							totalSleepRecords: data.summary.totalSleepRecords
						},
						null,
						function(err, user) {
							if (err) {
								console.error("Error updating user sleep activity.", err);
							}
							callback(err, user);
						}
					);
				}
			);
		}
	);
};

function totalSleepRecordsCallback(err, user) {
	if (err) {
		console.error('totalSleepRecordsCallback error:', err);
		return;
	}

	var smsBody = '';

	if (user.totalSleepRecords) {
		smsBody = 'You have slept ' + user.totalSleepRecords + ' number of times today.';
	} else {
		smsBody = 'You have not slept at all today.';
	}

	// console.log("Twilio.sendSms", user.phoneNumber, smsBody);
	Twilio.sendSms(user.phoneNumber, smsBody);
}

function motivateUserCallback(err, user) {
	if (err) {
		console.error('motivateUserCallback error:', err);
		return;
	}

	var smsBody = '';

	if (user.stepsToday > user.stepsGoal) {
		smsBody = 'Overachiever! You are ' + (user.stepsToday - user.stepsGoal) + ' over your daily goal of ' + user.stepsGoal + ' steps!';
	} else {
		var stepsRemaining = user.stepsGoal - user.stepsToday;

		smsBody = 'Keep it up! ' + stepsRemaining + ' to go today.';
	}

	// console.log("Twilio.sendSms", user.phoneNumber, smsBody);
	Twilio.sendSms(user.phoneNumber, smsBody);
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
			console.log(data[i]);
			updateUserSteps(data[i].ownerId, motivateUserCallback);
			updateUserSleep(data[i].ownerId, totalSleepRecordsCallback);
		}
	});
};

module.exports.notificationsReceived = notificationsReceived;

module.exports.updateUserSteps = updateUserSteps;