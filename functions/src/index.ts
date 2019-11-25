// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as functions from 'firebase-functions';

// The Firebase Admin SDK to access the Firebase Realtime Database.
import * as admin from 'firebase-admin';
admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

export const addMessage = functions.https.onRequest(async (req, res) => {
    // query param
    const msg = req.query.msg;
    // push message to uri
    const snapshot = await admin.database().ref("/messages").push({ original: msg });
    res.redirect(303, snapshot.ref.toString());
});

export const fizzbuzz = functions.https.onRequest((request, response) => {
    // without type
    let fb = ""
    for (let i = 1; i <= 100; i++) {
        if (i % 3 == 0 && i % 5 == 0) {
            fb += "FizzBuzz";
        } else if (i % 3 == 0) {
            fb += "Fizz";
        } else if (i % 5 == 0) {
            fb += "Buzz";
        } else {
            fb += i
        }
        fb += " ";
    }
    response.send(fb);

    // use type
    
});